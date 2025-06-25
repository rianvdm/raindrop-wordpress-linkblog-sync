// ABOUTME: Main Cloudflare Worker entry point that handles HTTP requests and routes them to appropriate endpoints.
// ABOUTME: Provides test endpoints for Raindrop and WordPress API connections, error logging, and sync triggering.
import { Router } from "./router";
import { requireAuth } from "./middleware/auth";
import { jsonResponse, errorResponse } from "./utils/response";
import { Env } from "./types/env";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const router = new Router();

    // Add the /trigger endpoint with authentication to perform sync
    router.get(
      "/trigger",
      requireAuth(env)(async request => {
        try {
          const url = new URL(request.url);
          const dryRun = url.searchParams.get("dry_run") === "true";
          const tag = url.searchParams.get("tag") || undefined;
          const limitParam = url.searchParams.get("limit");
          const limit = limitParam ? parseInt(limitParam, 10) : undefined;

          const { SyncOrchestrator } = await import(
            "./services/sync-orchestrator"
          );
          const orchestrator = new SyncOrchestrator(env, { dryRun });

          const result = await orchestrator.performSync({ tag, limit });

          return jsonResponse(result);
        } catch (error: any) {
          return errorResponse(`Sync failed: ${error.message}`, 500);
        }
      })
    );

    // Add a test endpoint to validate Raindrop connection
    router.get(
      "/test-raindrop",
      requireAuth(env)(async request => {
        if (!env.RAINDROP_TOKEN) {
          return errorResponse("RAINDROP_TOKEN not configured", 500);
        }

        try {
          const url = new URL(request.url);
          const tagParam = url.searchParams.get("tag");
          const tag = tagParam || env.RAINDROP_TAG || "blog";

          const { RaindropClient } = await import("./services/raindrop-client");
          const client = new RaindropClient(env.RAINDROP_TOKEN);
          const items = await client.fetchBookmarks(tag);

          return jsonResponse({
            success: true,
            message: `Found ${items.length} bookmarks with tag "${tag}"`,
            items: items.slice(0, 3).map(item => ({
              // Show first 3 items
              id: item._id,
              title: item.title,
              link: item.link,
              created: item.created,
              tags: item.tags,
            })),
          });
        } catch (error: any) {
          return errorResponse(`Raindrop API error: ${error.message}`, 500);
        }
      })
    );

    // Add a test endpoint to validate WordPress connection
    router.get(
      "/test-wordpress",
      requireAuth(env)(async () => {
        if (!env.WP_USERNAME || !env.WP_APP_PASSWORD || !env.WP_ENDPOINT) {
          return errorResponse("WordPress credentials not configured", 500);
        }

        try {
          const { WordPressClient } = await import(
            "./services/wordpress-client"
          );
          const { ContentBuilder } = await import("./services/content-builder");

          const client = new WordPressClient(
            env.WP_ENDPOINT,
            env.WP_USERNAME,
            env.WP_APP_PASSWORD
          );
          const builder = new ContentBuilder();

          // Create a test post
          const testContent = builder.buildPostContent(
            "This is a test post created by the Raindrop sync worker to verify WordPress API connectivity.",
            "Test Post - Raindrop Sync Worker",
            "https://example.com"
          );

          const payload = {
            title: "Test Post - Raindrop Sync Worker",
            content: testContent,
            status: "draft" as const,
            format: "link" as const,
          };

          const post = await client.createPost(payload);

          return jsonResponse({
            success: true,
            message: "WordPress API test successful",
            post: {
              id: post.id,
              title: post.title.rendered,
              status: post.status,
              format: post.format,
              link: post.link,
            },
          });
        } catch (error: any) {
          return errorResponse(`WordPress API error: ${error.message}`, 500);
        }
      })
    );

    // Add an endpoint to view recent errors
    router.get(
      "/errors",
      requireAuth(env)(async request => {
        try {
          const { ErrorLogger } = await import("./services/error-logger");
          const logger = new ErrorLogger(env.SYNC_STATE);

          const url = new URL(request.url);
          const limitParam = url.searchParams.get("limit");
          const limit = limitParam ? parseInt(limitParam, 10) : 50;

          const errors = await logger.getRecentErrors(Math.min(limit, 100)); // Cap at 100

          return jsonResponse({
            success: true,
            count: errors.length,
            errors: errors.map(error => ({
              timestamp: error.timestamp,
              level: error.level,
              message: error.message,
              context: error.context,
              // Don't include full stack traces in API response for brevity
              hasStack: !!error.stack,
            })),
          });
        } catch (error: any) {
          return errorResponse(
            `Failed to retrieve errors: ${error.message}`,
            500
          );
        }
      })
    );

    // Add a test endpoint to generate sample errors for testing
    router.get(
      "/test-errors",
      requireAuth(env)(async () => {
        try {
          const { ErrorLogger } = await import("./services/error-logger");
          const logger = new ErrorLogger(env.SYNC_STATE);

          // Generate some test errors
          await logger.logError(new Error("Test API connection failure"), {
            operation: "raindrop-fetch",
            endpoint: "https://api.raindrop.io/rest/v1/raindrops",
            userId: "test-user",
          });

          await logger.logWarning("Rate limit warning", {
            remaining: 15,
            resetTime: new Date(Date.now() + 3600000).toISOString(),
          });

          await logger.logInfo("Sync completed successfully", {
            itemsProcessed: 3,
            duration: "2.5s",
          });

          await logger.logError("WordPress authentication failed", {
            operation: "wordpress-post",
            statusCode: 401,
            endpoint: env.WP_ENDPOINT,
          });

          return jsonResponse({
            success: true,
            message:
              "Generated 4 test log entries (2 errors, 1 warning, 1 info)",
          });
        } catch (error: any) {
          return errorResponse(
            `Failed to generate test errors: ${error.message}`,
            500
          );
        }
      })
    );

    // Add a utility endpoint to reset the last fetch time (for testing/debugging)
    router.get(
      "/reset-timestamp",
      requireAuth(env)(async request => {
        try {
          const { KVStorageService } = await import("./services/kv-storage");
          const storage = new KVStorageService(env.SYNC_STATE);

          // Get current timestamp for reference
          const currentTime = await storage.getLastFetchTime();

          // Get days parameter (default to 90 days for testing)
          const url = new URL(request.url);
          const daysParam = url.searchParams.get("days");
          const days = daysParam ? parseInt(daysParam, 10) : 90;

          // Reset to a date in the past
          const resetDate = new Date();
          resetDate.setDate(resetDate.getDate() - days);
          await storage.setLastFetchTime(resetDate);

          return jsonResponse({
            success: true,
            message: `Last fetch timestamp reset to ${days} days ago`,
            previousTimestamp: currentTime?.toISOString(),
            newTimestamp: resetDate.toISOString(),
            daysBack: days,
          });
        } catch (error: any) {
          return errorResponse(
            `Failed to reset timestamp: ${error.message}`,
            500
          );
        }
      })
    );

    try {
      return await router.handle(request);
    } catch (error) {
      console.error("Error handling request:", error);
      return errorResponse("Internal Server Error");
    }
  },
};

export type { Env };
