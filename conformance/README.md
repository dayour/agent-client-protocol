# ACP Conformance Suite

This package is a self-contained, executable conformance suite for the Agent Client Protocol (ACP). It validates real JSON-RPC traffic against the repository's generated schemas in `../schema/v1/schema.json` and `../schema/v2/schema.json`, drives deterministic protocol scenarios over a real transport, and proves both success and failure with bundled reference targets.

Every outbound request is bounded by a timeout, every schema validation failure rejects the in-flight request that triggered it, and the runner writes a JSON report plus a terminal summary on both success and failure paths.

## What it validates

The suite focuses on the protocol behaviors that can hide false parity claims:

- Real `initialize` negotiation, capability exchange, forward-compatible unknown capability tolerance, and malformed-input rejection
- Session lifecycle flows:
  - v1: `session/new`, `session/load`
  - v2: `session/new`, `session/list`, `session/resume`, `replayFrom`
- Prompt execution:
  - v1 `session/prompt` completion responses with `stopReason`
  - v2 prompt acceptance plus `session/update`-driven completion
- Streaming `session/update` ordering and content/update shapes
- Cancellation via both `session/cancel` and `$/cancel_request`
- Permission prompts, rejection, and cancellation behavior
- v1 client-executed methods:
  - `fs/read_text_file`
  - `fs/write_text_file`
  - `terminal/create`
  - `terminal/output`
  - `terminal/kill`
  - `terminal/wait_for_exit`
  - `terminal/release`
- `elicitation/create`
- `_meta` preservation and underscore-prefixed extension methods
- Error handling for malformed JSON, unknown methods, and wrong parameter types
- v2 deltas:
  - `session/load` is not part of the v2 stable method surface
  - v2 uses display-only terminal updates via `session/update`
  - v2 must not expose the v1 client filesystem or `terminal/*` request surface

## Anti-mock and anti-stale-build guarantees

### Anti-mock

The default proof run is `reference-stdio`, which launches the bundled reference agent as an actual subprocess and exchanges newline-delimited JSON-RPC over stdio. The suite never validates that target by calling its functions directly. The in-process driver exists for embedders and adapter work, but the main `npm test` proof uses the real subprocess transport.

### Anti-stale-build

For external stdio targets that need a build artifact, the runner accepts:

- `--build-command`
- `--build-output`
- one or more `--build-source`
- optional `--build-cwd`

Before execution, the runner compares the build artifact timestamp to every declared source file. If the artifact is stale or missing, it runs the build command when one is supplied, re-checks freshness, and refuses to execute the target if the artifact is still stale. This prevents the stale-`dist/` failure mode from being hidden.

## Reference targets

Bundled proof targets:

- `reference-stdio` - conforming reference agent over a real subprocess stdio transport
- `reference-bad-stdio` - deliberately non-conforming target that the suite must fail
- `reference-in-process` - same logic through the in-process driver

These are implemented inside `src/reference-agent.ts` and `src/stdio-agent.ts`.

## Running the suite

From this directory:

```powershell
npm install
npm test
```

Other useful commands:

```powershell
npm run test:negative
npm run test:in-process
```

`npm run test:negative` does two things:

1. runs the original bundled non-conforming target
2. runs three injectable fault profiles that prove the harness fails cleanly for:
   - malformed mid-turn notifications while a request is still pending
   - missing required response fields
   - malformed trailing notifications that arrive after the final assertion path
   - wrong scalar response types
   - requests that never receive a response
   - unrecognized fault names, which must fail startup instead of being silently ignored

Reports are written to `.artifacts/` and ignored by Git:

- `.artifacts/reference-report.json`
- `.artifacts/reference-bad-report.json`
- `.artifacts/reference-fault-missing-session-id.json`
- `.artifacts/reference-fault-midturn-bad-update-v1.json`
- `.artifacts/reference-fault-trailing-bad-update-v1.json`
- `.artifacts/reference-fault-wrong-type-session-id.json`
- `.artifacts/reference-fault-timeout-session-new.json`
- `.artifacts/reference-in-process-report.json`

## Pointing the suite at an external stdio target

General shape:

```powershell
node --import tsx src/cli.ts run `
  --driver stdio `
  --target-command node `
  --arg E:\path\to\agent.js `
  --version 1 `
  --report .artifacts\external-v1.json
```

With stale-build protection:

```powershell
node --import tsx src/cli.ts run `
  --driver stdio `
  --target-command node `
  --arg E:\path\to\dist\agent.js `
  --version 2 `
  --build-command "npm run build" `
  --build-output dist\agent.js `
  --build-source src\**\*.ts `
  --report .artifacts\external-v2.json
```

## Deterministic scenario control for full protocol coverage

Some ACP behaviors, especially permission requests, client file IO, terminal usage, and elicitations, cannot be forced from an arbitrary prompt in a deterministic way. To keep the suite executable and implementation-focused, the bundled reference target exposes legal ACP extension methods under the underscore-reserved namespace:

- `_conformance/echo`
- `_conformance/set_scenario`
- `_conformance/slow`

These are valid extension methods under:

- `../docs/protocol/v1/extensibility.mdx`
- `../docs/protocol/v2/extensibility.mdx`

The conformance assertions still operate on standard ACP traffic. The extension methods only select deterministic scenarios so the suite can prove the standard protocol flows.

For explicit failure injection without source edits, the CLI also accepts repeated `--fault <name>` flags for the bundled reference target. Unknown fault names are rejected at startup with the valid fault set so a typo cannot silently turn a negative test into a false green run. The bundled negative suite uses this to inject schema-visible faults and timeout faults from the command line rather than by editing the reference implementation.

## Intended downstream targets

These are the next intended adapters or launch targets, but this task does not run them:

- WinLM: `E:\WinLM\src\acp-server`
- Foundry Local: `E:\Foundry-Local\sdk\js\src\acp\foundryLocalAcpAgent.ts`
- adaptive-manifest-protocol: `\\fschia\github\darbot-repos\adaptive-manifest-protocol\src\acp\adapter.js`

## Interpreting results

Each run produces:

- Human-readable stdout with one line per case and a pass/fail summary
- A machine-readable JSON report with:
  - target metadata
  - requested and actual versions
  - pass/fail counts
  - per-case duration
  - structured failure details
  - whether the run aborted before completing every case
  - a top-level run failure reason when startup, transport, or report-writing fails

Schema validation failures include:

- method
- direction
- JSON pointer path
- expected shape or field
- actual value
- raw message

Timeout failures include the original method name and the request id so silent or wedged targets fail as bounded diagnostics rather than hanging the suite.

Each case also includes a short post-assertion settle window before verdict. That window lets the harness validate late notifications and convert any transport-fatal condition into a case failure instead of recording a false pass.

## Adding a new test case

1. Add a case to `src/cases.ts`.
2. Declare the supported protocol versions in the case metadata.
3. Use standard ACP requests and notifications for assertions.
4. If deterministic behavior selection is required, add or reuse a `_conformance/*` scenario rather than hard-coding prompt semantics.
5. Run:

```powershell
npm test
npm run test:negative
```

## Current gaps

This suite is intentionally deep on the highest-value protocol surfaces. It does not yet exhaustively cover:

- v1 `session/list`, `session/resume`, `session/close`, and `session/delete`
- v2 `session/close`, `session/delete`, `session_info_update`, config-option updates, slash commands, and MCP session transport details
- Authentication method surfaces (`authenticate` in v1, `auth/login` and `auth/logout` in v2)
- Every `session/update` variant beyond the covered core streaming, tool, state, and terminal flows

Those can be added without changing the harness architecture.
