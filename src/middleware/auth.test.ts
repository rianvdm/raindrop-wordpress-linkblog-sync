import { describe, it, expect } from 'vitest';
import { requireAuth } from './auth';
import { Env } from '../types/env';

describe('Auth Middleware', () => {
  const mockEnv: Env = {
    TRIGGER_TOKEN: 'secret-token',
    SYNC_STATE: {} as KVNamespace,
    RAINDROP_TOKEN: 'raindrop-token',
    RAINDROP_TAG: 'blog',
  };

  it('should allow requests with valid token', async () => {
    const handler = requireAuth(mockEnv)(() => new Response('Success'));
    const request = new Request('http://localhost/test?token=secret-token');
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Success');
  });

  it('should reject requests without token', async () => {
    const handler = requireAuth(mockEnv)(() => new Response('Success'));
    const request = new Request('http://localhost/test');
    const response = await handler(request);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Forbidden');
  });

  it('should reject requests with invalid token', async () => {
    const handler = requireAuth(mockEnv)(() => new Response('Success'));
    const request = new Request('http://localhost/test?token=wrong-token');
    const response = await handler(request);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Forbidden');
  });

  it('should handle async handlers', async () => {
    const handler = requireAuth(mockEnv)(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return new Response('Async Success');
    });
    const request = new Request('http://localhost/test?token=secret-token');
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Async Success');
  });
});