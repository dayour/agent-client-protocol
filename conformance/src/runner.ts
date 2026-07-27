import fs from 'node:fs/promises';
import path from 'node:path';

import { conformanceCases } from './cases.js';
import { openConnection, prepareTarget } from './driver.js';
import type { CaseResult, RunSummary, TargetSpec, TransportKind } from './types.js';
import { isoNow, packageRoot } from './utils.js';

export interface RunOptions {
  reportPath?: string;
  expectedFail?: boolean;
}

export async function runSuite(target: TargetSpec, options: RunOptions = {}): Promise<RunSummary> {
  const preparedTarget = await prepareTarget(target);
  const startedAt = isoNow();
  const actualVersions = [...preparedTarget.requestedVersions];
  const results: CaseResult[] = [];

  console.log(`ACP Conformance Suite`);
  console.log(`Target: ${preparedTarget.name}`);
  console.log(`Driver: ${preparedTarget.driver}`);
  console.log(`Requested versions: ${preparedTarget.requestedVersions.join(', ')}`);
  console.log('');

  for (const version of preparedTarget.requestedVersions) {
    console.log(`[v${version}] Starting cases`);
    for (const testCase of conformanceCases.filter((candidate) => candidate.versions.includes(version))) {
      if (testCase.driverSupport && !testCase.driverSupport.includes(preparedTarget.driver)) {
        results.push({
          id: testCase.id,
          title: testCase.title,
          protocolVersion: version,
          status: 'skipped',
          durationMs: 0,
          notes: [`driver ${preparedTarget.driver} is not supported by this case`],
        });
        console.log(`SKIP [v${version}] ${testCase.id} - driver ${preparedTarget.driver} not supported`);
        continue;
      }

      const started = Date.now();
      const connection = await openConnection(preparedTarget, version);
      try {
        await testCase.run(connection, { target: preparedTarget, version });
        const durationMs = Date.now() - started;
        results.push({
          id: testCase.id,
          title: testCase.title,
          protocolVersion: version,
          status: 'passed',
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
          status: 'failed',
          durationMs,
          notes: [],
          failure: {
            message: failure.message,
            details: failure.details as never,
          },
        });
        console.log(`FAIL [v${version}] ${testCase.id} (${durationMs}ms)`);
        console.log(`  ${failure.message}`);
      } finally {
        await connection.close();
      }
    }
    console.log('');
  }

  const finishedAt = isoNow();
  const summary: RunSummary = {
    target: preparedTarget.name,
    driver: preparedTarget.driver,
    requestedVersions: preparedTarget.requestedVersions,
    actualVersions,
    startedAt,
    finishedAt,
    passed: results.filter((result) => result.status === 'passed').length,
    failed: results.filter((result) => result.status === 'failed').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    cases: results,
  };

  printSummary(summary);
  if (options.reportPath) {
    const resolvedReportPath = path.isAbsolute(options.reportPath) ? options.reportPath : path.resolve(packageRoot, options.reportPath);
    await fs.mkdir(path.dirname(resolvedReportPath), { recursive: true });
    await fs.writeFile(resolvedReportPath, JSON.stringify(summary, null, 2));
    console.log(`JSON report: ${resolvedReportPath}`);
  }

  if (summary.failed > 0 && !options.expectedFail) {
    throw new Error(`Conformance suite failed with ${summary.failed} failing case(s)`);
  }

  if (summary.failed === 0 && options.expectedFail) {
    throw new Error(`Expected target ${preparedTarget.name} to fail, but all conformance cases passed`);
  }

  return summary;
}

function printSummary(summary: RunSummary): void {
  console.log('Summary');
  console.log(`  Passed: ${summary.passed}`);
  console.log(`  Failed: ${summary.failed}`);
  console.log(`  Skipped: ${summary.skipped}`);
  console.log(`  Started: ${summary.startedAt}`);
  console.log(`  Finished: ${summary.finishedAt}`);
}
