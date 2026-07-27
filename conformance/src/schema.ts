import fs from 'node:fs';

import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import type { JsonRpcErrorResponse, JsonRpcMessage, JsonRpcNotification, JsonRpcRequest, JsonRpcSuccessResponse, ProtocolVersion, SenderRole, ValidationFailure } from './types.js';
import { repoRoot, stringifyValue } from './utils.js';

type MessageKind = 'request' | 'notification' | 'response';

interface MethodMaps {
  requestBySender: Record<SenderRole, Map<string, string>>;
  notificationBySender: Record<SenderRole, Map<string, string>>;
  responseBySender: Record<SenderRole, Map<string, string>>;
}

interface VersionSchemaState {
  schema: Record<string, unknown>;
  ajv: Ajv2020;
  methods: MethodMaps;
  validators: Map<string, ValidateFunction>;
}

const VERSIONS: ProtocolVersion[] = [1, 2];

export class SchemaRegistry {
  private readonly states = new Map<ProtocolVersion, VersionSchemaState>();

  constructor() {
    for (const version of VERSIONS) {
      const schemaPath = `${repoRoot}/schema/v${version}/schema.json`;
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as Record<string, unknown>;
      const ajv = new Ajv2020({
        allErrors: true,
        strict: false,
        allowUnionTypes: true,
      });
      addFormats(ajv);
      for (const format of ['uint16', 'uint32', 'uint64', 'int32']) {
        ajv.addFormat(format, true);
      }
      ajv.addSchema(schema, `acp-v${version}`);
      this.states.set(version, {
        schema,
        ajv,
        methods: this.indexMethods(schema),
        validators: new Map<string, ValidateFunction>(),
      });
    }
  }

  validateOutbound(version: ProtocolVersion, sender: SenderRole, message: JsonRpcMessage, raw: string, responseMethod?: string): void {
    this.validate(version, sender, message, raw, responseMethod);
  }

  validateInbound(version: ProtocolVersion, sender: SenderRole, message: JsonRpcMessage, raw: string, responseMethod?: string): void {
    this.validate(version, sender, message, raw, responseMethod);
  }

  genericErrorResponse(version: ProtocolVersion, message: JsonRpcErrorResponse, raw: string): void {
    const state = this.state(version);
    const validator = this.memoizedValidator(
      state,
      'generic-error-response',
      {
        $ref: this.defRef(version, 'AgentResponse'),
      },
    );
    if (!validator(message)) {
      throw this.validationError(version, 'jsonrpc-error', 'agent-to-client', validator.errors ?? [], raw, message);
    }
  }

  private validate(version: ProtocolVersion, sender: SenderRole, message: JsonRpcMessage, raw: string, responseMethod?: string): void {
    const direction = sender === 'client' ? 'client-to-agent' : 'agent-to-client';
    const kind = this.classifyMessage(message);
    const state = this.state(version);
    const key = this.validatorKey(version, sender, kind, message, responseMethod);
    const validator = this.memoizedValidator(state, key, this.buildEnvelopeSchema(version, sender, kind, message, responseMethod));
    if (!validator(message)) {
      const method = kind === 'response' ? responseMethod ?? 'unknown-response' : (message as JsonRpcRequest | JsonRpcNotification).method;
      throw this.validationError(version, method, direction, validator.errors ?? [], raw, message);
    }
  }

  private classifyMessage(message: JsonRpcMessage): MessageKind {
    if ('method' in message) {
      return 'id' in message ? 'request' : 'notification';
    }
    return 'response';
  }

  private buildEnvelopeSchema(
    version: ProtocolVersion,
    sender: SenderRole,
    kind: MessageKind,
    message: JsonRpcMessage,
    responseMethod?: string,
  ): Record<string, unknown> {
    const state = this.state(version);
    if (kind === 'response') {
      if ('error' in message) {
        return {
          type: 'object',
          properties: {
            jsonrpc: { const: '2.0' },
            id: {
              anyOf: [{ $ref: this.defRef(version, 'RequestId') }, { type: 'null' }],
            },
            error: {
              type: 'object',
              properties: {
                code: { type: 'integer' },
                message: { type: 'string' },
                data: {},
              },
              required: ['code', 'message'],
            },
          },
          required: ['jsonrpc', 'id', 'error'],
          additionalProperties: false,
        };
      }
      const method = responseMethod;
      if (!method) {
        throw new Error('Missing response method context for schema validation');
      }
      const defName = state.methods.responseBySender[sender].get(method) ?? 'ExtResponse';
      return {
        type: 'object',
        properties: {
          jsonrpc: { const: '2.0' },
          id: { $ref: this.defRef(version, 'RequestId') },
          result: defName === 'ExtResponse' ? {} : { $ref: this.defRef(version, defName) },
        },
        required: ['jsonrpc', 'id', 'result'],
        additionalProperties: false,
      };
    }

    const requestLike = message as JsonRpcRequest | JsonRpcNotification;
    const method = requestLike.method;
    const isExtension = method.startsWith('_');
    const isProtocolLevel = method.startsWith('$/');
    const map = kind === 'request' ? state.methods.requestBySender[sender] : state.methods.notificationBySender[sender];
    const defName = map.get(method);

    if (!defName && !isExtension && !isProtocolLevel) {
      return {
        type: 'object',
        properties: {
          jsonrpc: { const: '2.0' },
          method: { const: '__method_not_allowed__' },
        },
        required: ['jsonrpc', 'method'],
        additionalProperties: true,
      };
    }

    const paramsSchema =
      defName && defName !== 'ExtRequest' && defName !== 'ExtNotification'
        ? { $ref: this.defRef(version, defName) }
        : {};

    const properties: Record<string, unknown> = {
      jsonrpc: { const: '2.0' },
      method: isExtension
        ? { type: 'string', pattern: '^_' }
        : { const: method },
      params: paramsSchema,
    };

    const required = ['jsonrpc', 'method'];
    if (kind === 'request') {
      properties.id = { $ref: this.defRef(version, 'RequestId') };
      required.push('id');
    }

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    };
  }

  private validatorKey(version: ProtocolVersion, sender: SenderRole, kind: MessageKind, message: JsonRpcMessage, responseMethod?: string): string {
    if (kind === 'response') {
      return `${version}:${sender}:${kind}:${responseMethod ?? 'unknown'}:${'error' in message ? 'error' : 'success'}`;
    }
    return `${version}:${sender}:${kind}:${(message as JsonRpcRequest | JsonRpcNotification).method}`;
  }

  private memoizedValidator(state: VersionSchemaState, key: string, schema: Record<string, unknown>): ValidateFunction {
    const existing = state.validators.get(key);
    if (existing) {
      return existing;
    }
    const validator = state.ajv.compile(schema);
    state.validators.set(key, validator);
    return validator;
  }

  private state(version: ProtocolVersion): VersionSchemaState {
    const state = this.states.get(version);
    if (!state) {
      throw new Error(`Unsupported schema version ${version}`);
    }
    return state;
  }

  private defRef(version: ProtocolVersion, defName: string): string {
    return `acp-v${version}#/$defs/${defName}`;
  }

  private indexMethods(schema: Record<string, unknown>): MethodMaps {
    const defs = (schema.$defs ?? {}) as Record<string, Record<string, unknown>>;
    const methods: MethodMaps = {
      requestBySender: { client: new Map(), agent: new Map() },
      notificationBySender: { client: new Map(), agent: new Map() },
      responseBySender: { client: new Map(), agent: new Map() },
    };

    for (const [defName, def] of Object.entries(defs)) {
      const method = typeof def['x-method'] === 'string' ? (def['x-method'] as string) : undefined;
      const side = def['x-side'];
      if (!method) {
        continue;
      }

      if (defName.endsWith('Request') && (side === 'client' || side === 'agent')) {
        methods.requestBySender[side === 'agent' ? 'client' : 'agent'].set(method, defName);
      } else if (defName.endsWith('Response') && (side === 'client' || side === 'agent')) {
        methods.responseBySender[side].set(method, defName);
      } else if (defName.endsWith('Notification')) {
        if (method.startsWith('$/')) {
          methods.notificationBySender.client.set(method, defName);
          methods.notificationBySender.agent.set(method, defName);
        } else if (side === 'client' || side === 'agent') {
          methods.notificationBySender[side === 'agent' ? 'client' : 'agent'].set(method, defName);
        }
      }
    }

    return methods;
  }

  private validationError(
    version: ProtocolVersion,
    method: string,
    direction: 'client-to-agent' | 'agent-to-client',
    errors: ErrorObject[],
    raw: string,
    message: unknown,
  ): Error & { details: ValidationFailure } {
    const first = errors[0];
    const path = first?.instancePath || '/';
    const expected = this.describeExpected(version, method, first, message);
    const details: ValidationFailure = {
      method,
      direction,
      path,
      expected,
      actual: stringifyValue(path === '/' ? message : this.lookup(message, path)),
      rawMessage: raw,
    };
    const error = new Error(`[${direction}] ${method} failed schema validation at ${path}: expected ${details.expected}, got ${details.actual}`) as Error & {
      details: ValidationFailure;
    };
    error.details = details;
    return error;
  }

  private describeExpected(version: ProtocolVersion, method: string, error: ErrorObject | undefined, message: unknown): string {
    if (!error) {
      return 'schema match';
    }
    if (
      error.keyword === 'const' &&
      (error.params as { allowedValue?: unknown }).allowedValue === '__method_not_allowed__' &&
      method !== '__method_not_allowed__'
    ) {
      const actualMethod =
        message && typeof message === 'object' && 'method' in (message as Record<string, unknown>)
          ? String((message as Record<string, unknown>).method)
          : method;
      return `method "${actualMethod}" is not part of protocol v${version}`;
    }
    switch (error.keyword) {
      case 'required':
        return `required property ${(error.params as { missingProperty: string }).missingProperty}`;
      case 'type':
        return `type ${(error.params as { type: string }).type}`;
      case 'const':
        return `const ${JSON.stringify((error.params as { allowedValue: unknown }).allowedValue)}`;
      case 'enum':
        return `one of ${JSON.stringify((error.params as { allowedValues: unknown[] }).allowedValues)}`;
      case 'pattern':
        return `pattern ${(error.params as { pattern: string }).pattern}`;
      case 'additionalProperties':
        return `no additional property ${(error.params as { additionalProperty: string }).additionalProperty}`;
      default:
        return error.message ?? error.keyword;
    }
  }

  private lookup(message: unknown, path: string): unknown {
    if (!path || path === '/') {
      return message;
    }
    const parts = path.split('/').slice(1).map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
    let current: unknown = message;
    for (const part of parts) {
      if (Array.isArray(current)) {
        current = current[Number(part)];
      } else if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  }
}
