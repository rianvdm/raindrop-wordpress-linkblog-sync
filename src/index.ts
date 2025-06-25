import { Router } from './router';
import { requireAuth } from './middleware/auth';
import { jsonResponse, errorResponse } from './utils/response';
import { Env } from './types/env';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const router = new Router();

    // Add the /trigger endpoint with authentication
    router.get('/trigger', requireAuth(env)(async () => {
      return jsonResponse({ message: 'Sync triggered successfully' });
    }));

    try {
      return await router.handle(request);
    } catch (error) {
      console.error('Error handling request:', error);
      return errorResponse('Internal Server Error');
    }
  },
};

export type { Env };