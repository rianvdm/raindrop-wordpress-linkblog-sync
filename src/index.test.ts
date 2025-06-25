import { describe, it, expect } from 'vitest';
import worker from './index';

describe('Worker', () => {
  it('should return Hello World', async () => {
    const request = new Request('http://localhost');
    const env = {
      SYNC_STATE: {} as KVNamespace,
    };
    const ctx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    } as unknown as ExecutionContext;

    const response = await worker.fetch(request, env, ctx);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe('Hello World');
  });
});