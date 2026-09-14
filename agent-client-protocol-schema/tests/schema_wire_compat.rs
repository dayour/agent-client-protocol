//! Wire-compatibility regression tests for the committed ACP JSON Schemas.
//!
//! # Why this exists
//!
//! CI already proves that the committed schema artifacts are *fresh*: it runs
//! `npm run generate` and then `git diff --exit-code`. That proves the files on
//! disk match what the generator emits right now. It proves nothing about
//! whether the wire format stayed *compatible* with already-deployed peers. If
//! a field flips from required to optional, an enum variant is renamed, or a
//! discriminator changes, the generator happily emits new artifacts, the diff
//! is clean after regeneration, and CI stays green while the protocol silently
//! breaks for every deployed implementation.
//!
//! These tests close that gap. They read the committed `schema/**/*.json` as
//! the source of truth, reduce each schema to a canonical structural *surface*,
//! and compare that surface against a committed golden snapshot. The comparison
//! is structural, not textual: reordering keys or reformatting a file produces
//! an identical surface and does not fail. Removing a field, narrowing a type,
//! renaming a variant, or adding a new required field changes the surface and
//! is classified as breaking.
//!
//! # Compatibility model
//!
//! The golden is a *compatibility floor*. A schema is compatible when its
//! current surface is a backward-compatible superset of the golden:
//!
//! - Additive changes (a new optional field, a new enum variant, a new
//!   definition) keep the floor satisfied and PASS with no golden update. This
//!   is what stops legitimate additive evolution from forcing a golden churn
//!   that reviewers would start rubber-stamping.
//! - Breaking changes (a removed field, a narrowed or retyped field, a new
//!   required field, a removed or renamed variant, a changed discriminator or
//!   method binding) violate the floor and FAIL.
//!
//! # Stability policy
//!
//! - `schema/v1/schema.json` is the published, stable wire surface. It is
//!   treated as [`Stability::Stable`]: any breaking change is an error, and the
//!   bless path refuses to weaken its golden. To make such a failure pass you
//!   must revert the breaking change, not re-bless.
//! - `schema/v1/schema.unstable.json`, `schema/v2/schema.json` and
//!   `schema/v2/schema.unstable.json` are preview/draft surfaces. They are
//!   treated as [`Stability::Draft`]: breaking changes are permitted but never
//!   silent. They FAIL loudly and require an explicit, env-gated golden update.
//!
//! # Updating the goldens
//!
//! Goldens are only ever written when `ACP_BLESS_SCHEMA_GOLDEN=1` is set. A
//! plain `cargo test` never writes. See `tests/goldens/README.md` for the exact
//! procedure and the accident-prevention guarantees.

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use serde_json::{Map, Value};

/// Environment variable that switches the tests from verify mode to bless mode.
const BLESS_ENV: &str = "ACP_BLESS_SCHEMA_GOLDEN";

/// Whether a surface is a frozen stable wire or an evolving draft.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Stability {
    /// Published wire format. Breaking changes are hard errors and cannot be
    /// blessed away.
    Stable,
    /// Preview or draft surface. Breaking changes are permitted but must be
    /// surfaced loudly and blessed explicitly.
    Draft,
}

impl Stability {
    fn label(self) -> &'static str {
        match self {
            Stability::Stable => "STABLE",
            Stability::Draft => "DRAFT",
        }
    }
}

/// One schema file tracked for wire compatibility.
struct SurfaceSpec {
    /// Human-facing name used in messages and as the golden file stem.
    name: &'static str,
    /// Schema file path relative to the workspace `schema/` directory.
    schema_rel: &'static str,
    /// Stability policy applied to breaking changes on this surface.
    stability: Stability,
}

/// A single classified difference between the golden floor and the current
/// surface.
struct Diff {
    /// `true` when the difference breaks wire compatibility.
    breaking: bool,
    /// Human-readable description including the definition and field involved.
    detail: String,
}

/// Absolute path to the workspace `schema` directory.
fn schema_dir() -> PathBuf {
    // CARGO_MANIFEST_DIR is the `agent-client-protocol-schema` crate directory.
    // The schema files live in the sibling `schema/` tree.
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("crate directory has a parent")
        .join("schema")
}

/// Absolute path to the committed golden for the given surface name.
fn golden_path(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("goldens")
        .join(format!("{name}.json"))
}

/// Reads and parses a JSON schema file, failing loudly on any I/O or parse
/// error so a missing or corrupt source can never masquerade as a pass.
fn read_json(path: &Path) -> Value {
    let text = std::fs::read_to_string(path)
        .unwrap_or_else(|err| panic!("failed to read {}: {err}", path.display()));
    serde_json::from_str(&text)
        .unwrap_or_else(|err| panic!("failed to parse {} as JSON: {err}", path.display()))
}

/// Strips a `#/$defs/Name` reference down to `Name`.
fn strip_ref(reference: &str) -> &str {
    reference.rsplit('/').next().unwrap_or(reference)
}

/// Canonical, order-independent string for a scalar JSON literal used inside
/// `const` and `enum` values.
fn literal_sig(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(b) => format!("bool:{b}"),
        Value::Number(n) => format!("num:{n}"),
        Value::String(s) => format!("str:{s}"),
        // Composite literals are rare inside const/enum; fall back to a stable
        // serialization. serde_json here has `preserve_order`, but const/enum
        // literals are values, not schema objects, so ordering is intrinsic.
        other => format!("json:{other}"),
    }
}

/// Normalizes a schema `type` keyword (string or array) into a sorted,
/// pipe-joined signature such as `object|null`.
fn type_keyword_sig(type_value: &Value) -> String {
    match type_value {
        Value::String(s) => s.clone(),
        Value::Array(items) => {
            let mut parts: Vec<String> = items
                .iter()
                .filter_map(|item| item.as_str().map(str::to_string))
                .collect();
            parts.sort();
            parts.join("|")
        }
        other => format!("type:{other}"),
    }
}

/// Produces a deterministic structural signature for an arbitrary schema node.
///
/// The signature captures every structurally significant aspect (refs, consts,
/// enums, unions, object shape, scalar type, array item type) while ignoring
/// annotations such as `description` and `title` and ignoring key order. Two
/// nodes with the same signature are wire-equivalent; a signature change is a
/// type change.
fn type_signature(node: &Value) -> String {
    let Some(object) = node.as_object() else {
        return format!("literal:{}", literal_sig(node));
    };

    let mut parts: Vec<String> = Vec::new();

    if let Some(reference) = object.get("$ref").and_then(Value::as_str) {
        parts.push(format!("ref:{}", strip_ref(reference)));
    }
    if let Some(constant) = object.get("const") {
        parts.push(format!("const:{}", literal_sig(constant)));
    }
    if let Some(values) = object.get("enum").and_then(Value::as_array) {
        let mut variants: Vec<String> = values.iter().map(literal_sig).collect();
        variants.sort();
        parts.push(format!("enum:[{}]", variants.join(",")));
    }
    for keyword in ["oneOf", "anyOf", "allOf"] {
        if let Some(members) = object.get(keyword).and_then(Value::as_array) {
            let mut signatures: Vec<String> = members.iter().map(type_signature).collect();
            signatures.sort();
            parts.push(format!("{keyword}:[{}]", signatures.join(",")));
        }
    }
    if let Some(properties) = object.get("properties").and_then(Value::as_object) {
        parts.push(object_shape_signature(properties, object.get("required")));
    }

    // Only fold in the bare `type` keyword when no richer structural keyword is
    // present, so that `{type:object, properties:{..}}` and a hand-written
    // reordering both reduce to the same object signature.
    if parts.is_empty()
        && let Some(type_value) = object.get("type")
    {
        let keyword = type_keyword_sig(type_value);
        if keyword.split('|').any(|part| part == "array") {
            if let Some(items) = object.get("items") {
                parts.push(format!("array<{}>", type_signature(items)));
            } else {
                parts.push(format!("type:{keyword}"));
            }
        } else {
            parts.push(format!("type:{keyword}"));
        }
    }

    if parts.is_empty() {
        return "any".to_string();
    }
    parts.sort();
    parts.join("&")
}

/// Signature for an inline object's property shape, including per-field required
/// flags, so that a nested field removal or a nested required promotion is
/// reflected as a type change.
fn object_shape_signature(properties: &Map<String, Value>, required: Option<&Value>) -> String {
    let required_set = required_names(required);
    let mut fields: Vec<String> = properties
        .iter()
        .map(|(name, schema)| {
            let flag = if required_set.contains(name.as_str()) {
                "req"
            } else {
                "opt"
            };
            format!("{name}:{flag}:{}", type_signature(schema))
        })
        .collect();
    fields.sort();
    format!("obj{{{}}}", fields.join(","))
}

/// Collects the set of required property names from a `required` array.
fn required_names(required: Option<&Value>) -> BTreeSet<String> {
    required
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|entry| entry.as_str().map(str::to_string))
        .collect()
}

/// Reduces one schema definition to its canonical surface object.
///
/// The returned value contains only presence-based, structurally significant
/// aspects with sorted keys, so it round-trips deterministically to a golden
/// file.
fn definition_surface(definition: &Value) -> Value {
    let mut surface = Map::new();
    let Some(object) = definition.as_object() else {
        surface.insert("kind".to_string(), Value::from("opaque"));
        surface.insert("literal".to_string(), Value::from(literal_sig(definition)));
        return Value::Object(surface);
    };

    if let Some(method) = object.get("x-method").and_then(Value::as_str) {
        surface.insert("method".to_string(), Value::from(method));
    }
    if let Some(side) = object.get("x-side").and_then(Value::as_str) {
        surface.insert("side".to_string(), Value::from(side));
    }

    if let Some(properties) = object.get("properties").and_then(Value::as_object) {
        let required_set = required_names(object.get("required"));
        let mut fields = Map::new();
        let mut names: Vec<&String> = properties.keys().collect();
        names.sort();
        for name in names {
            let schema = &properties[name];
            let mut field = Map::new();
            field.insert("type".to_string(), Value::from(type_signature(schema)));
            field.insert(
                "required".to_string(),
                Value::from(required_set.contains(name.as_str())),
            );
            fields.insert(name.clone(), Value::Object(field));
        }
        surface.insert("fields".to_string(), Value::Object(fields));
        surface.insert(
            "additionalProperties".to_string(),
            Value::from(object.get("additionalProperties") == Some(&Value::Bool(true))),
        );
    }

    for keyword in ["oneOf", "anyOf"] {
        if let Some(members) = object.get(keyword).and_then(Value::as_array) {
            let mut variants: Vec<String> = members.iter().map(type_signature).collect();
            variants.sort();
            surface.insert("unionKind".to_string(), Value::from(keyword));
            surface.insert(
                "variants".to_string(),
                Value::from(
                    variants
                        .into_iter()
                        .map(Value::from)
                        .collect::<Vec<Value>>(),
                ),
            );
        }
    }

    if let Some(values) = object.get("enum").and_then(Value::as_array) {
        let mut variants: Vec<String> = values.iter().map(literal_sig).collect();
        variants.sort();
        surface.insert(
            "enum".to_string(),
            Value::from(
                variants
                    .into_iter()
                    .map(Value::from)
                    .collect::<Vec<Value>>(),
            ),
        );
    }
    if let Some(constant) = object.get("const") {
        surface.insert("const".to_string(), Value::from(literal_sig(constant)));
    }

    // Record the scalar/array type only when there is no richer object or union
    // shape, mirroring `type_signature` so the surface stays quiet for plain
    // objects (whose `type` is always `object`).
    let has_shape = surface.contains_key("fields") || surface.contains_key("variants");
    if !has_shape && let Some(type_value) = object.get("type") {
        surface.insert(
            "types".to_string(),
            Value::from(type_keyword_sig(type_value)),
        );
        if let Some(items) = object.get("items") {
            surface.insert("items".to_string(), Value::from(type_signature(items)));
        }
    }

    Value::Object(surface)
}

/// Builds the full surface map (`{ DefName: surface }`) for a schema document,
/// reading `$defs` as the source of truth.
fn build_surface(schema: &Value) -> Map<String, Value> {
    let defs = schema
        .get("$defs")
        .and_then(Value::as_object)
        .unwrap_or_else(|| panic!("schema has no `$defs` object"));
    let mut surface = Map::new();
    let mut names: Vec<&String> = defs.keys().collect();
    names.sort();
    for name in names {
        surface.insert(name.clone(), definition_surface(&defs[name]));
    }
    surface
}

/// Returns the object body of a definition surface, or an empty map when the
/// value is not an object (defensive; blessed surfaces are always objects).
fn as_object(value: &Value) -> Map<String, Value> {
    value.as_object().cloned().unwrap_or_default()
}

/// Returns the sorted `variants` list of a surface, or an empty vec.
fn surface_variants(surface: &Value) -> Vec<String> {
    surface
        .get("variants")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default()
}

/// Returns the sorted `enum` list of a surface, or an empty vec.
fn surface_enum(surface: &Value) -> Vec<String> {
    surface
        .get("enum")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default()
}

/// Whether a surface field is marked required.
fn field_required(field: &Value) -> bool {
    field.get("required") == Some(&Value::Bool(true))
}

/// The type signature string of a surface field.
fn field_type(field: &Value) -> String {
    field
        .get("type")
        .and_then(Value::as_str)
        .unwrap_or("any")
        .to_string()
}

/// Compares a golden floor surface against the current surface and classifies
/// every difference as breaking or additive.
fn classify(golden: &Map<String, Value>, current: &Map<String, Value>) -> Vec<Diff> {
    let mut diffs: Vec<Diff> = Vec::new();

    for (def_name, golden_def) in golden {
        let Some(current_def) = current.get(def_name) else {
            diffs.push(Diff {
                breaking: true,
                detail: format!("definition `{def_name}` was removed"),
            });
            continue;
        };
        classify_definition(def_name, golden_def, current_def, &mut diffs);
    }

    for def_name in current.keys() {
        if !golden.contains_key(def_name) {
            diffs.push(Diff {
                breaking: false,
                detail: format!("definition `{def_name}` was added"),
            });
        }
    }

    diffs
}

/// Classifies the differences within a single definition.
fn classify_definition(
    def_name: &str,
    golden_def: &Value,
    current_def: &Value,
    diffs: &mut Vec<Diff>,
) {
    let golden_map = as_object(golden_def);
    let current_map = as_object(current_def);

    for aspect in ["method", "side", "const", "types", "items", "unionKind"] {
        if let Some(golden_value) = golden_map.get(aspect) {
            match current_map.get(aspect) {
                None => diffs.push(Diff {
                    breaking: true,
                    detail: format!("`{def_name}` lost `{aspect}` ({golden_value})"),
                }),
                Some(current_value) if current_value != golden_value => diffs.push(Diff {
                    breaking: true,
                    detail: format!(
                        "`{def_name}` `{aspect}` changed from {golden_value} to {current_value}"
                    ),
                }),
                Some(_) => {}
            }
        }
    }

    classify_fields(def_name, &golden_map, &current_map, diffs);
    classify_variants(def_name, golden_def, current_def, diffs);
    classify_enum(def_name, golden_def, current_def, diffs);
    classify_additional_properties(def_name, &golden_map, &current_map, diffs);
}

/// Classifies object field differences.
fn classify_fields(
    def_name: &str,
    golden_map: &Map<String, Value>,
    current_map: &Map<String, Value>,
    diffs: &mut Vec<Diff>,
) {
    let golden_fields = golden_map
        .get("fields")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let current_fields = current_map
        .get("fields")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();

    for (field_name, golden_field) in &golden_fields {
        match current_fields.get(field_name) {
            None => diffs.push(Diff {
                breaking: true,
                detail: format!("`{def_name}.{field_name}` was removed"),
            }),
            Some(current_field) => {
                if field_type(golden_field) != field_type(current_field) {
                    diffs.push(Diff {
                        breaking: true,
                        detail: format!(
                            "`{def_name}.{field_name}` type changed from {} to {}",
                            field_type(golden_field),
                            field_type(current_field)
                        ),
                    });
                }
                if !field_required(golden_field) && field_required(current_field) {
                    diffs.push(Diff {
                        breaking: true,
                        detail: format!("`{def_name}.{field_name}` became required (was optional)"),
                    });
                }
            }
        }
    }

    for (field_name, current_field) in &current_fields {
        if !golden_fields.contains_key(field_name) {
            diffs.push(Diff {
                breaking: field_required(current_field),
                detail: if field_required(current_field) {
                    format!("`{def_name}.{field_name}` was added as a required field")
                } else {
                    format!("`{def_name}.{field_name}` was added as an optional field")
                },
            });
        }
    }
}

/// Classifies union variant differences (covers string enums modeled as
/// `oneOf`/`anyOf` of `const` members and discriminated unions).
fn classify_variants(
    def_name: &str,
    golden_def: &Value,
    current_def: &Value,
    diffs: &mut Vec<Diff>,
) {
    let golden_variants: BTreeSet<String> = surface_variants(golden_def).into_iter().collect();
    let current_variants: BTreeSet<String> = surface_variants(current_def).into_iter().collect();
    for variant in golden_variants.difference(&current_variants) {
        diffs.push(Diff {
            breaking: true,
            detail: format!("`{def_name}` variant `{variant}` was removed or renamed"),
        });
    }
    for variant in current_variants.difference(&golden_variants) {
        diffs.push(Diff {
            breaking: false,
            detail: format!("`{def_name}` variant `{variant}` was added"),
        });
    }
}

/// Classifies top-level `enum` array differences.
fn classify_enum(def_name: &str, golden_def: &Value, current_def: &Value, diffs: &mut Vec<Diff>) {
    let golden_values: BTreeSet<String> = surface_enum(golden_def).into_iter().collect();
    let current_values: BTreeSet<String> = surface_enum(current_def).into_iter().collect();
    for value in golden_values.difference(&current_values) {
        diffs.push(Diff {
            breaking: true,
            detail: format!("`{def_name}` enum value `{value}` was removed or renamed"),
        });
    }
    for value in current_values.difference(&golden_values) {
        diffs.push(Diff {
            breaking: false,
            detail: format!("`{def_name}` enum value `{value}` was added"),
        });
    }
}

/// Classifies `additionalProperties` tightening (open to closed is breaking).
fn classify_additional_properties(
    def_name: &str,
    golden_map: &Map<String, Value>,
    current_map: &Map<String, Value>,
    diffs: &mut Vec<Diff>,
) {
    let golden_open = golden_map.get("additionalProperties") == Some(&Value::Bool(true));
    let current_open = current_map.get("additionalProperties") == Some(&Value::Bool(true));
    if golden_open && !current_open && current_map.contains_key("fields") {
        diffs.push(Diff {
            breaking: true,
            detail: format!("`{def_name}` stopped accepting additional properties"),
        });
    }
}

/// Renders a bulleted list of diff details.
fn render(diffs: &[&Diff]) -> String {
    diffs
        .iter()
        .map(|diff| format!("  - {}", diff.detail))
        .collect::<Vec<_>>()
        .join("\n")
}

/// Runs verify or bless for one surface.
fn run_surface(spec: &SurfaceSpec) {
    let schema_path = schema_dir().join(spec.schema_rel);
    let schema = read_json(&schema_path);
    let current = build_surface(&schema);
    let golden_file = golden_path(spec.name);

    if std::env::var_os(BLESS_ENV).is_some() {
        bless_surface(spec, &current, &golden_file);
        return;
    }

    verify_surface(spec, &current, &golden_file);
}

/// Verify mode: compare current surface against the committed golden floor.
fn verify_surface(spec: &SurfaceSpec, current: &Map<String, Value>, golden_file: &Path) {
    assert!(
        golden_file.exists(),
        "golden for `{}` is missing at {}.\nCreate it with:\n  {BLESS_ENV}=1 cargo test -p \
         agent-client-protocol-schema --test schema_wire_compat",
        spec.name,
        golden_file.display()
    );

    let golden_value = read_json(golden_file);
    let golden = golden_value
        .as_object()
        .cloned()
        .unwrap_or_else(|| panic!("golden {} is not a JSON object", golden_file.display()));

    let diffs = classify(&golden, current);
    let breaking: Vec<&Diff> = diffs.iter().filter(|diff| diff.breaking).collect();

    assert!(
        breaking.is_empty(),
        "{} wire-compatibility break detected in `{}` ({}):\n{}\n\n{}",
        spec.stability.label(),
        spec.name,
        spec.schema_rel,
        render(&breaking),
        remediation(spec.stability),
    );
}

/// The remediation guidance printed on a breaking failure, tailored to the
/// stability policy.
fn remediation(stability: Stability) -> &'static str {
    match stability {
        Stability::Stable => {
            "This surface is the published, stable ACP v1 wire format. A breaking change here \
             breaks every deployed peer. Revert the change. Do NOT re-bless: the bless path \
             refuses to weaken a stable golden."
        }
        Stability::Draft => {
            "This surface is a draft/preview. Breaking changes are allowed but must be \
             intentional. If this change is deliberate, update the golden with:\n  \
             ACP_BLESS_SCHEMA_GOLDEN=1 cargo test -p agent-client-protocol-schema --test \
             schema_wire_compat\nThen commit the golden diff so reviewers see the break."
        }
    }
}

/// Bless mode: rewrite the golden. Stable surfaces refuse to record a break;
/// draft surfaces overwrite unconditionally.
fn bless_surface(spec: &SurfaceSpec, current: &Map<String, Value>, golden_file: &Path) {
    if spec.stability == Stability::Stable && golden_file.exists() {
        let golden_value = read_json(golden_file);
        if let Some(golden) = golden_value.as_object() {
            let diffs = classify(golden, current);
            let breaking: Vec<&Diff> = diffs.iter().filter(|diff| diff.breaking).collect();
            assert!(
                breaking.is_empty(),
                "refusing to bless STABLE surface `{}`: {} breaking change(s) vs the current \
                 floor. v1 is a published protocol; revert the change instead of blessing it:\n{}",
                spec.name,
                breaking.len(),
                render(&breaking),
            );
        }
    }

    let serialized =
        serde_json::to_string_pretty(&Value::Object(current.clone())).expect("surface serializes");
    std::fs::write(golden_file, format!("{serialized}\n"))
        .unwrap_or_else(|err| panic!("failed to write {}: {err}", golden_file.display()));
    eprintln!(
        "blessed {} golden ({}) -> {}",
        spec.stability.label(),
        spec.name,
        golden_file.display()
    );
}

const V1_STABLE: SurfaceSpec = SurfaceSpec {
    name: "v1_stable",
    schema_rel: "v1/schema.json",
    stability: Stability::Stable,
};

const V1_UNSTABLE: SurfaceSpec = SurfaceSpec {
    name: "v1_unstable",
    schema_rel: "v1/schema.unstable.json",
    stability: Stability::Draft,
};

const V2_DRAFT: SurfaceSpec = SurfaceSpec {
    name: "v2_draft",
    schema_rel: "v2/schema.json",
    stability: Stability::Draft,
};

const V2_UNSTABLE: SurfaceSpec = SurfaceSpec {
    name: "v2_unstable",
    schema_rel: "v2/schema.unstable.json",
    stability: Stability::Draft,
};

#[test]
fn v1_stable_wire_is_backward_compatible() {
    run_surface(&V1_STABLE);
}

#[test]
fn v1_unstable_surface_has_no_silent_breaks() {
    run_surface(&V1_UNSTABLE);
}

#[test]
fn v2_draft_surface_has_no_silent_breaks() {
    run_surface(&V2_DRAFT);
}

#[test]
fn v2_unstable_surface_has_no_silent_breaks() {
    run_surface(&V2_UNSTABLE);
}

/// Guards the classifier itself against silent rot. This is deliberately a
/// self-contained unit check on synthetic surfaces so that a regression in the
/// breaking/additive logic is caught even if the goldens happen to match.
#[test]
fn classifier_distinguishes_breaking_from_additive() {
    let golden: Map<String, Value> = serde_json::from_value(serde_json::json!({
        "Msg": {
            "fields": {
                "id": {"type": "type:string", "required": true},
                "note": {"type": "type:string", "required": false}
            },
            "additionalProperties": false
        },
        "Kind": {
            "unionKind": "oneOf",
            "variants": ["const:str:read", "const:str:write"]
        }
    }))
    .unwrap();

    // Identical surface: no diffs at all.
    assert!(classify(&golden, &golden).is_empty());

    // Additive: a new optional field and a new variant. Must not be breaking.
    let additive: Map<String, Value> = serde_json::from_value(serde_json::json!({
        "Msg": {
            "fields": {
                "id": {"type": "type:string", "required": true},
                "note": {"type": "type:string", "required": false},
                "extra": {"type": "type:string", "required": false}
            },
            "additionalProperties": false
        },
        "Kind": {
            "unionKind": "oneOf",
            "variants": ["const:str:read", "const:str:write", "const:str:delete"]
        }
    }))
    .unwrap();
    let additive_diffs = classify(&golden, &additive);
    assert!(
        !additive_diffs.is_empty(),
        "additive changes should be reported"
    );
    assert!(
        additive_diffs.iter().all(|diff| !diff.breaking),
        "additive changes must never be classified as breaking"
    );

    // Breaking cases: removed field, retyped field, new required field, renamed
    // variant. Each must be flagged breaking.
    let breaking_cases = [
        serde_json::json!({
            "Msg": {"fields": {"note": {"type": "type:string", "required": false}},
                    "additionalProperties": false},
            "Kind": {"unionKind": "oneOf", "variants": ["const:str:read", "const:str:write"]}
        }),
        serde_json::json!({
            "Msg": {"fields": {"id": {"type": "type:number", "required": true},
                               "note": {"type": "type:string", "required": false}},
                    "additionalProperties": false},
            "Kind": {"unionKind": "oneOf", "variants": ["const:str:read", "const:str:write"]}
        }),
        serde_json::json!({
            "Msg": {"fields": {"id": {"type": "type:string", "required": true},
                               "note": {"type": "type:string", "required": true}},
                    "additionalProperties": false},
            "Kind": {"unionKind": "oneOf", "variants": ["const:str:read", "const:str:write"]}
        }),
        serde_json::json!({
            "Msg": {"fields": {"id": {"type": "type:string", "required": true},
                               "note": {"type": "type:string", "required": false}},
                    "additionalProperties": false},
            "Kind": {"unionKind": "oneOf", "variants": ["const:str:read", "const:str:overwrite"]}
        }),
    ];
    for case in breaking_cases {
        let current: Map<String, Value> = serde_json::from_value(case).unwrap();
        let diffs = classify(&golden, &current);
        assert!(
            diffs.iter().any(|diff| diff.breaking),
            "expected a breaking diff, got none"
        );
    }
}
