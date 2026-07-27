import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { JsonValue, ValidationFailure } from './types.js';

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const repoRoot = path.resolve(packageRoot, '..');

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function assert(condition: unknown, message: string, details?: ValidationFailure): asserts condition {
  if (!condition) {
    const error = new Error(message) as Error & { details?: ValidationFailure };
    error.details = details;
    throw error;
  }
}

export function firstTextBlock(prompt: JsonValue | undefined): string {
  if (!Array.isArray(prompt)) {
    return '';
  }
  for (const block of prompt) {
    if (block && typeof block === 'object' && !Array.isArray(block)) {
      const maybeType = (block as Record<string, JsonValue>).type;
      if (maybeType === 'text') {
        const text = (block as Record<string, JsonValue>).text;
        if (typeof text === 'string') {
          return text;
        }
      }
    }
  }
  return '';
}

export function base64(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64');
}

export function fromBase64(input: string): string {
  return Buffer.from(input, 'base64').toString('utf8');
}

export function getByJsonPointer(value: unknown, pointer: string): unknown {
  if (!pointer || pointer === '/') {
    return value;
  }
  const parts = pointer.split('/').slice(1).map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: unknown = value;
  for (const part of parts) {
    if (Array.isArray(current)) {
      const index = Number(part);
      current = Number.isInteger(index) ? current[index] : undefined;
      continue;
    }
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
      continue;
    }
    return undefined;
  }
  return current;
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function stringifyValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined) {
    return 'undefined';
  }
  return JSON.stringify(value);
}

export function resolveMaybeRelative(baseDir: string, input: string): string {
  return path.isAbsolute(input) ? input : path.resolve(baseDir, input);
}

export function isSuccessResponse(message: unknown): message is { result: JsonValue } {
  return Boolean(message && typeof message === 'object' && 'result' in (message as Record<string, unknown>));
}

export function isErrorResponse(message: unknown): message is { error: { code: number; message: string } } {
  return Boolean(message && typeof message === 'object' && 'error' in (message as Record<string, unknown>));
}
