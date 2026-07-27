import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';

import fg from 'fast-glob';

import { SchemaRegistry } from './schema.js';
import type {
  JsonRpcErrorBody,
  JsonRpcErrorResponse,
  JsonRpcMessage,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  ProtocolVersion,
  SenderRole,
  TargetSpec,
  TranscriptEntry,
  TransportKind,
} from './types.js';
import { isoNow, packageRoot, resolveMaybeRelative } from './utils.js';

import { createReferenceInProcessTransport } from './reference-agent.js';

interface Transport {
  readonly kind: TransportKind;
  start(onStdout: (line: string) => void, onStderr: (line: string) => void, onFatal: (error: Error) => void): Promise<void>;
  sendLine(line: string): Promise<void>;
  close(): Promise<void>;
}

interface PendingResponse {
  method: string;
  requestId: string | number;
  timeout: NodeJS.Timeout;
  resolve: (message: JsonRpcSuccessResponse | JsonRpcErrorResponse) => void;
  reject: (error: Error) => void;
}

interface EventWaiter {
  predicate: (message: JsonRpcRequest | JsonRpcNotification) => boolean;
  resolve: (message: JsonRpcRequest | JsonRpcNotification) => void;
  reject: (error: Error) => void;
}

interface ResponseWaiter {
  predicate: (message: JsonRpcSuccessResponse | JsonRpcErrorResponse) => boolean;
  resolve: (message: JsonRpcSuccessResponse | JsonRpcErrorResponse) => void;
  reject: (error: Error) => void;
}

export interface ExpectOptions {
  timeoutMs?: number;
}

export class HarnessConnection {
  private readonly schema = new SchemaRegistry();
  private readonly transcript: TranscriptEntry[] = [];
  private readonly pendingResponses = new Map<string | number, PendingResponse>();
  private readonly queuedEvents: Array<JsonRpcRequest | JsonRpcNotification> = [];
  private readonly waiters: EventWaiter[] = [];
  private readonly queuedUnmatchedResponses: Array<JsonRpcSuccessResponse | JsonRpcErrorResponse> = [];
  private readonly responseWaiters: ResponseWaiter[] = [];
  private nextId = 1;
  private closed = false;
  private fatalError?: Error;
  private readonly requestTimeoutMs: number;

  constructor(
    readonly target: TargetSpec,
    readonly version: ProtocolVersion,
    private readonly transport: Transport,
  ) {
    this.requestTimeoutMs = target.requestTimeoutMs ?? 5_000;
  }

  async start(): Promise<void> {
    await this.transport.start(
      (line) => this.handleStdout(line),
      (line) => {
        this.transcript.push({ timestamp: isoNow(), direction: 'stderr', raw: line });
      },
      (error) => {
        this.failAll(error);
      },
    );
  }

  getTranscript(): TranscriptEntry[] {
    return [...this.transcript];
  }

  async request(method: string, params: unknown, options: { raw?: boolean } = {}): Promise<JsonRpcSuccessResponse | JsonRpcErrorResponse> {
    this.throwIfFatal();
    const pending = await this.requestWithId(method, params, options);
    return pending.response;
  }

  async requestWithId(
    method: string,
    params: unknown,
    options: { raw?: boolean } = {},
  ): Promise<{ id: string | number; response: Promise<JsonRpcSuccessResponse | JsonRpcErrorResponse> }> {
    this.throwIfFatal();
    const id = this.nextId++;
    const message: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params: params as never,
    };
    const raw = JSON.stringify(message);
    if (!options.raw) {
      this.schema.validateOutbound(this.version, 'client', message, raw);
    }
    this.transcript.push({ timestamp: isoNow(), direction: 'client->agent', raw, parsed: message });
    const responsePromise = new Promise<JsonRpcSuccessResponse | JsonRpcErrorResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(id);
        reject(new Error(`No response within ${this.requestTimeoutMs}ms for ${method} request id ${String(id)}`));
      }, this.requestTimeoutMs);
      this.pendingResponses.set(id, { method, requestId: id, timeout, resolve, reject });
    });
    try {
      await this.transport.sendLine(raw);
    } catch (error) {
      const pending = this.pendingResponses.get(id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingResponses.delete(id);
        pending.reject(error as Error);
      }
      throw error;
    }
    return { id, response: responsePromise };
  }

  async notify(method: string, params: unknown, options: { raw?: boolean } = {}): Promise<void> {
    this.throwIfFatal();
    const message: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params: params as never,
    };
    const raw = JSON.stringify(message);
    if (!options.raw) {
      this.schema.validateOutbound(this.version, 'client', message, raw);
    }
    this.transcript.push({ timestamp: isoNow(), direction: 'client->agent', raw, parsed: message });
    await this.transport.sendLine(raw);
  }

  async sendRawLine(line: string): Promise<void> {
    this.throwIfFatal();
    this.transcript.push({ timestamp: isoNow(), direction: 'client->agent', raw: line });
    await this.transport.sendLine(line);
  }

  async respondSuccess(id: string | number | null, method: string, result: unknown): Promise<void> {
    this.throwIfFatal();
    const message: JsonRpcSuccessResponse = {
      jsonrpc: '2.0',
      id,
      result: result as never,
    };
    const raw = JSON.stringify(message);
    this.schema.validateOutbound(this.version, 'client', message, raw, method);
    this.transcript.push({ timestamp: isoNow(), direction: 'client->agent', raw, parsed: message });
    await this.transport.sendLine(raw);
  }

  async respondError(id: string | number | null, error: JsonRpcErrorBody): Promise<void> {
    this.throwIfFatal();
    const message: JsonRpcErrorResponse = {
      jsonrpc: '2.0',
      id,
      error,
    };
    const raw = JSON.stringify(message);
    this.schema.genericErrorResponse(this.version, message, raw);
    this.transcript.push({ timestamp: isoNow(), direction: 'client->agent', raw, parsed: message });
    await this.transport.sendLine(raw);
  }

  async expectRequest(method: string, options: ExpectOptions = {}): Promise<JsonRpcRequest> {
    return this.expectEvent((message) => 'id' in message && message.method === method, options) as Promise<JsonRpcRequest>;
  }

  async expectNotification(method: string, options: ExpectOptions = {}): Promise<JsonRpcNotification> {
    return this.expectEvent((message) => !('id' in message) && message.method === method, options) as Promise<JsonRpcNotification>;
  }

  async expectAnyEvent(options: ExpectOptions = {}): Promise<JsonRpcRequest | JsonRpcNotification> {
    return this.expectEvent(() => true, options);
  }

  async expectUnmatchedResponse(
    predicate: (message: JsonRpcSuccessResponse | JsonRpcErrorResponse) => boolean = () => true,
    options: ExpectOptions = {},
  ): Promise<JsonRpcSuccessResponse | JsonRpcErrorResponse> {
    this.throwIfFatal();
    const existingIndex = this.queuedUnmatchedResponses.findIndex(predicate);
    if (existingIndex >= 0) {
      return this.queuedUnmatchedResponses.splice(existingIndex, 1)[0];
    }
    return new Promise<JsonRpcSuccessResponse | JsonRpcErrorResponse>((resolve, reject) => {
      const waiter: ResponseWaiter = { predicate, resolve, reject };
      this.responseWaiters.push(waiter);
      const timeoutMs = options.timeoutMs ?? 8_000;
      const timer = setTimeout(() => {
        const index = this.responseWaiters.indexOf(waiter);
        if (index >= 0) {
          this.responseWaiters.splice(index, 1);
        }
        reject(new Error(`Timed out waiting for unmatched response after ${timeoutMs}ms`));
      }, timeoutMs);
      const originalResolve = waiter.resolve;
      waiter.resolve = (message) => {
        clearTimeout(timer);
        originalResolve(message);
      };
      const originalReject = waiter.reject;
      waiter.reject = (error) => {
        clearTimeout(timer);
        originalReject(error);
      };
    });
  }

  private async expectEvent(
    predicate: (message: JsonRpcRequest | JsonRpcNotification) => boolean,
    options: ExpectOptions,
  ): Promise<JsonRpcRequest | JsonRpcNotification> {
    this.throwIfFatal();
    const existingIndex = this.queuedEvents.findIndex(predicate);
    if (existingIndex >= 0) {
      return this.queuedEvents.splice(existingIndex, 1)[0];
    }
    return new Promise<JsonRpcRequest | JsonRpcNotification>((resolve, reject) => {
      const waiter: EventWaiter = { predicate, resolve, reject };
      this.waiters.push(waiter);
      const timeoutMs = options.timeoutMs ?? 8_000;
      const timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) {
          this.waiters.splice(index, 1);
        }
        reject(new Error(`Timed out waiting for transport event after ${timeoutMs}ms`));
      }, timeoutMs);
      const originalResolve = waiter.resolve;
      waiter.resolve = (message) => {
        clearTimeout(timer);
        originalResolve(message);
      };
      const originalReject = waiter.reject;
      waiter.reject = (error) => {
        clearTimeout(timer);
        originalReject(error);
      };
    });
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    for (const [, pending] of this.pendingResponses) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed before response arrived'));
    }
    this.pendingResponses.clear();
    for (const waiter of this.waiters.splice(0)) {
      waiter.reject(new Error('Connection closed before expected event arrived'));
    }
    for (const waiter of this.responseWaiters.splice(0)) {
      waiter.reject(new Error('Connection closed before expected response arrived'));
    }
    await this.transport.close();
  }

  private handleStdout(line: string): void {
    this.transcript.push({ timestamp: isoNow(), direction: 'agent->client', raw: line });
    let parsed: JsonRpcMessage;
    try {
      parsed = JSON.parse(line) as JsonRpcMessage;
    } catch (error) {
      this.failAll(new Error(`Target emitted non-JSON stdout: ${line}`));
      return;
    }
    this.transcript[this.transcript.length - 1].parsed = parsed;

    if ('method' in parsed) {
      try {
        this.schema.validateInbound(this.version, 'agent', parsed, line);
      } catch (error) {
        this.failAll(error as Error);
        return;
      }
      const waiterIndex = this.waiters.findIndex((waiter) => waiter.predicate(parsed));
      if (waiterIndex >= 0) {
        const [waiter] = this.waiters.splice(waiterIndex, 1);
        waiter.resolve(parsed);
      } else {
        this.queuedEvents.push(parsed);
      }
      return;
    }

    const id = parsed.id ?? 'null';
    const pending = this.pendingResponses.get(id as string | number);
    if (!pending) {
      const waiterIndex = this.responseWaiters.findIndex((waiter) => waiter.predicate(parsed));
      if (waiterIndex >= 0) {
        const [waiter] = this.responseWaiters.splice(waiterIndex, 1);
        waiter.resolve(parsed as JsonRpcSuccessResponse | JsonRpcErrorResponse);
      } else {
        this.queuedUnmatchedResponses.push(parsed as JsonRpcSuccessResponse | JsonRpcErrorResponse);
      }
      return;
    }
    try {
      this.schema.validateInbound(this.version, 'agent', parsed, line, pending.method);
    } catch (error) {
      this.pendingResponses.delete(id as string | number);
      clearTimeout(pending.timeout);
      pending.reject(error as Error);
      return;
    }
    this.pendingResponses.delete(id as string | number);
    clearTimeout(pending.timeout);
    pending.resolve(parsed as JsonRpcSuccessResponse | JsonRpcErrorResponse);
  }

  private failAll(error: Error): void {
    this.fatalError = error;
    for (const [, pending] of this.pendingResponses) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingResponses.clear();
    for (const waiter of this.waiters.splice(0)) {
      waiter.reject(error);
    }
    for (const waiter of this.responseWaiters.splice(0)) {
      waiter.reject(error);
    }
  }

  private throwIfFatal(): void {
    if (this.fatalError) {
      throw this.fatalError;
    }
  }
}

class StdioTransport implements Transport {
  readonly kind: TransportKind = 'stdio';

  private child?: ReturnType<typeof spawn>;

  constructor(private readonly target: TargetSpec) {}

  async start(onStdout: (line: string) => void, onStderr: (line: string) => void, onFatal: (error: Error) => void): Promise<void> {
    if (!this.target.command) {
      throw new Error('Missing command for stdio transport');
    }
    const child = spawn(this.target.command, this.target.args ?? [], {
      cwd: this.target.cwd,
      env: {
        ...process.env,
        ...this.target.env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });
    this.child = child;

    const stdoutRl = readline.createInterface({ input: child.stdout! });
    stdoutRl.on('line', onStdout);
    const stderrRl = readline.createInterface({ input: child.stderr! });
    stderrRl.on('line', onStderr);

    child.on('error', (error) => {
      onFatal(new Error(`target process error: ${error.message}`));
    });

    child.on('exit', (code, signal) => {
      onStderr(`target exited with code=${String(code)} signal=${String(signal)}`);
      if (code !== 0 && code !== null) {
        onFatal(new Error(`target exited with code=${String(code)} signal=${String(signal)}`));
      }
    });
  }

  async sendLine(line: string): Promise<void> {
    if (!this.child?.stdin) {
      throw new Error('stdio transport is not started');
    }
    await new Promise<void>((resolve, reject) => {
      this.child!.stdin!.write(`${line}\n`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    if (!this.child) {
      return;
    }
    this.child.stdin?.end();
    if (!this.child.killed) {
      this.child.kill();
    }
  }
}

class InProcessTransport implements Transport {
  readonly kind: TransportKind = 'in-process';
  private endpoint?: Awaited<ReturnType<typeof createReferenceInProcessTransport>>;
  private stdoutHandler?: (line: string) => void;
  private stderrHandler?: (line: string) => void;

  constructor(private readonly target: TargetSpec) {}

  async start(onStdout: (line: string) => void, onStderr: (line: string) => void, _onFatal: (error: Error) => void): Promise<void> {
    this.stdoutHandler = onStdout;
    this.stderrHandler = onStderr;
    this.endpoint = await createReferenceInProcessTransport(this.target.faults ?? [], onStdout, onStderr);
  }

  async sendLine(line: string): Promise<void> {
    if (!this.endpoint) {
      throw new Error('in-process transport is not started');
    }
    await this.endpoint.receive(line);
  }

  async close(): Promise<void> {
    await this.endpoint?.close();
  }
}

export async function prepareTarget(target: TargetSpec): Promise<TargetSpec> {
  const prepared: TargetSpec = {
    ...target,
    cwd: target.cwd ? resolveMaybeRelative(packageRoot, target.cwd) : packageRoot,
  };
  if (!prepared.build) {
    return prepared;
  }

  const buildCwd = prepared.build.cwd ? resolveMaybeRelative(packageRoot, prepared.build.cwd) : prepared.cwd!;
  const output = resolveMaybeRelative(buildCwd, prepared.build.output);
  const sourceFiles = await fg(prepared.build.sources, { cwd: buildCwd, absolute: true, onlyFiles: true });
  if (sourceFiles.length === 0) {
    throw new Error(`Build staleness check found no source files for ${prepared.name}`);
  }

  const isStale = await artifactIsStale(output, sourceFiles);
  if (isStale && prepared.build.command) {
    await runShellCommand(prepared.build.command, buildCwd, prepared.env ?? {});
  }

  const staleAfterBuild = await artifactIsStale(output, sourceFiles);
  if (staleAfterBuild) {
    throw new Error(
      `Refusing to run stale build artifact for ${prepared.name}: ${output} is older than one or more sources under ${buildCwd}`,
    );
  }

  return prepared;
}

async function artifactIsStale(output: string, sources: string[]): Promise<boolean> {
  let outputStat;
  try {
    outputStat = await fs.stat(output);
  } catch {
    return true;
  }
  const sourceStats = await Promise.all(sources.map((source) => fs.stat(source)));
  return sourceStats.some((stat) => stat.mtimeMs > outputStat.mtimeMs);
}

async function runShellCommand(command: string, cwd: string, env: Record<string, string>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'inherit',
      shell: true,
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build command failed with exit code ${String(code)}: ${command}`));
      }
    });
  });
}

export async function openConnection(target: TargetSpec, version: ProtocolVersion): Promise<HarnessConnection> {
  const transport: Transport = target.driver === 'stdio' ? new StdioTransport(target) : new InProcessTransport(target);
  const connection = new HarnessConnection(target, version, transport);
  await connection.start();
  return connection;
}
