# Schema wire-compatibility goldens

These files are committed snapshots of the structural _wire surface_ of each ACP
JSON Schema. They are consumed by
`agent-client-protocol-schema/tests/schema_wire_compat.rs`, which reads the
committed `schema/**/*.json` as the source of truth, reduces each schema to a
canonical surface, and asserts that surface is still backward compatible with
the golden recorded here.

## What a golden contains

For every definition in a schema's `$defs`, the golden records only the aspects
that affect wire compatibility, with keys sorted for determinism:

- `fields`: each object property with its structural type signature and a
  `required` flag.
- `variants`: the members of a `oneOf`/`anyOf` union, including string-enum
  `const` values and discriminated-union variants.
- `enum`, `const`, `types`, `items`: scalar and enum shape.
- `method`, `side`: the JSON-RPC method binding and the client/agent side.
- `additionalProperties`: whether the object accepts unknown keys.

Descriptions, titles, `$schema`, and key ordering are intentionally excluded, so
reformatting or reordering the schema never changes a golden and never fails the
test.

## Files and stability policy

| Golden             | Schema source                    | Policy |
| ------------------ | -------------------------------- | ------ |
| `v1_stable.json`   | `schema/v1/schema.json`          | STABLE |
| `v1_unstable.json` | `schema/v1/schema.unstable.json` | DRAFT  |
| `v2_draft.json`    | `schema/v2/schema.json`          | DRAFT  |
| `v2_unstable.json` | `schema/v2/schema.unstable.json` | DRAFT  |

- STABLE (`v1_stable.json`) is the published wire format. Any breaking change is
  a hard error, and the bless path refuses to weaken this golden. The only way
  to make a STABLE failure pass is to revert the breaking change.
- DRAFT surfaces permit breaking changes, but never silently: they fail loudly
  and require an explicit, env-gated golden update so the break appears as a
  reviewable diff.

## Breaking vs additive

The test PASSES on additive changes and FAILS on breaking ones:

- Additive (PASS, no golden update needed): a new optional field, a new enum or
  union variant, a new definition, loosening a required field to optional,
  opening `additionalProperties`.
- Breaking (FAIL): removing a field, removing or renaming a variant or enum
  value, changing a field's type signature, adding a new required field,
  promoting an optional field to required, removing a definition, changing a
  method binding or side, or closing `additionalProperties`.

## Updating the goldens (intentional, and only intentional)

Goldens are only ever written when the environment variable
`ACP_BLESS_SCHEMA_GOLDEN` is set. A normal `cargo test` never writes them; in
verify mode the test only reads.

To intentionally re-bless after a deliberate schema change:

```pwsh
$env:ACP_BLESS_SCHEMA_GOLDEN = '1'
cargo test -p agent-client-protocol-schema --test schema_wire_compat
Remove-Item Env:\ACP_BLESS_SCHEMA_GOLDEN
npm run format
```

The bless step writes plain `serde_json` pretty output; the trailing
`npm run format` normalizes the files to the repository's Prettier style so the
`format` and generated-artifact CI gates stay green. Then review and commit the
golden diff.

### What stops an accidental update

1. Writing requires the exact `ACP_BLESS_SCHEMA_GOLDEN` environment variable.
   Ordinary test runs, `--all-features` runs, and CI all run in verify mode.
2. Even in bless mode, a STABLE surface refuses to record a breaking change: the
   bless run panics and points you at the offending definitions. You cannot
   erase a v1 wire break by re-blessing.
3. The golden is a plain, sorted JSON file, so any change shows up as a small,
   reviewable diff in the pull request. A break can never land without a
   reviewer seeing the golden move.
