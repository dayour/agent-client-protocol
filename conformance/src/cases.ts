import type { HarnessConnection } from "./driver.js";
import type {
  ConformanceCase,
  InitializeArtifacts,
  JsonRpcErrorResponse,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  JsonValue,
  ProtocolVersion,
  ScenarioSupport,
  TranscriptEntry,
} from "./types.js";
import { assert, isErrorResponse, isSuccessResponse } from "./utils.js";

const TRACEPARENT = "00-11111111111111111111111111111111-2222222222222222-01";

export const conformanceCases: ConformanceCase[] = [
  {
    id: "initialize-negotiation",
    title: "Negotiating initialize and tolerating unknown capabilities",
    versions: [1, 2],
    async run(connection, meta) {
      const initialized = await initialize(connection, meta.version);
      const result = initialized.response.result as Record<string, JsonValue>;
      assert(
        result.protocolVersion === meta.version,
        `Expected negotiated protocolVersion ${meta.version}`,
      );
      assert(
        initialized.scenarioSupport.available,
        "Expected reference target to advertise scenario control support",
      );
    },
  },
  {
    id: "initialize-invalid-params",
    title: "Rejecting malformed initialize input",
    versions: [1, 2],
    async run(connection, meta) {
      const invalidParams =
        meta.version === 1
          ? {
              protocolVersion: "wrong",
              clientCapabilities: {},
              clientInfo: { name: "bad-client" },
            }
          : {
              protocolVersion: "wrong",
              capabilities: {},
              info: { name: "bad-client", version: 1 },
            };
      const response = await connection.request("initialize", invalidParams, {
        raw: true,
      });
      expectErrorCode(response, -32602);
    },
  },
  {
    id: "unknown-method-and-extensibility",
    title:
      "Handling unknown methods, underscore notifications, and _meta passthrough",
    versions: [1, 2],
    async run(connection, meta) {
      await initialize(connection, meta.version);

      const unknownResponse = await connection.request(
        "session/does_not_exist",
        {
          sessionId: "sess_unknown",
        },
        { raw: true },
      );
      expectErrorCode(unknownResponse, -32601);

      await connection.notify("_unknown/conformance_noop", { hello: "world" });

      const extResponse = await connection.request("_conformance/echo", {
        payload: "meta round trip",
        _meta: {
          traceparent: TRACEPARENT,
          "darbotlabs/example": "echo",
        },
      });
      const success = expectSuccess(extResponse);
      const echoed = (success.result as Record<string, JsonValue>)
        .echoed as Record<string, JsonValue>;
      assert(
        echoed.payload === "meta round trip",
        "Expected extension echo payload to round-trip",
      );
      const echoedMeta = echoed._meta as Record<string, JsonValue>;
      assert(
        echoedMeta.traceparent === TRACEPARENT,
        "Expected _meta.traceparent to be preserved",
      );
    },
  },
  {
    id: "parse-error",
    title: "Returning JSON-RPC parse errors for malformed JSON",
    versions: [1, 2],
    driverSupport: ["stdio"],
    async run(connection) {
      await connection.sendRawLine(
        '{"jsonrpc":"2.0","id":99,"method":"initialize","params":',
      );
      const response = await connection.expectUnmatchedResponse(
        (message) => isErrorResponse(message) && message.error.code === -32700,
        {
          timeoutMs: 4_000,
        },
      );
      expectErrorCode(response, -32700);
    },
  },
  {
    id: "cancel-request-jsonrpc",
    title: "Cancelling in-flight requests with $/cancel_request",
    versions: [1, 2],
    async run(connection, meta) {
      await initialize(connection, meta.version);
      const pending = await connection.requestWithId("_conformance/slow", {
        label: "slow-call",
      });
      await connection.notify("$/cancel_request", {
        requestId: pending.id,
      });
      const response = await pending.response;
      expectErrorCode(response, -32800);
    },
  },
  {
    id: "v1-session-load-replay",
    title: "Replaying history through session/load before its response",
    versions: [1],
    async run(connection, meta) {
      await initialize(connection, meta.version);
      const sessionId = await createSession(connection, meta.version);

      const promptResponse = await connection.request("session/prompt", {
        sessionId,
        prompt: [{ type: "text", text: "Load this history" }],
      });
      await connection.expectNotification("session/update");
      await connection.expectNotification("session/update");
      const promptSuccess = expectSuccess(promptResponse);
      assert(
        (promptSuccess.result as Record<string, JsonValue>).stopReason ===
          "end_turn",
        "Expected v1 prompt stopReason=end_turn",
      );

      const pendingLoad = await connection.requestWithId("session/load", {
        sessionId,
        cwd: "C:/workspace",
        mcpServers: [],
      });
      const replayUser = await connection.expectNotification("session/update");
      const replayAgent = await connection.expectNotification("session/update");
      const loadResponse = expectSuccess(await pendingLoad.response);
      const userUpdate = extractSessionUpdate(replayUser);
      const agentUpdate = extractSessionUpdate(replayAgent);
      assert(
        userUpdate.sessionUpdate === "user_message_chunk",
        "Expected v1 session/load to replay user_message_chunk first",
      );
      assert(
        agentUpdate.sessionUpdate === "agent_message_chunk",
        "Expected v1 session/load to replay agent_message_chunk second",
      );
      assert(
        typeof loadResponse.result === "object",
        "Expected v1 session/load response object",
      );
    },
  },
  {
    id: "v1-full-turn-core",
    title:
      "Driving v1 permissions, fs, terminal, and elicitation over real RPC",
    versions: [1],
    requiresScenario: true,
    async run(connection, meta) {
      const initialized = await initialize(connection, meta.version);
      requireScenarioSupport(initialized.scenarioSupport);
      const sessionId = await createSession(connection, meta.version);
      await configureScenario(connection, sessionId, "v1-full-turn");

      const promptPending = connection.request("session/prompt", {
        sessionId,
        prompt: [{ type: "text", text: "Run the v1 conformance scenario" }],
      });

      const userUpdate = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        userUpdate.sessionUpdate === "user_message_chunk",
        "Expected initial v1 user_message_chunk",
      );
      const toolCall = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        toolCall.sessionUpdate === "tool_call",
        "Expected v1 tool_call update before permission",
      );

      const permissionRequest = await connection.expectRequest(
        "session/request_permission",
      );
      await connection.respondSuccess(
        permissionRequest.id,
        "session/request_permission",
        {
          outcome: {
            outcome: "selected",
            optionId: "allow-once",
          },
        },
      );

      const readRequest = await connection.expectRequest("fs/read_text_file");
      await connection.respondSuccess(readRequest.id, "fs/read_text_file", {
        content: "fixture input",
      });

      const writeRequest = await connection.expectRequest("fs/write_text_file");
      await connection.respondSuccess(
        writeRequest.id,
        "fs/write_text_file",
        {},
      );

      const terminalCreate = await connection.expectRequest("terminal/create");
      await connection.respondSuccess(terminalCreate.id, "terminal/create", {
        terminalId: "term_from_client",
      });

      const terminalOutput = await connection.expectRequest("terminal/output");
      await connection.respondSuccess(terminalOutput.id, "terminal/output", {
        output: "node v25.7.0\n",
        truncated: false,
      });

      const terminalKill = await connection.expectRequest("terminal/kill");
      await connection.respondSuccess(terminalKill.id, "terminal/kill", {});

      const terminalWait = await connection.expectRequest(
        "terminal/wait_for_exit",
      );
      await connection.respondSuccess(
        terminalWait.id,
        "terminal/wait_for_exit",
        {
          exitCode: 0,
          signal: null,
        },
      );

      const terminalRelease =
        await connection.expectRequest("terminal/release");
      await connection.respondSuccess(
        terminalRelease.id,
        "terminal/release",
        {},
      );

      const elicitation = await connection.expectRequest("elicitation/create");
      await connection.respondSuccess(elicitation.id, "elicitation/create", {
        action: "accept",
        content: {
          strategy: "balanced",
        },
      });

      const completedTool = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        completedTool.sessionUpdate === "tool_call_update",
        "Expected v1 completed tool_call_update",
      );
      const agentUpdate = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        agentUpdate.sessionUpdate === "agent_message_chunk",
        "Expected v1 final agent_message_chunk",
      );

      const promptSuccess = expectSuccess(await promptPending);
      assert(
        (promptSuccess.result as Record<string, JsonValue>).stopReason ===
          "end_turn",
        "Expected v1 stopReason=end_turn",
      );
    },
  },
  {
    id: "v1-permission-rejection",
    title:
      "Handling v1 permission rejection without leaking client method calls",
    versions: [1],
    requiresScenario: true,
    async run(connection, meta) {
      const initialized = await initialize(connection, meta.version);
      requireScenarioSupport(initialized.scenarioSupport);
      const sessionId = await createSession(connection, meta.version);
      await configureScenario(connection, sessionId, "v1-permission-reject");

      const promptPending = connection.request("session/prompt", {
        sessionId,
        prompt: [{ type: "text", text: "Reject the permission request" }],
      });

      await connection.expectNotification("session/update");
      await connection.expectNotification("session/update");
      const permissionRequest = await connection.expectRequest(
        "session/request_permission",
      );
      await connection.respondSuccess(
        permissionRequest.id,
        "session/request_permission",
        {
          outcome: {
            outcome: "selected",
            optionId: "reject-once",
          },
        },
      );

      const completedTool = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        completedTool.sessionUpdate === "tool_call_update",
        "Expected rejection path tool_call_update",
      );
      const agentUpdate = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        agentUpdate.sessionUpdate === "agent_message_chunk",
        "Expected rejection path final agent message",
      );
      expectSuccess(await promptPending);

      const illegalClientMethods = findAgentMethods(
        connection.getTranscript(),
        /^(fs\/|terminal\/|elicitation\/create$)/,
      );
      assert(
        illegalClientMethods.length === 0,
        "Expected no filesystem, terminal, or elicitation client requests during rejection flow",
      );
    },
  },
  {
    id: "v1-session-cancel",
    title: "Stopping a v1 prompt turn after session/cancel",
    versions: [1],
    requiresScenario: true,
    async run(connection, meta) {
      const initialized = await initialize(connection, meta.version);
      requireScenarioSupport(initialized.scenarioSupport);
      const sessionId = await createSession(connection, meta.version);
      await configureScenario(connection, sessionId, "v1-permission-cancel");

      const promptPending = connection.request("session/prompt", {
        sessionId,
        prompt: [{ type: "text", text: "Cancel this permission-bound turn" }],
      });

      await connection.expectNotification("session/update");
      await connection.expectNotification("session/update");
      const permissionRequest = await connection.expectRequest(
        "session/request_permission",
      );

      await connection.notify("session/cancel", { sessionId });
      await connection.respondSuccess(
        permissionRequest.id,
        "session/request_permission",
        {
          outcome: {
            outcome: "cancelled",
          },
        },
      );

      const promptSuccess = expectSuccess(await promptPending);
      assert(
        (promptSuccess.result as Record<string, JsonValue>).stopReason ===
          "cancelled",
        "Expected v1 cancelled stopReason after session/cancel",
      );
    },
  },
  {
    id: "v2-session-list-and-resume",
    title: "Exercising v2 session/list and session/resume replayFrom semantics",
    versions: [2],
    async run(connection, meta) {
      await initialize(connection, meta.version);
      const sessionId = await createSession(connection, meta.version);

      const promptStart = connection.getTranscript().length;
      const promptPending = await connection.requestWithId("session/prompt", {
        sessionId,
        prompt: [{ type: "text", text: "Resume this history" }],
      });
      const promptSuccess = expectSuccess(await promptPending.response);
      assert(
        typeof promptSuccess.result === "object",
        "Expected v2 prompt acceptance object",
      );
      const promptSlice = connection.getTranscript().slice(promptStart);
      assert(
        responsePrecedesUpdates(promptSlice),
        "Expected v2 session/prompt response before session/update output",
      );
      await connection.expectNotification("session/update");
      await connection.expectNotification("session/update");
      await connection.expectNotification("session/update");
      await connection.expectNotification("session/update");

      const listResponse = expectSuccess(
        await connection.request("session/list", {
          cwd: "C:/workspace",
        }),
      );
      const sessions = (listResponse.result as Record<string, JsonValue>)
        .sessions as JsonValue[];
      assert(
        Array.isArray(sessions) &&
          sessions.some(
            (entry) =>
              (entry as Record<string, JsonValue>).sessionId === sessionId,
          ),
        "Expected session/list to include the new session",
      );

      const resumeNoReplayStart = connection.getTranscript().length;
      expectSuccess(
        await connection.request("session/resume", {
          sessionId,
          cwd: "C:/workspace",
        }),
      );
      const resumeNoReplaySlice = connection
        .getTranscript()
        .slice(resumeNoReplayStart);
      const resumeNoReplayUpdates = resumeNoReplaySlice.filter(
        (entry) =>
          entry.direction === "agent->client" &&
          isSessionUpdateNotification(entry),
      );
      assert(
        resumeNoReplayUpdates.length === 0,
        "Expected v2 session/resume without replayFrom to omit session/update replay",
      );

      const resumeReplay = await connection.requestWithId("session/resume", {
        sessionId,
        cwd: "C:/workspace",
        replayFrom: {
          type: "start",
        },
      });
      const replayUser = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      const replayAgent = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        replayUser.sessionUpdate === "user_message",
        "Expected v2 replayFrom=start to emit user_message",
      );
      assert(
        replayAgent.sessionUpdate === "agent_message",
        "Expected v2 replayFrom=start to emit agent_message",
      );
      expectSuccess(await resumeReplay.response);
    },
  },
  {
    id: "v2-full-turn-display-terminals",
    title:
      "Driving v2 permissions, display-only terminals, and elicitation without client fs",
    versions: [2],
    requiresScenario: true,
    async run(connection, meta) {
      const initialized = await initialize(connection, meta.version);
      requireScenarioSupport(initialized.scenarioSupport);
      const sessionId = await createSession(connection, meta.version);
      await configureScenario(connection, sessionId, "v2-full-turn");

      const promptStart = connection.getTranscript().length;
      const promptPending = await connection.requestWithId("session/prompt", {
        sessionId,
        prompt: [{ type: "text", text: "Run the v2 conformance scenario" }],
      });
      expectSuccess(await promptPending.response);
      const promptSlice = connection.getTranscript().slice(promptStart);
      assert(
        responsePrecedesUpdates(promptSlice),
        "Expected v2 prompt acceptance response before updates",
      );

      const userMessage = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        userMessage.sessionUpdate === "user_message",
        "Expected v2 user_message",
      );
      const running = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        running.sessionUpdate === "state_update" && running.state === "running",
        "Expected running state_update",
      );
      const toolUpdate = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        toolUpdate.sessionUpdate === "tool_call_update",
        "Expected v2 tool_call_update",
      );
      const permissionRequest = await connection.expectRequest(
        "session/request_permission",
      );
      await connection.respondSuccess(
        permissionRequest.id,
        "session/request_permission",
        {
          outcome: {
            outcome: "selected",
            optionId: "allow-once",
          },
        },
      );
      const requiresAction = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        requiresAction.sessionUpdate === "state_update" &&
          requiresAction.state === "requires_action",
        "Expected requires_action state_update",
      );
      const runningAgain = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        runningAgain.sessionUpdate === "state_update" &&
          runningAgain.state === "running",
        "Expected state to return to running",
      );
      const terminalUpdate = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        terminalUpdate.sessionUpdate === "terminal_update",
        "Expected display-only terminal_update",
      );
      const terminalChunk = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        terminalChunk.sessionUpdate === "terminal_output_chunk",
        "Expected display-only terminal_output_chunk",
      );

      const elicitation = await connection.expectRequest("elicitation/create");
      await connection.respondSuccess(elicitation.id, "elicitation/create", {
        action: "accept",
        content: {
          tone: "formal",
        },
      });

      const finalAgent = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        finalAgent.sessionUpdate === "agent_message",
        "Expected final v2 agent_message",
      );
      const idle = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        idle.sessionUpdate === "state_update" &&
          idle.state === "idle" &&
          idle.stopReason === "end_turn",
        "Expected idle end_turn state_update",
      );

      const disallowed = findAgentMethods(
        connection.getTranscript(),
        /^(fs\/|terminal\/(create|output|wait_for_exit|kill|release)$)/,
      );
      assert(
        disallowed.length === 0,
        "Expected no v1-style filesystem or terminal client requests in v2 flow",
      );
    },
  },
  {
    id: "v2-session-cancel",
    title: "Reporting v2 cancellation via idle state_update",
    versions: [2],
    requiresScenario: true,
    async run(connection, meta) {
      const initialized = await initialize(connection, meta.version);
      requireScenarioSupport(initialized.scenarioSupport);
      const sessionId = await createSession(connection, meta.version);
      await configureScenario(connection, sessionId, "v2-cancel");

      const promptResponse = expectSuccess(
        await connection.request("session/prompt", {
          sessionId,
          prompt: [{ type: "text", text: "Cancel this v2 turn" }],
        }),
      );
      assert(
        typeof promptResponse.result === "object",
        "Expected v2 prompt response object",
      );
      await connection.expectNotification("session/update");
      await connection.expectNotification("session/update");
      await connection.notify("session/cancel", { sessionId });
      const idle = extractSessionUpdate(
        await connection.expectNotification("session/update"),
      );
      assert(
        idle.sessionUpdate === "state_update" &&
          idle.state === "idle" &&
          idle.stopReason === "cancelled",
        "Expected v2 idle cancelled state_update",
      );
    },
  },
  {
    id: "v2-session-load-absent",
    title: "Rejecting v1 session/load on a v2 connection",
    versions: [2],
    async run(connection, meta) {
      await initialize(connection, meta.version);
      const response = await connection.request(
        "session/load",
        {
          sessionId: "sess_missing",
          cwd: "C:/workspace",
          mcpServers: [],
        },
        { raw: true },
      );
      expectErrorCode(response, -32601);
    },
  },
];

export async function initialize(
  connection: HarnessConnection,
  version: ProtocolVersion,
): Promise<InitializeArtifacts> {
  const response = await connection.request(
    "initialize",
    version === 1
      ? {
          protocolVersion: 1,
          clientCapabilities: {
            fs: {
              readTextFile: true,
              writeTextFile: true,
            },
            terminal: true,
            elicitation: {
              form: {},
              url: {},
            },
            futureMatrix: {
              enabled: true,
            },
            _meta: {
              "darbotlabs/example-capability": true,
            },
          },
          clientInfo: {
            name: "acp-conformance-client",
            title: "ACP Conformance Client",
            version: "0.1.0",
          },
          _meta: {
            traceparent: TRACEPARENT,
          },
        }
      : {
          protocolVersion: 2,
          capabilities: {
            elicitation: {
              form: {},
              url: {},
            },
            futureMatrix: {
              enabled: true,
            },
            _meta: {
              "darbotlabs/example-capability": true,
            },
          },
          info: {
            name: "acp-conformance-client",
            title: "ACP Conformance Client",
            version: "0.1.0",
          },
          _meta: {
            traceparent: TRACEPARENT,
          },
        },
    { raw: true },
  );
  const success = expectSuccess(response);
  return {
    response: success,
    scenarioSupport: scenarioSupportFromInitialize(
      version,
      success.result as Record<string, JsonValue>,
    ),
  };
}

async function createSession(
  connection: HarnessConnection,
  version: ProtocolVersion,
): Promise<string> {
  const response = expectSuccess(
    await connection.request(
      "session/new",
      version === 1
        ? {
            cwd: "C:/workspace",
            mcpServers: [],
          }
        : {
            cwd: "C:/workspace",
          },
    ),
  );
  return (response.result as Record<string, JsonValue>).sessionId as string;
}

async function configureScenario(
  connection: HarnessConnection,
  sessionId: string,
  scenario: string,
): Promise<void> {
  expectSuccess(
    await connection.request("_conformance/set_scenario", {
      sessionId,
      scenario,
    }),
  );
}

function expectSuccess(
  response: JsonRpcSuccessResponse | JsonRpcErrorResponse,
): JsonRpcSuccessResponse {
  assert(
    isSuccessResponse(response),
    `Expected success response, got ${JSON.stringify(response)}`,
  );
  return response as JsonRpcSuccessResponse;
}

function expectErrorCode(
  response: JsonRpcSuccessResponse | JsonRpcErrorResponse,
  code: number,
): JsonRpcErrorResponse {
  assert(
    isErrorResponse(response),
    `Expected error response ${code}, got ${JSON.stringify(response)}`,
  );
  const error = response as JsonRpcErrorResponse;
  assert(
    error.error.code === code,
    `Expected JSON-RPC error code ${code}, got ${error.error.code}`,
  );
  return error;
}

function scenarioSupportFromInitialize(
  version: ProtocolVersion,
  result: Record<string, JsonValue>,
): ScenarioSupport {
  const source =
    version === 1
      ? ((result.agentCapabilities as Record<string, JsonValue> | undefined)
          ?._meta as Record<string, JsonValue> | undefined)
      : (((result.capabilities as Record<string, JsonValue> | undefined)
          ?._meta as Record<string, JsonValue> | undefined) ??
        ((
          (result.capabilities as Record<string, JsonValue> | undefined)
            ?.session as Record<string, JsonValue> | undefined
        )?._meta as Record<string, JsonValue> | undefined));
  const flag = source?.["darbotlabs/conformance"] as
    Record<string, JsonValue> | undefined;
  return {
    available: flag?.scenarioControl === true,
    source: flag ? "initialize._meta" : "absent",
  };
}

function requireScenarioSupport(support: ScenarioSupport): void {
  assert(
    support.available,
    `Scenario control support is required but initialize advertised ${support.source}`,
  );
}

function extractSessionUpdate(
  notification: JsonRpcNotification,
): Record<string, JsonValue> {
  const params = notification.params as Record<string, JsonValue>;
  return params.update as Record<string, JsonValue>;
}

function responsePrecedesUpdates(entries: TranscriptEntry[]): boolean {
  const firstAgentEntry = entries.findIndex(
    (entry) => entry.direction === "agent->client",
  );
  const firstUpdate = entries.findIndex(
    (entry) =>
      entry.direction === "agent->client" && isSessionUpdateNotification(entry),
  );
  const firstResponse = entries.findIndex(
    (entry) => entry.direction === "agent->client" && !hasMethod(entry),
  );
  return (
    firstAgentEntry >= 0 &&
    firstResponse >= 0 &&
    (firstUpdate === -1 || firstResponse < firstUpdate)
  );
}

function hasMethod(entry: TranscriptEntry): boolean {
  return Boolean(
    entry.parsed &&
    typeof entry.parsed === "object" &&
    "method" in (entry.parsed as Record<string, unknown>),
  );
}

function isSessionUpdateNotification(entry: TranscriptEntry): boolean {
  return Boolean(
    entry.parsed &&
    typeof entry.parsed === "object" &&
    "method" in (entry.parsed as Record<string, unknown>) &&
    (entry.parsed as Record<string, unknown>).method === "session/update",
  );
}

function findAgentMethods(
  transcript: TranscriptEntry[],
  matcher: RegExp,
): string[] {
  return transcript
    .filter((entry) => entry.direction === "agent->client" && hasMethod(entry))
    .map((entry) => (entry.parsed as Record<string, unknown>).method as string)
    .filter((method) => matcher.test(method));
}
