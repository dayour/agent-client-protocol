import fs from 'node:fs/promises';

import { builtinProfile, referenceFaultProfiles } from './profiles.js';
import { runSuite } from './runner.js';

async function main(): Promise<void> {
  let failures = 0;

  for (const profile of referenceFaultProfiles) {
    console.log(`Fault suite: ${profile.name}`);
    const summary = await runSuite(builtinProfile('reference-stdio', profile.faults), {
      expectedFail: true,
      reportPath: profile.reportPath,
    });

    let matchedFailure = false;
    if (summary.reportPath) {
      const reportText = await fs.readFile(summary.reportPath, 'utf8');
      const report = JSON.parse(reportText) as { failed: number; aborted: boolean; cases: Array<{ failure?: { message?: string } }> };
      const messages = report.cases
        .map((testCase) => testCase.failure?.message)
        .filter((message): message is string => Boolean(message))
        .join('\n');
      matchedFailure = profile.expectedFailurePattern.test(messages);
    }

    const valid = !summary.aborted && Boolean(summary.reportPath) && summary.failed > 0 && matchedFailure;
    if (valid) {
      console.log(`PASS fault ${profile.name}`);
      console.log(`  report: ${summary.reportPath}`);
      continue;
    }

    failures += 1;
    console.log(`FAIL fault ${profile.name}`);
    console.log(`  aborted: ${summary.aborted ? 'yes' : 'no'}`);
    console.log(`  failed cases: ${summary.failed}`);
    console.log(`  matched expected failure: ${matchedFailure ? 'yes' : 'no'}`);
    console.log(`  report: ${summary.reportPath ?? 'missing'}`);
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

void main();
