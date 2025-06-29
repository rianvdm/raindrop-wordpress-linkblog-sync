// ABOUTME: Main Cloudflare Worker entry point that handles HTTP requests and routes them to appropriate endpoints.
// ABOUTME: Provides test endpoints for Raindrop and WordPress API connections, error logging, and sync triggering.
import { Router } from "./router";
import { requireAuth } from "./middleware/auth";
import { jsonResponse, errorResponse } from "./utils/response";
import { SyncOrchestrator } from "./services/sync-orchestrator";
import { ErrorLogger } from "./services/error-logger";
import { getConfig } from "./services/config";
import { ConfigError } from "./types/config";
import { Env } from "./types/env";

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    // Initialize configuration with validation
    try {
      getConfig(env);
    } catch (error) {
      if (error instanceof ConfigError) {
        return errorResponse(
          `Configuration error: ${error instanceof Error ? error.message : String(error)}`,
          500
        );
      }
      return errorResponse("Failed to initialize configuration", 500);
    }

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
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          return errorResponse(`Sync failed: ${message}`, 500);
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
        } catch (error: unknown) {
          return errorResponse(
            `Raindrop API error: ${error instanceof Error ? error.message : String(error)}`,
            500
          );
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
        } catch (error: unknown) {
          return errorResponse(
            `WordPress API error: ${error instanceof Error ? error.message : String(error)}`,
            500
          );
        }
      })
    );

    // Add an endpoint to view recent errors
    router.get(
      "/errors",
      requireAuth(env)(async request => {
        try {
          const { ErrorLogger } = await import("./services/error-logger");
          const logger = new ErrorLogger(env.RAINDROP_ERRORS);

          const url = new URL(request.url);
          const limitParam = url.searchParams.get("limit");
          const limit = limitParam ? parseInt(limitParam, 10) : 50;

          // Add debugging: check what keys exist in KV
          const list = await env.RAINDROP_ERRORS.list({
            prefix: "error:",
            limit: 100,
          });
          const keyCount = list.keys.length;

          const errors = await logger.getRecentErrors(Math.min(limit, 100)); // Cap at 100

          return jsonResponse({
            success: true,
            count: errors.length,
            keyCount: keyCount, // Add this for debugging
            sampleKeys: list.keys.slice(0, 3).map(k => k.name), // Show first 3 keys
            errors: errors.map(error => ({
              timestamp: error.timestamp,
              level: error.level,
              message: error.message,
              context: error.context,
              // Don't include full stack traces in API response for brevity
              hasStack: !!error.stack,
            })),
          });
        } catch (error: unknown) {
          return errorResponse(
            `Failed to retrieve errors: ${error instanceof Error ? error.message : String(error)}`,
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
          const logger = new ErrorLogger(env.RAINDROP_ERRORS);

          // Check if KV namespace is available
          if (!env.RAINDROP_ERRORS) {
            return errorResponse(
              "RAINDROP_ERRORS KV namespace not available",
              500
            );
          }

          // Test KV connection by writing and reading a test entry
          const testKey = `test:${Date.now()}`;
          try {
            await env.RAINDROP_ERRORS.put(testKey, "test-value");
            const testValue = await env.RAINDROP_ERRORS.get(testKey);
            await env.RAINDROP_ERRORS.delete(testKey);

            if (testValue !== "test-value") {
              return errorResponse(
                "KV namespace test failed - could not read back test value",
                500
              );
            }
          } catch (kvError) {
            return errorResponse(
              `KV namespace test failed: ${kvError instanceof Error ? kvError.message : String(kvError)}`,
              500
            );
          }

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
              "Generated 4 test log entries (2 errors, 1 warning, 1 info) - KV test passed",
          });
        } catch (error: unknown) {
          return errorResponse(
            `Failed to generate test errors: ${error instanceof Error ? error.message : String(error)}`,
            500
          );
        }
      })
    );

    // Add endpoint to clear all error logs (temporary - remove after use)
    router.post(
      "/clear-errors",
      requireAuth(env)(async () => {
        try {
          // Get all error keys directly
          const list = await env.RAINDROP_ERRORS.list({
            prefix: "error:",
            limit: 1000,
          });

          // Delete each error entry
          let count = 0;
          for (const key of list.keys) {
            await env.RAINDROP_ERRORS.delete(key.name);
            count++;
          }

          return jsonResponse({
            message: "All error logs cleared",
            count: count,
          });
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          return errorResponse(`Failed to clear errors: ${message}`, 500);
        }
      })
    );

    // Add debug endpoint to directly check KV values
    router.get(
      "/debug-errors",
      requireAuth(env)(async () => {
        try {
          // First, let's check ALL keys in the namespace
          const allList = await env.RAINDROP_ERRORS.list({ limit: 100 });

          // Then get keys with error: prefix
          const errorList = await env.RAINDROP_ERRORS.list({
            prefix: "error:",
            limit: 10,
          });

          const debugInfo: any[] = [];

          for (const key of errorList.keys) {
            try {
              const value = await env.RAINDROP_ERRORS.get(key.name);
              let parsed = null;
              let parseError = null;

              if (value) {
                try {
                  parsed = JSON.parse(value);
                } catch (e) {
                  parseError = e instanceof Error ? e.message : String(e);
                }
              }

              debugInfo.push({
                key: key.name,
                hasValue: !!value,
                valueType: typeof value,
                valueLength: value ? value.length : 0,
                firstChars: value ? value.substring(0, 100) : null,
                parsed: !!parsed,
                parseError,
              });
            } catch (error) {
              debugInfo.push({
                key: key.name,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          // Also test writing and reading
          const testKey = `error:test:${Date.now()}`;
          let writeTest = "failed";
          try {
            await env.RAINDROP_ERRORS.put(
              testKey,
              JSON.stringify({ test: true })
            );
            const testRead = await env.RAINDROP_ERRORS.get(testKey);
            if (testRead) {
              writeTest = "success";
              await env.RAINDROP_ERRORS.delete(testKey);
            }
          } catch (e) {
            writeTest = e instanceof Error ? e.message : String(e);
          }

          return jsonResponse({
            success: true,
            totalAllKeys: allList.keys.length,
            allKeysSample: allList.keys.slice(0, 5).map(k => k.name),
            totalErrorKeys: errorList.keys.length,
            writeTest,
            debugInfo,
          });
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          return errorResponse(`Failed to debug errors: ${message}`, 500);
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
        } catch (error: unknown) {
          return errorResponse(
            `Failed to reset timestamp: ${error instanceof Error ? error.message : String(error)}`,
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

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    const startTime = Date.now();
    const logger = new ErrorLogger(env.RAINDROP_ERRORS);

    try {
      // Initialize configuration with validation
      const config = getConfig(env);

      // Execute the sync using the same orchestrator as manual triggers
      const orchestrator = new SyncOrchestrator(env);

      const result = await orchestrator.performSync({
        dryRun: config.dryRun,
        tag: config.raindropTag,
        limit: config.maxItemsPerSync,
      });

      const duration = Date.now() - startTime;

      // Only log if there were errors - the orchestrator already logged success
      if (!result.success) {
        await logger.logError(
          new Error("Scheduled sync completed with errors"),
          {
            operation: "scheduled-sync",
            cron: event.cron,
            duration: `${duration}ms`,
            result,
          }
        );
      }

      // Keep console.log for local development/debugging
      console.log("Scheduled sync completed:", {
        success: result.success,
        duration: `${duration}ms`,
        itemsProcessed: result.itemsProcessed,
        itemsPosted: result.itemsPosted,
        errors: result.errors.length,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof ConfigError) {
        await logger.logError(error, {
          operation: "scheduled-sync-config",
          cron: event.cron,
          duration: `${duration}ms`,
        });
        console.error(
          "Scheduled sync config error:",
          error instanceof Error ? error.message : String(error)
        );
      } else {
        await logger.logError(error as Error, {
          operation: "scheduled-sync",
          cron: event.cron,
          duration: `${duration}ms`,
        });
        console.error("Scheduled sync failed:", error);
      }

      // Don't throw - let the cron continue running on schedule
      // The error is logged for monitoring
    }
  },
};

export type { Env };
