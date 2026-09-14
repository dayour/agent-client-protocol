// Generates TypeScript declaration files (.d.ts) from the ACP JSON Schema
// artifacts produced by the Rust `schema-generator` binary.
//
// This runs inside `npm run generate`, immediately after the Rust generator
// emits `schema/**/schema*.json` and before `npm run format`. Because the
// declarations are derived from the freshly generated JSON Schema in the same
// command, the `.d.ts` types cannot drift from the schema: regenerating one
// regenerates the other. CI enforces this with `npm run generate` followed by
// `git diff --exit-code`.
//
// Output is intentionally NOT pre-formatted here. The repository pins Prettier
// to a specific version through the npm scripts; `npm run generate` ends by
// invoking `npm run format`, which normalizes these files with that pinned
// Prettier. Running a second, tool-bundled formatter would risk a version skew.

import { compile } from "json-schema-to-typescript";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Each JSON Schema input maps to exactly one declaration output. The input set
// mirrors the four cfg combinations the Rust generator emits (v1/v2 x
// stable/unstable), so both protocol versions are always covered.
const TARGETS = [
  { schema: "schema/v1/schema.json", dts: "typescript/v1/schema.d.ts" },
  {
    schema: "schema/v1/schema.unstable.json",
    dts: "typescript/v1/schema.unstable.d.ts",
  },
  { schema: "schema/v2/schema.json", dts: "typescript/v2/schema.d.ts" },
  {
    schema: "schema/v2/schema.unstable.json",
    dts: "typescript/v2/schema.unstable.d.ts",
  },
];

const BANNER = [
  "// Code generated from the ACP JSON Schema by typescript/generate-types.mjs.",
  "// DO NOT EDIT BY HAND. Run `npm run generate` to regenerate.",
  "// Source of truth: the sibling schema.json under schema/.",
].join("\n");

async function generateOne({ schema, dts }) {
  const schemaPath = join(repoRoot, schema);
  const outPath = join(repoRoot, dts);

  const raw = await readFile(schemaPath, "utf8");
  const parsed = JSON.parse(raw);

  // Deterministic settings only. No timestamps, no environment-derived values,
  // no bundled formatter. `declareExternallyReferenced` + `unreachableDefinitions`
  // ensure every `$defs` entry becomes a named, exported type even when it is
  // only reachable through a `$ref`, so downstream consumers can import the
  // individual message and payload types by name.
  const declaration = await compile(
    parsed,
    parsed.title ?? "AgentClientProtocol",
    {
      bannerComment: BANNER,
      additionalProperties: false,
      declareExternallyReferenced: true,
      unreachableDefinitions: true,
      format: false,
      enableConstEnums: false,
    },
  );

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, declaration, "utf8");
  return { dts, bytes: Buffer.byteLength(declaration, "utf8") };
}

async function main() {
  const results = [];
  for (const target of TARGETS) {
    results.push(await generateOne(target));
  }
  for (const { dts, bytes } of results) {
    console.log(`Generated ${dts} (${bytes} bytes)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
