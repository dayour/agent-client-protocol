#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const [scriptPath, ...scriptArgs] = process.argv.slice(2);

if (!scriptPath) {
  console.error("ERROR: expected a Python script path.");
  process.exit(1);
}

const candidates =
  process.platform === "win32"
    ? [
        { command: "py", prefixArgs: ["-3"] },
        { command: "python3", prefixArgs: [] },
        { command: "python", prefixArgs: [] },
      ]
    : [
        { command: "python3", prefixArgs: [] },
        { command: "python", prefixArgs: [] },
      ];

function canRun(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "ignore",
  });

  return !result.error && result.status === 0;
}

const interpreter = candidates.find(({ command, prefixArgs }) =>
  canRun(command, [...prefixArgs, "--version"]),
);

if (!interpreter) {
  console.error(
    "ERROR: no compatible Python interpreter was found. Tried py -3, python3, and python.",
  );
  process.exit(1);
}

const result = spawnSync(
  interpreter.command,
  [
    ...interpreter.prefixArgs,
    path.resolve(repoRoot, scriptPath),
    ...scriptArgs,
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
