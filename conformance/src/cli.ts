import { runSuite } from "./runner.js";
import type { BuildSpec, ProtocolVersion, TargetSpec } from "./types.js";
import { packageRoot } from "./utils.js";
import { builtinProfile } from "./profiles.js";

interface ParsedArgs {
  targetCommand?: string;
  args: string[];
  profile?: string;
  driver?: "stdio" | "in-process";
  versions: ProtocolVersion[];
  reportPath?: string;
  expectedFail: boolean;
  cwd?: string;
  env: Record<string, string>;
  build?: BuildSpec;
  faults: string[];
}

process.on("unhandledRejection", (reason) => {
  const message =
    reason instanceof Error ? (reason.stack ?? reason.message) : String(reason);
  console.error(`FATAL: unhandledRejection: ${message}`);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error(`FATAL: uncaughtException: ${error.stack ?? error.message}`);
  process.exit(1);
});

void main();

async function main(): Promise<void> {
  try {
    const parsed = parseArgs(process.argv.slice(2));

    if (parsed.subcommand !== "run") {
      throw new Error(
        "Usage: tsx src/cli.ts run [--profile reference-stdio|reference-bad-stdio|reference-in-process] [--report path] [--expected-fail] [--fault fault-name]",
      );
    }

    const target = buildTarget(parsed);
    const summary = await runSuite(target, {
      reportPath: parsed.reportPath,
      expectedFail: parsed.expectedFail,
    });

    if (summary.aborted) {
      process.exitCode = 1;
      return;
    }

    if (summary.failed > 0 && !parsed.expectedFail) {
      process.exitCode = 1;
      return;
    }

    if (summary.failed === 0 && parsed.expectedFail) {
      process.exitCode = 1;
    }
  } catch (error) {
    const failure = error as Error;
    console.error(`FATAL: ${failure.stack ?? failure.message}`);
    process.exit(1);
  }
}

function parseArgs(argv: string[]): ParsedArgs & { subcommand: string } {
  if (argv.length === 0) {
    throw new Error("Missing command");
  }
  const subcommand = argv[0];
  const result: ParsedArgs & { subcommand: string } = {
    subcommand,
    args: [],
    versions: [1, 2],
    expectedFail: false,
    env: {},
    faults: [],
  };

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case "--profile":
        result.profile = argv[++index];
        break;
      case "--driver":
        result.driver = argv[++index] as "stdio" | "in-process";
        break;
      case "--target-command":
        result.targetCommand = argv[++index];
        break;
      case "--arg":
        result.args.push(argv[++index]);
        break;
      case "--report":
        result.reportPath = argv[++index];
        break;
      case "--expected-fail":
        result.expectedFail = true;
        break;
      case "--cwd":
        result.cwd = argv[++index];
        break;
      case "--version":
        result.versions = [Number(argv[++index]) as ProtocolVersion];
        break;
      case "--env": {
        const [name, ...valueParts] = argv[++index].split("=");
        result.env[name] = valueParts.join("=");
        break;
      }
      case "--fault":
        result.faults.push(argv[++index]);
        break;
      case "--build-command": {
        result.build = result.build ?? { output: "", sources: [] };
        result.build.command = argv[++index];
        break;
      }
      case "--build-output": {
        result.build = result.build ?? { output: "", sources: [] };
        result.build.output = argv[++index];
        break;
      }
      case "--build-source": {
        result.build = result.build ?? { output: "", sources: [] };
        result.build.sources.push(argv[++index]);
        break;
      }
      case "--build-cwd": {
        result.build = result.build ?? { output: "", sources: [] };
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
    return builtinProfile(parsed.profile, parsed.faults);
  }
  if (!parsed.driver || (parsed.driver === "stdio" && !parsed.targetCommand)) {
    throw new Error("External targets require --driver and --target-command");
  }
  return {
    name: "external-target",
    driver: parsed.driver,
    requestedVersions: parsed.versions,
    command: parsed.targetCommand,
    args: parsed.args,
    cwd: parsed.cwd ?? packageRoot,
    env: parsed.env,
    build: parsed.build,
    faults: parsed.faults,
  };
}
