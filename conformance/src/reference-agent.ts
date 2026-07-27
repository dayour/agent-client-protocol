import type {
  JsonRpcErrorResponse,
  JsonRpcMessage,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  JsonValue,
  ProtocolVersion,
} from './types.js';
import { SchemaRegistry } from './schema.js';
import { base64, firstTextBlock, isoNow, sleep } from './utils.js';

export const REFERENCE_FAULTS = [
  'illegal-v2-fs-read-text-file',
  'midturn-bad-update-v1',
  'omit-v1-prompt-stop-reason',
  'omit-v1-session-new-session-id',
  'timeout-v1-session-new',
  'trailing-bad-update-v1',
  'wrong-type-v1-session-new-session-id',
] as const;

export type ReferenceFault = (typeof REFERENCE_FAULTS)[number];

export function normalizeReferenceFaults(faults: string[]): ReferenceFault[] {
  const unknown = [...new Set(faults.filter((fault) => !REFERENCE_FAULTS.includes(fault as ReferenceFault)))];
  if (unknown.length > 0) {
    throw new Error(`Unknown reference fault name(s): ${unknown.join(', ')}. Valid faults: ${REFERENCE_FAULTS.join(', ')}`);
  }
  return [...new Set(faults)] as ReferenceFault[];
}

interface HistoryEntry {
  role: 'user' | 'agent';
  messageId: string;
  content: JsonValue[];
}

interface SessionRecord {
  sessionId: string;
  cwd: string;
  title: string | null;
  updatedAt: string;
  history: HistoryEntry[];
  scenario: string | null;
}

interface PromptContext {
  sessionId: string;
  v1RequestId?: string | number;
  cancelled: boolean;
  activePermissionRequestId?: string | number;
}

interface PendingClientCall {
  method: string;
  resolve: (message: JsonRpcSuccessResponse | JsonRpcErrorResponse) => void;
  reject: (error: Error) => void;
}

interface InProcessReferenceTransport {
  receive(line: string): Promise<void>;
  close(): Promise<void>;
}

export async function createReferenceInProcessTransport(
  faults: string[],
  onStdout: (line: string) => void,
  onStderr: (line: string) => void,
): Promise<InProcessReferenceTransport> {
  const agent = new ReferenceAgent(faults, onStdout, onStderr);
  return {
    async receive(line: string): Promise<void> {
      await agent.receive(line);
    },
    async close(): Promise<void> {
      await agent.close();
    },
  };
}

export class ReferenceAgent {
  private readonly schema = new SchemaRegistry();
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly promptContexts = new Map<string, PromptContext>();
  private readonly pendingClientCalls = new Map<string | number, PendingClientCall>();
  private readonly pendingSlowCalls = new Map<string | number, NodeJS.Timeout>();

  private version?: ProtocolVersion;
  private nextAgentRequestId = 10_000;
  private nextSessionId = 1;
  private nextMessageId = 1;
  private nextToolCallId = 1;
  private nextTerminalId = 1;
  private readonly faults: Set<ReferenceFault>;

  constructor(
    faults: string[],
    private readonly emitStdout: (line: string) => void,
    private readonly emitStderr: (line: string) => void,
  ) {
    this.faults = new Set(normalizeReferenceFaults(faults));
  }

  async receive(line: string): Promise<void> {
    let message: JsonRpcMessage;
    try {
      message = JSON.parse(line) as JsonRpcMessage;
    } catch {
      await this.emitMessage({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
        },
      });
      return;
    }

    if ('method' in message) {
      if ('id' in message) {
        await this.handleRequest(message);
      } else {
        await this.handleNotification(message);
      }
      return;
    }

    await this.handleResponse(message);
  }

  async close(): Promise<void> {
    for (const [, timer] of this.pendingSlowCalls) {
      clearTimeout(timer);
    }
    this.pendingSlowCalls.clear();
    for (const [, pending] of this.pendingClientCalls) {
      pending.reject(new Error('Reference agent closed'));
    }
    this.pendingClientCalls.clear();
  }

  private async handleRequest(message: JsonRpcRequest): Promise<void> {
    if (message.method.startsWith('_')) {
      await this.handleExtensionRequest(message);
      return;
    }

    if (message.method === 'initialize') {
      await this.handleInitialize(message);
      return;
    }

    if (!this.version) {
      await this.sendError(message.id, -32600, 'Invalid request');
      return;
    }

    if (!this.knownMethodsForVersion(this.version).has(message.method)) {
      await this.sendError(message.id, -32601, 'Method not found');
      return;
    }

    try {
      this.schema.validateInbound(this.version, 'client', message, JSON.stringify(message));
    } catch {
      await this.sendError(message.id, -32602, 'Invalid params');
      return;
    }

    switch (message.method) {
      case 'session/new':
        await this.handleSessionNew(message);
        return;
      case 'session/load':
        await this.handleSessionLoad(message);
        return;
      case 'session/list':
        await this.handleSessionList(message);
        return;
      case 'session/resume':
        await this.handleSessionResume(message);
        return;
      case 'session/close':
        await this.handleSessionClose(message);
        return;
      case 'session/prompt':
        await this.handlePrompt(message);
        return;
      default:
        await this.sendError(message.id, -32601, 'Method not found');
    }
  }

  private async handleNotification(message: JsonRpcNotification): Promise<void> {
    if (message.method.startsWith('_')) {
      return;
    }

    if (!this.version && message.method !== '$/cancel_request') {
      return;
    }

    if (this.version) {
      try {
        this.schema.validateInbound(this.version, 'client', message, JSON.stringify(message));
      } catch {
        return;
      }
    }

    switch (message.method) {
      case '$/cancel_request': {
        const requestId = (message.params as Record<string, JsonValue> | undefined)?.requestId as string | number | undefined;
        if (requestId !== undefined) {
          const timer = this.pendingSlowCalls.get(requestId);
          if (timer) {
            clearTimeout(timer);
            this.pendingSlowCalls.delete(requestId);
            await this.emitMessage({
              jsonrpc: '2.0',
              id: requestId,
              error: {
                code: -32800,
                message: 'Request cancelled',
              },
            });
          }
        }
        return;
      }
      case 'session/cancel': {
        const sessionId = (message.params as Record<string, JsonValue>).sessionId as string;
        const context = this.promptContexts.get(sessionId);
        if (context) {
          context.cancelled = true;
        }
        return;
      }
      default:
        return;
    }
  }

  private async handleResponse(message: JsonRpcSuccessResponse | JsonRpcErrorResponse): Promise<void> {
    const pending = this.pendingClientCalls.get(message.id ?? 'null');
    if (!pending) {
      return;
    }
    if (this.version) {
      try {
        this.schema.validateInbound(this.version, 'client', message, JSON.stringify(message), pending.method);
      } catch (error) {
        pending.reject(error as Error);
        this.pendingClientCalls.delete(message.id ?? 'null');
        return;
      }
    }
    this.pendingClientCalls.delete(message.id ?? 'null');
    pending.resolve(message);
  }

  private async handleInitialize(message: JsonRpcRequest): Promise<void> {
    const requestedVersion = this.extractRequestedVersion(message.params);
    if (requestedVersion !== 1 && requestedVersion !== 2) {
      await this.sendError(message.id, -32602, 'Invalid params');
      return;
    }

    try {
      this.schema.validateInbound(requestedVersion, 'client', message, JSON.stringify(message));
    } catch {
      await this.sendError(message.id, -32602, 'Invalid params');
      return;
    }

    this.version = requestedVersion;
    const result =
      requestedVersion === 1
        ? {
            protocolVersion: 1,
            agentCapabilities: {
              loadSession: true,
              promptCapabilities: {
                embeddedContext: true,
              },
              sessionCapabilities: {
                list: {},
                resume: {},
                close: {},
              },
              _meta: {
                'darbotlabs/conformance': {
                  scenarioControl: true,
                },
              },
            },
            agentInfo: {
              name: 'darbotlm-acp-reference',
              title: 'DarbotLM ACP Reference Agent',
              version: '0.1.0',
            },
            authMethods: [],
          }
        : {
            protocolVersion: 2,
            capabilities: {
              session: {
                prompt: {
                  embeddedContext: {},
                },
                mcp: {
                  stdio: {},
                },
                _meta: {
                  'darbotlabs/conformance': {
                    scenarioControl: true,
                  },
                },
              },
              _meta: {
                'darbotlabs/conformance': {
                  scenarioControl: true,
                },
              },
            },
            info: {
              name: 'darbotlm-acp-reference',
              title: 'DarbotLM ACP Reference Agent',
              version: '0.1.0',
            },
            authMethods: [],
          };
    await this.sendSuccess(message.id, 'initialize', result);
  }

  private async handleSessionNew(message: JsonRpcRequest): Promise<void> {
    const params = message.params as Record<string, JsonValue>;
    const sessionId = `sess_ref_${String(this.nextSessionId++).padStart(4, '0')}`;
    const cwd = params.cwd as string;
    this.sessions.set(sessionId, {
      sessionId,
      cwd,
      title: null,
      updatedAt: isoNow(),
      history: [],
      scenario: null,
    });
    if (this.version === 1 && this.hasFault('timeout-v1-session-new')) {
      return;
    }
    if (this.version === 1 && (this.hasFault('omit-v1-session-new-session-id') || this.hasFault('wrong-type-v1-session-new-session-id'))) {
      await this.emitMessage({
        jsonrpc: '2.0',
        id: message.id,
        result: this.v1SessionNewResult(sessionId),
      });
      return;
    }
    const result = this.version === 1 ? this.v1SessionNewResult(sessionId) : { sessionId };
    await this.sendSuccess(message.id, 'session/new', result);
  }

  private async handleSessionLoad(message: JsonRpcRequest): Promise<void> {
    if (this.version !== 1) {
      await this.sendError(message.id, -32601, 'Method not found');
      return;
    }
    const params = message.params as Record<string, JsonValue>;
    const session = this.sessions.get(params.sessionId as string);
    if (!session) {
      await this.sendError(message.id, -32002, 'Resource not found');
      return;
    }
    for (const entry of session.history) {
      await this.sendNotification('session/update', {
        sessionId: session.sessionId,
        update: {
          sessionUpdate: entry.role === 'user' ? 'user_message_chunk' : 'agent_message_chunk',
          messageId: entry.messageId,
          content: entry.content[0],
        },
      });
    }
    await this.sendSuccess(message.id, 'session/load', {});
  }

  private async handleSessionList(message: JsonRpcRequest): Promise<void> {
    const sessions = [...this.sessions.values()].map((session) => ({
      sessionId: session.sessionId,
      cwd: session.cwd,
      title: session.title,
      updatedAt: session.updatedAt,
    }));
    await this.sendSuccess(message.id, 'session/list', { sessions });
  }

  private async handleSessionResume(message: JsonRpcRequest): Promise<void> {
    const params = message.params as Record<string, JsonValue>;
    const session = this.sessions.get(params.sessionId as string);
    if (!session) {
      await this.sendError(message.id, -32002, 'Resource not found');
      return;
    }

    if (this.version === 1) {
      await this.sendSuccess(message.id, 'session/resume', {});
      return;
    }

    const replayFrom = params.replayFrom as Record<string, JsonValue> | undefined | null;
    if (replayFrom && replayFrom.type === 'start') {
      for (const entry of session.history) {
        await this.sendNotification('session/update', {
          sessionId: session.sessionId,
          update: {
            sessionUpdate: entry.role === 'user' ? 'user_message' : 'agent_message',
            messageId: entry.messageId,
            content: entry.content,
          },
        });
      }
    }
    await this.sendSuccess(message.id, 'session/resume', {});
  }

  private async handleSessionClose(message: JsonRpcRequest): Promise<void> {
    const params = message.params as Record<string, JsonValue>;
    const sessionId = params.sessionId as string;
    this.promptContexts.delete(sessionId);
    await this.sendSuccess(message.id, 'session/close', {});
  }

  private async handlePrompt(message: JsonRpcRequest): Promise<void> {
    const params = message.params as Record<string, JsonValue>;
    const sessionId = params.sessionId as string;
    const session = this.sessions.get(sessionId);
    if (!session) {
      await this.sendError(message.id, -32002, 'Resource not found');
      return;
    }

    const promptText = firstTextBlock(params.prompt);
    session.updatedAt = isoNow();
    session.title ??= promptText || 'Conformance session';

    const context: PromptContext = {
      sessionId,
      v1RequestId: this.version === 1 ? message.id : undefined,
      cancelled: false,
    };
    this.promptContexts.set(sessionId, context);

    if (this.version === 2) {
      await this.sendSuccess(message.id, 'session/prompt', {});
      void this.runPromptFlow(session, context, params.prompt as JsonValue[]);
    } else {
      await this.runPromptFlow(session, context, params.prompt as JsonValue[]);
    }
  }

  private async runPromptFlow(session: SessionRecord, context: PromptContext, prompt: JsonValue[]): Promise<void> {
    const scenario = session.scenario;
    if (scenario === 'v1-full-turn' || scenario === 'v1-permission-reject' || scenario === 'v1-permission-cancel') {
      await this.runV1ScenarioPrompt(session, context, prompt, scenario);
      return;
    }
    if (scenario === 'v2-full-turn' || scenario === 'v2-cancel') {
      await this.runV2ScenarioPrompt(session, context, prompt, scenario);
      return;
    }
    if (this.version === 1) {
      await this.runDefaultV1Prompt(session, context, prompt);
      return;
    }
    await this.runDefaultV2Prompt(session, context, prompt);
  }

  private async runDefaultV1Prompt(session: SessionRecord, context: PromptContext, prompt: JsonValue[]): Promise<void> {
    const userMessageId = this.newMessageId('user');
    const agentMessageId = this.newMessageId('agent');
    const promptText = firstTextBlock(prompt);
    session.history.push({ role: 'user', messageId: userMessageId, content: [{ type: 'text', text: promptText }] });
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'user_message_chunk',
        messageId: userMessageId,
        content: {
          type: 'text',
          text: promptText,
        },
      },
    });
    const agentText = `Echo: ${promptText}`;
    session.history.push({ role: 'agent', messageId: agentMessageId, content: [{ type: 'text', text: agentText }] });
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'agent_message_chunk',
        messageId: agentMessageId,
        content: {
          type: 'text',
          text: agentText,
        },
      },
    });
    await this.respondV1Prompt(session.sessionId, context.v1RequestId!, 'end_turn');
  }

  private async runDefaultV2Prompt(session: SessionRecord, context: PromptContext, prompt: JsonValue[]): Promise<void> {
    const userMessageId = this.newMessageId('user');
    const agentMessageId = this.newMessageId('agent');
    const promptText = firstTextBlock(prompt);
    session.history.push({ role: 'user', messageId: userMessageId, content: [{ type: 'text', text: promptText }] });
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'user_message',
        messageId: userMessageId,
        content: [{ type: 'text', text: promptText }],
      },
    });
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'state_update',
        state: 'running',
      },
    });
    const agentText = `Echo: ${promptText}`;
    session.history.push({ role: 'agent', messageId: agentMessageId, content: [{ type: 'text', text: agentText }] });
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'agent_message',
        messageId: agentMessageId,
        content: [{ type: 'text', text: agentText }],
      },
    });
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'state_update',
        state: 'idle',
        stopReason: 'end_turn',
      },
    });
  }

  private async runV1ScenarioPrompt(
    session: SessionRecord,
    context: PromptContext,
    prompt: JsonValue[],
    scenario: string,
  ): Promise<void> {
    const promptText = firstTextBlock(prompt);
    const userMessageId = this.newMessageId('user');
    const agentMessageId = this.newMessageId('agent');
    const toolCallId = `call_${String(this.nextToolCallId++).padStart(3, '0')}`;
    session.history.push({ role: 'user', messageId: userMessageId, content: [{ type: 'text', text: promptText }] });

    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'user_message_chunk',
        messageId: userMessageId,
        content: {
          type: 'text',
          text: promptText,
        },
      },
    });

    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'tool_call',
        toolCallId,
        title: 'Inspect workspace',
        kind: 'read',
        status: 'pending',
      },
    });

    const permissionResponse = await this.requestClient('session/request_permission', {
      sessionId: session.sessionId,
      toolCall: {
        toolCallId,
        title: 'Inspect workspace',
        kind: 'read',
        status: 'pending',
      },
      options: [
        {
          optionId: 'allow-once',
          name: 'Allow once',
          kind: 'allow_once',
        },
        {
          optionId: 'reject-once',
          name: 'Reject',
          kind: 'reject_once',
        },
      ],
    });

    if (this.hasFault('midturn-bad-update-v1')) {
      await this.emitInvalidV1SessionUpdate(session.sessionId);
      return;
    }

    if ('error' in permissionResponse) {
      await this.respondV1Prompt(session.sessionId, context.v1RequestId!, 'cancelled');
      return;
    }

    const outcome = (permissionResponse.result as Record<string, JsonValue>).outcome as Record<string, JsonValue>;
    const selectedOption = outcome.optionId;
    const permissionState = outcome.outcome;

    if (scenario === 'v1-permission-cancel' || context.cancelled || permissionState === 'cancelled') {
      await this.respondV1Prompt(session.sessionId, context.v1RequestId!, 'cancelled');
      return;
    }

    if (selectedOption === 'reject-once' || scenario === 'v1-permission-reject') {
      const denialText = 'Permission rejected by the client.';
      session.history.push({ role: 'agent', messageId: agentMessageId, content: [{ type: 'text', text: denialText }] });
      await this.sendNotification('session/update', {
        sessionId: session.sessionId,
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId,
          status: 'completed',
          content: [
            {
              type: 'content',
              content: {
                type: 'text',
                text: denialText,
              },
            },
          ],
        },
      });
      await this.sendNotification('session/update', {
        sessionId: session.sessionId,
        update: {
          sessionUpdate: 'agent_message_chunk',
          messageId: agentMessageId,
          content: {
            type: 'text',
            text: denialText,
          },
        },
      });
      await this.respondV1Prompt(session.sessionId, context.v1RequestId!, 'end_turn');
      return;
    }

    const fileRead = await this.requestClient('fs/read_text_file', {
      sessionId: session.sessionId,
      path: 'C:/workspace/input.txt',
      line: 1,
      limit: 20,
    });
    const fileContents = 'result' in fileRead ? ((fileRead.result as Record<string, JsonValue>).content as string) : '';

    await this.requestClient('fs/write_text_file', {
      sessionId: session.sessionId,
      path: 'C:/workspace/output.txt',
      content: `Echoed by reference agent: ${fileContents}`,
    });

    const terminalCreate = await this.requestClient('terminal/create', {
      sessionId: session.sessionId,
      command: 'node',
      args: ['--version'],
      cwd: 'C:/workspace',
      outputByteLimit: 1024,
    });
    const terminalId = 'result' in terminalCreate ? ((terminalCreate.result as Record<string, JsonValue>).terminalId as string) : 'term_missing';

    await this.requestClient('terminal/output', {
      sessionId: session.sessionId,
      terminalId,
    });
    await this.requestClient('terminal/kill', {
      sessionId: session.sessionId,
      terminalId,
    });
    await this.requestClient('terminal/wait_for_exit', {
      sessionId: session.sessionId,
      terminalId,
    });
    await this.requestClient('terminal/release', {
      sessionId: session.sessionId,
      terminalId,
    });

    const elicitation = await this.requestClient('elicitation/create', {
      sessionId: session.sessionId,
      mode: 'form',
      message: 'Choose a review posture.',
      requestedSchema: {
        type: 'object',
        properties: {
          strategy: {
            type: 'string',
            enum: ['balanced', 'strict'],
          },
        },
        required: ['strategy'],
      },
    });
    const elicitationContent =
      'result' in elicitation ? ((elicitation.result as Record<string, JsonValue>).content as Record<string, JsonValue> | undefined) : undefined;
    const strategy = typeof elicitationContent?.strategy === 'string' ? elicitationContent.strategy : 'balanced';

    const finalText = `Completed v1 full turn with ${strategy} mode after reading ${fileContents}.`;
    session.history.push({ role: 'agent', messageId: agentMessageId, content: [{ type: 'text', text: finalText }] });
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'tool_call_update',
        toolCallId,
        status: 'completed',
        content: [
          {
            type: 'content',
            content: {
              type: 'text',
              text: finalText,
            },
          },
        ],
      },
    });
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'agent_message_chunk',
        messageId: agentMessageId,
        content: {
          type: 'text',
          text: finalText,
        },
      },
    });
    await this.respondV1Prompt(session.sessionId, context.v1RequestId!, 'end_turn');
  }

  private async runV2ScenarioPrompt(
    session: SessionRecord,
    context: PromptContext,
    prompt: JsonValue[],
    scenario: string,
  ): Promise<void> {
    const promptText = firstTextBlock(prompt);
    const userMessageId = this.newMessageId('user');
    const agentMessageId = this.newMessageId('agent');
    const toolCallId = `call_${String(this.nextToolCallId++).padStart(3, '0')}`;
    session.history.push({ role: 'user', messageId: userMessageId, content: [{ type: 'text', text: promptText }] });

    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'user_message',
        messageId: userMessageId,
        content: [{ type: 'text', text: promptText }],
      },
    });
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'state_update',
        state: 'running',
      },
    });

    if (scenario === 'v2-cancel') {
      for (let i = 0; i < 20 && !context.cancelled; i += 1) {
        await sleep(20);
      }
      await this.sendNotification('session/update', {
        sessionId: session.sessionId,
        update: {
          sessionUpdate: 'state_update',
          state: 'idle',
          stopReason: context.cancelled ? 'cancelled' : 'end_turn',
        },
      });
      return;
    }

    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'tool_call_update',
        toolCallId,
        title: 'Run deterministic protocol exercise',
        kind: 'execute',
        status: 'pending',
      },
    });

    const permissionResponse = await this.requestClient('session/request_permission', {
      sessionId: session.sessionId,
      title: 'Approve deterministic terminal exercise?',
      description: 'Allow the reference agent to emit a display-only terminal transcript.',
      options: [
        {
          optionId: 'allow-once',
          name: 'Allow once',
          kind: 'allow_once',
        },
        {
          optionId: 'reject-once',
          name: 'Reject',
          kind: 'reject_once',
        },
      ],
    });

    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'state_update',
        state: 'requires_action',
      },
    });

    if ('error' in permissionResponse) {
      await this.sendNotification('session/update', {
        sessionId: session.sessionId,
        update: {
          sessionUpdate: 'state_update',
          state: 'idle',
          stopReason: 'cancelled',
        },
      });
      return;
    }

    const outcome = (permissionResponse.result as Record<string, JsonValue>).outcome as Record<string, JsonValue>;
    if (outcome.outcome === 'cancelled' || context.cancelled) {
      await this.sendNotification('session/update', {
        sessionId: session.sessionId,
        update: {
          sessionUpdate: 'state_update',
          state: 'idle',
          stopReason: 'cancelled',
        },
      });
      return;
    }

    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'state_update',
        state: 'running',
      },
    });

    if (this.hasFault('illegal-v2-fs-read-text-file')) {
      await this.emitMessage({
        jsonrpc: '2.0',
        id: this.nextAgentRequestId++,
        method: 'fs/read_text_file',
        params: {
          sessionId: session.sessionId,
          path: 'C:/workspace/should-not-exist.txt',
        },
      });
      return;
    }

    const terminalId = `term_${String(this.nextTerminalId++).padStart(3, '0')}`;
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'terminal_update',
        terminalId,
        command: 'cargo test',
        cwd: 'C:/workspace',
        output: {
          data: base64('running tests\n'),
        },
      },
    });
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'terminal_output_chunk',
        terminalId,
        data: base64('all tests passed\n'),
      },
    });

    const elicitation = await this.requestClient('elicitation/create', {
      sessionId: session.sessionId,
      mode: 'form',
      message: 'Choose the summary tone.',
      requestedSchema: {
        type: 'object',
        properties: {
          tone: {
            type: 'string',
            enum: ['formal', 'direct'],
          },
        },
        required: ['tone'],
      },
    });
    const elicitationContent =
      'result' in elicitation ? ((elicitation.result as Record<string, JsonValue>).content as Record<string, JsonValue> | undefined) : undefined;
    const tone = typeof elicitationContent?.tone === 'string' ? elicitationContent.tone : 'formal';

    const finalText = `Completed v2 full turn in ${tone} mode.`;
    session.history.push({ role: 'agent', messageId: agentMessageId, content: [{ type: 'text', text: finalText }] });
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'agent_message',
        messageId: agentMessageId,
        content: [{ type: 'text', text: finalText }],
      },
    });
    await this.sendNotification('session/update', {
      sessionId: session.sessionId,
      update: {
        sessionUpdate: 'state_update',
        state: 'idle',
        stopReason: 'end_turn',
      },
    });
  }

  private async handleExtensionRequest(message: JsonRpcRequest): Promise<void> {
    switch (message.method) {
      case '_conformance/echo':
        await this.sendSuccess(message.id, '_conformance/echo', {
          echoed: message.params ?? null,
        });
        return;
      case '_conformance/set_scenario': {
        const params = (message.params ?? {}) as Record<string, JsonValue>;
        const session = this.sessions.get(params.sessionId as string);
        if (!session) {
          await this.sendError(message.id, -32002, 'Resource not found');
          return;
        }
        session.scenario = params.scenario as string;
        await this.sendSuccess(message.id, '_conformance/set_scenario', {
          ok: true,
          scenario: session.scenario,
        });
        return;
      }
      case '_conformance/slow': {
        const timer = setTimeout(async () => {
          this.pendingSlowCalls.delete(message.id);
          await this.sendSuccess(message.id, '_conformance/slow', {
            completed: true,
          });
        }, 5_000);
        this.pendingSlowCalls.set(message.id, timer);
        return;
      }
      default:
        await this.sendError(message.id, -32601, 'Method not found');
    }
  }

  private async requestClient(method: string, params: Record<string, JsonValue>): Promise<JsonRpcSuccessResponse | JsonRpcErrorResponse> {
    const id = this.nextAgentRequestId++;
    const message: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };
    if (this.version) {
      this.schema.validateOutbound(this.version, 'agent', message, JSON.stringify(message));
    }
    await this.emitMessage(message);
    return new Promise<JsonRpcSuccessResponse | JsonRpcErrorResponse>((resolve, reject) => {
      this.pendingClientCalls.set(id, { method, resolve, reject });
    });
  }

  private async sendNotification(method: string, params: Record<string, JsonValue>): Promise<void> {
    const message: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };
    if (this.version) {
      this.schema.validateOutbound(this.version, 'agent', message, JSON.stringify(message));
    }
    await this.emitMessage(message);
  }

  private async sendSuccess(id: string | number, method: string, result: Record<string, JsonValue> | JsonValue[]): Promise<void> {
    const message: JsonRpcSuccessResponse = {
      jsonrpc: '2.0',
      id,
      result: result as JsonValue,
    };
    if (this.version) {
      this.schema.validateOutbound(this.version, 'agent', message, JSON.stringify(message), method);
    }
    await this.emitMessage(message);
  }

  private async sendError(id: string | number | null, code: number, message: string): Promise<void> {
    const payload: JsonRpcErrorResponse = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    };
    await this.emitMessage(payload);
  }

  private async emitMessage(message: JsonRpcMessage): Promise<void> {
    this.emitStdout(JSON.stringify(message));
  }

  private async respondV1Prompt(sessionId: string, requestId: string | number, stopReason: 'end_turn' | 'cancelled'): Promise<void> {
    if (this.hasFault('omit-v1-prompt-stop-reason')) {
      await this.emitMessage({
        jsonrpc: '2.0',
        id: requestId,
        result: {},
      });
    } else {
      await this.sendSuccess(requestId, 'session/prompt', { stopReason });
    }

    if (this.hasFault('trailing-bad-update-v1')) {
      await this.emitInvalidV1SessionUpdate(sessionId);
    }
  }

  private async emitInvalidV1SessionUpdate(sessionId: string): Promise<void> {
    await this.emitMessage({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 12345,
      },
    });
  }

  private v1SessionNewResult(sessionId: string): Record<string, JsonValue> {
    if (this.hasFault('omit-v1-session-new-session-id')) {
      return {
        modes: null,
        configOptions: null,
      };
    }
    if (this.hasFault('wrong-type-v1-session-new-session-id')) {
      return {
        sessionId: 12345,
        modes: null,
        configOptions: null,
      };
    }
    return {
      sessionId,
      modes: null,
      configOptions: null,
    };
  }

  private extractRequestedVersion(params: JsonValue | undefined): ProtocolVersion | undefined {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
      return undefined;
    }
    const value = (params as Record<string, JsonValue>).protocolVersion;
    return value === 1 || value === 2 ? value : undefined;
  }

  private newMessageId(prefix: 'user' | 'agent'): string {
    return `msg_${prefix}_${String(this.nextMessageId++).padStart(4, '0')}`;
  }

  private hasFault(fault: ReferenceFault): boolean {
    return this.faults.has(fault);
  }

  private knownMethodsForVersion(version: ProtocolVersion): Set<string> {
    return version === 1
      ? new Set(['session/new', 'session/load', 'session/list', 'session/resume', 'session/close', 'session/prompt'])
      : new Set(['session/new', 'session/list', 'session/resume', 'session/close', 'session/prompt']);
  }
}
