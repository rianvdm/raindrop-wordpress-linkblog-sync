import { describe, it, expect } from 'vitest';
import { Router } from './router';

describe('Router', () => {
  it('should match GET routes', async () => {
    const router = new Router();
    router.get('/test', () => new Response('GET test'));

    const request = new Request('http://localhost/test', { method: 'GET' });
    const response = await router.handle(request);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('GET test');
  });

  it('should match POST routes', async () => {
    const router = new Router();
    router.post('/test', () => new Response('POST test'));

    const request = new Request('http://localhost/test', { method: 'POST' });
    const response = await router.handle(request);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('POST test');
  });

  it('should return 404 for unmatched routes', async () => {
    const router = new Router();
    router.get('/test', () => new Response('test'));

    const request = new Request('http://localhost/unknown');
    const response = await router.handle(request);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Not Found');
  });

  it('should handle async handlers', async () => {
    const router = new Router();
    router.get('/async', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return new Response('async response');
    });

    const request = new Request('http://localhost/async');
    const response = await router.handle(request);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('async response');
  });
});