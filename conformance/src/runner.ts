import fs from "node:fs/promises";
import path from "node:path";

import { conformanceCases } from "./cases.js";
import { openConnection, prepareTarget } from "./driver.js";
import type {
  CaseResult,
  RunSummary,
  TargetSpec,
  TransportKind,
} from "./types.js";
import { isoNow, packageRoot } from "./utils.js";

export interface RunOptions {
  reportPath?: string;
  expectedFail?: boolean;
}

export async function runSuite(
  target: TargetSpec,
  options: RunOptions = {},
): Promise<RunSummary> {
  const startedAt = isoNow();
  const results: CaseResult[] = [];
  let preparedTarget: TargetSpec | undefined;
  let requestedVersions = [...target.requestedVersions];
  let actualVersions: number[] = [];
  let aborted = false;
  let runFailure: string | undefined;

  try {
    preparedTarget = await prepareTarget(target);
    requestedVersions = [...preparedTarget.requestedVersions];
    actualVersions = [...preparedTarget.requestedVersions];

    console.log(`ACP Conformance Suite`);
    console.log(`Target: ${preparedTarget.name}`);
    console.log(`Driver: ${preparedTarget.driver}`);
    console.log(
      `Requested versions: ${preparedTarget.requestedVersions.join(", ")}`,
    );
    console.log("");

    for (const version of preparedTarget.requestedVersions) {
      console.log(`[v${version}] Starting cases`);
      for (const testCase of conformanceCases.filter((candidate) =>
        candidate.versions.includes(version),
      )) {
        if (
          testCase.driverSupport &&
          !testCase.driverSupport.includes(preparedTarget.driver)
        ) {
          results.push({
            id: testCase.id,
            title: testCase.title,
            protocolVersion: version,
            status: "skipped",
            durationMs: 0,
            notes: [
              `driver ${preparedTarget.driver} is not supported by this case`,
            ],
          });
          console.log(
            `SKIP [v${version}] ${testCase.id} - driver ${preparedTarget.driver} not supported`,
          );
          continue;
        }

        const started = Date.now();
        let connection;
        try {
          connection = await openConnection(preparedTarget, version);
          await testCase.run(connection, { target: preparedTarget, version });
          await connection.settle();
          connection.assertHealthy();
          const durationMs = Date.now() - started;
          results.push({
            id: testCase.id,
            title: testCase.title,
            protocolVersion: version,
            status: "passed",
            durationMs,
            notes: [],
          });
          console.log(`PASS [v${version}] ${testCase.id} (${durationMs}ms)`);
        } catch (error) {
          const durationMs = Date.now() - started;
          const failure = error as Error & { details?: unknown };
          results.push({
            id: testCase.id,
            title: testCase.title,
            protocolVersion: version,
            status: "failed",
            durationMs,
            notes: [],
            failure: {
              message: failure.message,
              details: failure.details,
            },
          });
          console.log(`FAIL [v${version}] ${testCase.id} (${durationMs}ms)`);
          console.log(`  ${failure.message}`);
        } finally {
          await connection?.close();
        }
      }
      console.log("");
    }
  } catch (error) {
    aborted = true;
    const failure = error as Error;
    runFailure = failure.message;
    console.log("FATAL");
    console.log(`  ${runFailure}`);
  }

  const finishedAt = isoNow();
  const summary: RunSummary = {
    target: preparedTarget?.name ?? target.name,
    driver: preparedTarget?.driver ?? target.driver,
    requestedVersions,
    actualVersions,
    startedAt,
    finishedAt,
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    aborted,
    runFailure,
    cases: results,
  };

  if (options.reportPath) {
    const resolvedReportPath = path.isAbsolute(options.reportPath)
      ? options.reportPath
      : path.resolve(packageRoot, options.reportPath);
    try {
      await fs.mkdir(path.dirname(resolvedReportPath), { recursive: true });
      await fs.writeFile(resolvedReportPath, JSON.stringify(summary, null, 2));
      summary.reportPath = resolvedReportPath;
    } catch (error) {
      const failure = error as Error;
      summary.aborted = true;
      summary.runFailure =
        summary.runFailure ??
        `Failed to write report ${resolvedReportPath}: ${failure.message}`;
    }
  }
  printSummary(summary);
  if (summary.reportPath) {
    console.log(`JSON report: ${summary.reportPath}`);
  }

  return summary;
}

function printSummary(summary: RunSummary): void {
  console.log("Summary");
  console.log(`  Passed: ${summary.passed}`);
  console.log(`  Failed: ${summary.failed}`);
  console.log(`  Skipped: ${summary.skipped}`);
  console.log(`  Aborted: ${summary.aborted ? "yes" : "no"}`);
  console.log(`  Started: ${summary.startedAt}`);
  console.log(`  Finished: ${summary.finishedAt}`);
  if (summary.runFailure) {
    console.log(`  Run failure: ${summary.runFailure}`);
  }
}
