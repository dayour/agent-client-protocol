#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const packageJsonPath = path.join(repoRoot, "package.json");
const packageLockPath = path.join(repoRoot, "package-lock.json");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function resolvePinnedPrettierSpec() {
  const packageJson = readJson(packageJsonPath);
  const declaredRange = packageJson.devDependencies?.prettier;

  if (!declaredRange) {
    fail("ERROR: package.json does not declare prettier in devDependencies.");
  }

  if (existsSync(packageLockPath)) {
    const packageLock = readJson(packageLockPath);
    const lockedVersion =
      packageLock.packages?.["node_modules/prettier"]?.version;

    if (lockedVersion) {
      return lockedVersion;
    }
  }

  return declaredRange;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

const localPrettierPackageJsonPath = path.join(
  repoRoot,
  "node_modules",
  "prettier",
  "package.json",
);

if (existsSync(localPrettierPackageJsonPath)) {
  const localPrettierPackage = readJson(localPrettierPackageJsonPath);
  const localBin =
    typeof localPrettierPackage.bin === "string"
      ? localPrettierPackage.bin
      : localPrettierPackage.bin?.prettier;

  if (!localBin) {
    fail(
      "ERROR: node_modules/prettier/package.json does not declare a prettier binary.",
    );
  }

  run(process.execPath, [
    path.join(repoRoot, "node_modules", "prettier", localBin),
    ...process.argv.slice(2),
  ]);
}

const pinnedSpec = resolvePinnedPrettierSpec();
console.warn(
  `WARNING: local prettier install not found; using npm exec with pinned prettier@${pinnedSpec}.`,
);
run(process.platform === "win32" ? "npm.cmd" : "npm", [
  "exec",
  "--yes",
  `--package=prettier@${pinnedSpec}`,
  "--",
  "prettier",
  ...process.argv.slice(2),
]);
