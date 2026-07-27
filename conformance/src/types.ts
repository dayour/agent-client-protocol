export type ProtocolVersion = 1 | 2;
export type SenderRole = 'client' | 'agent';
export type TransportKind = 'stdio' | 'in-process';
export type CaseStatus = 'passed' | 'failed' | 'skipped';

export type JsonPrimitive = null | boolean | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: JsonValue;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: JsonValue;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result: JsonValue;
}

export interface JsonRpcErrorBody {
  code: number;
  message: string;
  data?: JsonValue;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: JsonRpcErrorBody;
}

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcSuccessResponse
  | JsonRpcErrorResponse;

export interface TranscriptEntry {
  timestamp: string;
  direction: 'client->agent' | 'agent->client' | 'stderr';
  raw: string;
  parsed?: unknown;
}

export interface ValidationFailure {
  method: string;
  direction: 'client-to-agent' | 'agent-to-client';
  path: string;
  expected: string;
  actual: string;
  rawMessage: string;
}

export interface CaseFailure {
  message: string;
  details?: ValidationFailure;
}

export interface CaseResult {
  id: string;
  title: string;
  protocolVersion: ProtocolVersion;
  status: CaseStatus;
  durationMs: number;
  notes: string[];
  failure?: CaseFailure;
}

export interface RunSummary {
  target: string;
  driver: TransportKind;
  requestedVersions: ProtocolVersion[];
  actualVersions: ProtocolVersion[];
  startedAt: string;
  finishedAt: string;
  passed: number;
  failed: number;
  skipped: number;
  cases: CaseResult[];
}

export interface BuildSpec {
  command?: string;
  output: string;
  sources: string[];
  cwd?: string;
}

export interface TargetSpec {
  name: string;
  driver: TransportKind;
  requestedVersions: ProtocolVersion[];
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  build?: BuildSpec;
  referenceMode?: 'good' | 'bad';
}

export interface ConformanceCaseContext {
  target: TargetSpec;
  version: ProtocolVersion;
}

export interface ScenarioSupport {
  available: boolean;
  source: string;
}

export interface InitializeArtifacts {
  response: JsonRpcSuccessResponse;
  scenarioSupport: ScenarioSupport;
}

export interface ConformanceCase {
  id: string;
  title: string;
  versions: ProtocolVersion[];
  driverSupport?: TransportKind[];
  requiresScenario?: boolean;
  run(ctx: import('./driver.js').HarnessConnection, meta: ConformanceCaseContext): Promise<void>;
}
