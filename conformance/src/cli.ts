import path from 'node:path';

import { runSuite } from './runner.js';
import type { BuildSpec, ProtocolVersion, TargetSpec } from './types.js';
import { packageRoot } from './utils.js';

interface ParsedArgs {
  targetCommand?: string;
  args: string[];
  profile?: string;
  driver?: 'stdio' | 'in-process';
  versions: ProtocolVersion[];
  reportPath?: string;
  expectedFail: boolean;
  cwd?: string;
  env: Record<string, string>;
  build?: BuildSpec;
}

const parsed = parseArgs(process.argv.slice(2));

if (parsed.subcommand !== 'run') {
  throw new Error('Usage: tsx src/cli.ts run [--profile reference-stdio|reference-bad-stdio|reference-in-process] [--report path] [--expected-fail]');
}

const target = buildTarget(parsed);
await runSuite(target, {
  reportPath: parsed.reportPath,
  expectedFail: parsed.expectedFail,
});

function parseArgs(argv: string[]): ParsedArgs & { subcommand: string } {
  if (argv.length === 0) {
    throw new Error('Missing command');
  }
  const subcommand = argv[0];
  const result: ParsedArgs & { subcommand: string } = {
    subcommand,
    args: [],
    versions: [1, 2],
    expectedFail: false,
    env: {},
  };

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--profile':
        result.profile = argv[++index];
        break;
      case '--driver':
        result.driver = argv[++index] as 'stdio' | 'in-process';
        break;
      case '--target-command':
        result.targetCommand = argv[++index];
        break;
      case '--arg':
        result.args.push(argv[++index]);
        break;
      case '--report':
        result.reportPath = argv[++index];
        break;
      case '--expected-fail':
        result.expectedFail = true;
        break;
      case '--cwd':
        result.cwd = argv[++index];
        break;
      case '--version':
        result.versions = [Number(argv[++index]) as ProtocolVersion];
        break;
      case '--env': {
        const [name, ...valueParts] = argv[++index].split('=');
        result.env[name] = valueParts.join('=');
        break;
      }
      case '--build-command': {
        result.build = result.build ?? { output: '', sources: [] };
        result.build.command = argv[++index];
        break;
      }
      case '--build-output': {
        result.build = result.build ?? { output: '', sources: [] };
        result.build.output = argv[++index];
        break;
      }
      case '--build-source': {
        result.build = result.build ?? { output: '', sources: [] };
        result.build.sources.push(argv[++index]);
        break;
      }
      case '--build-cwd': {
        result.build = result.build ?? { output: '', sources: [] };
        result.build.cwd = argv[++index];
        break;
      }
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return result;
}

function buildTarget(parsed: ParsedArgs): TargetSpec {
  if (parsed.profile) {
    return builtinProfile(parsed.profile, parsed.reportPath);
  }
  if (!parsed.driver || (parsed.driver === 'stdio' && !parsed.targetCommand)) {
    throw new Error('External targets require --driver and --target-command');
  }
  return {
    name: 'external-target',
    driver: parsed.driver,
    requestedVersions: parsed.versions,
    command: parsed.targetCommand,
    args: parsed.args,
    cwd: parsed.cwd ?? packageRoot,
    env: parsed.env,
    build: parsed.build,
  };
}

function builtinProfile(profile: string, reportPath?: string): TargetSpec {
  const common = {
    requestedVersions: [1, 2] as ProtocolVersion[],
    cwd: packageRoot,
  };
  switch (profile) {
    case 'reference-stdio':
      return {
        ...common,
        name: 'reference-stdio',
        driver: 'stdio',
        command: process.execPath,
        args: ['--import', 'tsx', path.resolve(packageRoot, 'src/stdio-agent.ts')],
        env: {
          ACP_REFERENCE_MODE: 'good',
        },
      };
    case 'reference-bad-stdio':
      return {
        ...common,
        name: 'reference-bad-stdio',
        driver: 'stdio',
        command: process.execPath,
        args: ['--import', 'tsx', path.resolve(packageRoot, 'src/stdio-agent.ts')],
        env: {
          ACP_REFERENCE_MODE: 'bad',
        },
      };
    case 'reference-in-process':
      return {
        ...common,
        name: 'reference-in-process',
        driver: 'in-process',
        referenceMode: 'good',
      };
    default:
      throw new Error(`Unknown built-in profile: ${profile}`);
  }
}
