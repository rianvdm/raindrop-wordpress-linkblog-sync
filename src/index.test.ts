import { describe, it, expect } from 'vitest';
import worker, { Env } from './index';

describe('Worker', () => {
  const mockEnv: Env = {
    SYNC_STATE: {} as KVNamespace,
    TRIGGER_TOKEN: 'test-token',
    RAINDROP_TOKEN: 'raindrop-token',
    RAINDROP_TAG: 'blog',
    WP_ENDPOINT: 'https://example.com/wp-json/wp/v2/posts',
    WP_USERNAME: 'testuser',
    WP_APP_PASSWORD: 'testpass',
  };

  const mockCtx = {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as unknown as ExecutionContext;

  it('should return 404 for unknown routes', async () => {
    const request = new Request('http://localhost/unknown');
    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Not Found');
  });

  it('should require auth for /trigger endpoint', async () => {
    const request = new Request('http://localhost/trigger');
    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Forbidden');
  });

  it('should accept valid token for /trigger endpoint', async () => {
    const request = new Request('http://localhost/trigger?token=test-token');
    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ message: 'Sync triggered successfully' });
  });

  it('should reject invalid token for /trigger endpoint', async () => {
    const request = new Request('http://localhost/trigger?token=wrong-token');
    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Forbidden');
  });

  it('should include CORS headers in responses', async () => {
    const request = new Request('http://localhost/trigger?token=test-token');
    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});