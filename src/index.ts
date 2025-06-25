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

    // Add a test endpoint to validate Raindrop connection
    router.get('/test-raindrop', requireAuth(env)(async (request) => {
      if (!env.RAINDROP_TOKEN) {
        return errorResponse('RAINDROP_TOKEN not configured', 500);
      }

      try {
        const url = new URL(request.url);
        const tagParam = url.searchParams.get('tag');
        const tag = tagParam || env.RAINDROP_TAG || 'blog';
        
        const { RaindropClient } = await import('./services/raindrop-client');
        const client = new RaindropClient(env.RAINDROP_TOKEN);
        const items = await client.fetchBookmarks(tag);
        
        return jsonResponse({ 
          success: true,
          message: `Found ${items.length} bookmarks with tag "${tag}"`,
          items: items.slice(0, 3).map(item => ({ // Show first 3 items
            id: item._id,
            title: item.title,
            link: item.link,
            created: item.created,
            tags: item.tags
          }))
        });
      } catch (error: any) {
        return errorResponse(`Raindrop API error: ${error.message}`, 500);
      }
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