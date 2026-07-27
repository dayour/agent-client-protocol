#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

function canRun(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "ignore",
  });

  return !result.error && result.status === 0;
}

if (!canRun("typos", ["--version"])) {
  console.error("Error: typos is not installed.");
  console.error("Please install it using one of the following methods:");
  console.error("");
  console.error("  Using Cargo:");
  console.error("    cargo install typos-cli");
  console.error("");
  console.error(
    "For more installation options, see: https://github.com/crate-ci/typos",
  );
  process.exit(1);
}

const args = [
  "--config",
  path.join(repoRoot, "typos.toml"),
  ...process.argv.slice(2),
];
const result = spawnSync("typos", args, {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
