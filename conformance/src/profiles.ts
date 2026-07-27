import path from 'node:path';

import { normalizeReferenceFaults } from './reference-agent.js';
import type { ProtocolVersion, TargetSpec } from './types.js';
import { packageRoot } from './utils.js';

const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;

export function builtinProfile(profile: string, faults: string[] = []): TargetSpec {
  const normalizedFaults = normalizeReferenceFaults(faults);
  const common = {
    requestedVersions: [1, 2] as ProtocolVersion[],
    cwd: packageRoot,
    requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
  };

  switch (profile) {
    case 'reference-stdio':
      return referenceStdioTarget('reference-stdio', normalizedFaults, common);
    case 'reference-bad-stdio':
      return referenceStdioTarget('reference-bad-stdio', ['omit-v1-prompt-stop-reason', 'illegal-v2-fs-read-text-file'], common);
    case 'reference-in-process':
      return {
        ...common,
        name: 'reference-in-process',
        driver: 'in-process',
        referenceMode: 'good',
        faults: normalizedFaults,
      };
    default:
      throw new Error(`Unknown built-in profile: ${profile}`);
  }
}

function referenceStdioTarget(
  name: string,
  faults: string[],
  common: { requestedVersions: ProtocolVersion[]; cwd: string; requestTimeoutMs: number },
): TargetSpec {
  const normalizedFaults = normalizeReferenceFaults(faults);
  return {
    ...common,
    name,
    driver: 'stdio',
    command: process.execPath,
    args: ['--import', 'tsx', path.resolve(packageRoot, 'src/stdio-agent.ts')],
    env: {
      ACP_REFERENCE_MODE: 'good',
      ACP_REFERENCE_FAULTS: normalizedFaults.join(','),
    },
    faults: normalizedFaults,
  };
}

export const referenceFaultProfiles: Array<{ name: string; reportPath: string; faults: string[]; expectedFailurePattern: RegExp }> = [
  {
    name: 'reference-fault-midturn-bad-update-v1',
    reportPath: '.artifacts/reference-fault-midturn-bad-update-v1.json',
    faults: ['midturn-bad-update-v1'],
    expectedFailurePattern: /session\/update failed schema validation/i,
  },
  {
    name: 'reference-fault-missing-session-id',
    reportPath: '.artifacts/reference-fault-missing-session-id.json',
    faults: ['omit-v1-session-new-session-id'],
    expectedFailurePattern: /required property sessionId/i,
  },
  {
    name: 'reference-fault-wrong-type-session-id',
    reportPath: '.artifacts/reference-fault-wrong-type-session-id.json',
    faults: ['wrong-type-v1-session-new-session-id'],
    expectedFailurePattern: /type string/i,
  },
  {
    name: 'reference-fault-timeout-session-new',
    reportPath: '.artifacts/reference-fault-timeout-session-new.json',
    faults: ['timeout-v1-session-new'],
    expectedFailurePattern: /No response within .*session\/new/i,
  },
  {
    name: 'reference-fault-trailing-bad-update-v1',
    reportPath: '.artifacts/reference-fault-trailing-bad-update-v1.json',
    faults: ['trailing-bad-update-v1'],
    expectedFailurePattern: /session\/update failed schema validation/i,
  },
];
