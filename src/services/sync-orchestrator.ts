// ABOUTME: Core sync orchestrator that coordinates the entire bookmark-to-WordPress sync process.
// ABOUTME: Manages fetching, deduplication, post creation, and state tracking with dry-run support.
import { RaindropClient } from "./raindrop-client";
import { WordPressClient } from "./wordpress-client";
import { KVStorageService } from "./kv-storage";
import { ContentBuilder } from "./content-builder";
import { ErrorLogger } from "./error-logger";
import { RaindropItem } from "../types/raindrop";
import { Env } from "../types/env";

export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsPosted: number;
  itemsSkipped: number;
  errors: string[];
  dryRun: boolean;
  duration: string;
  lastFetchTime?: string;
}

export interface SyncOptions {
  dryRun?: boolean;
  tag?: string;
  limit?: number;
}

export class SyncOrchestrator {
  private raindropClient: RaindropClient;
  private wordpressClient: WordPressClient;
  private storage: KVStorageService;
  private contentBuilder: ContentBuilder;
  private logger: ErrorLogger;
  private isDryRun: boolean;

  constructor(env: Env, options: SyncOptions = {}) {
    this.raindropClient = new RaindropClient(env.RAINDROP_TOKEN);
    this.wordpressClient = new WordPressClient(
      env.WP_ENDPOINT,
      env.WP_USERNAME,
      env.WP_APP_PASSWORD
    );
    this.storage = new KVStorageService(env.SYNC_STATE);
    this.contentBuilder = new ContentBuilder();
    this.logger = new ErrorLogger(env.RAINDROP_ERRORS);
    this.isDryRun = options.dryRun || env.DRY_RUN === "true";
  }

  async performSync(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      itemsProcessed: 0,
      itemsPosted: 0,
      itemsSkipped: 0,
      errors: [],
      dryRun: this.isDryRun,
      duration: "0ms",
    };

    try {
      // Step 1: Get last sync timestamp
      const lastFetchTime = await this.storage.getLastFetchTime();
      result.lastFetchTime = lastFetchTime?.toISOString();

      // Step 2: Fetch new bookmarks from Raindrop
      const tag = options.tag || "blog";
      const bookmarks = await this.fetchNewBookmarks(
        tag,
        lastFetchTime || undefined,
        options.limit
      );
      result.itemsProcessed = bookmarks.length;

      // Step 3: Filter out already posted items
      const newBookmarks = await this.filterNewBookmarks(bookmarks);
      result.itemsSkipped = result.itemsProcessed - newBookmarks.length;

      // Step 4: Process each new bookmark
      for (const bookmark of newBookmarks) {
        try {
          const posted = await this.processBookmark(bookmark);
          if (posted) {
            result.itemsPosted++;
          }
        } catch (error: unknown) {
          const errorMsg = `Failed to process bookmark ${bookmark._id}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          await this.logger.logError(
            error instanceof Error ? error : new Error(String(error)),
            {
              operation: "process-bookmark",
              bookmarkId: bookmark._id,
              bookmarkTitle: bookmark.title,
            }
          );
        }
      }

      // Step 5: Update last fetch timestamp (only if not dry run and no errors)
      if (!this.isDryRun && result.errors.length === 0) {
        const newFetchTime = new Date();
        await this.storage.setLastFetchTime(newFetchTime);
      }

      result.success = result.errors.length === 0;
      result.duration = `${Date.now() - startTime}ms`;

      // Only log a single success message if everything went well
      if (result.success) {
        await this.logger.logInfo("Sync completed successfully", {
          itemsProcessed: result.itemsProcessed,
          itemsPosted: result.itemsPosted,
          itemsSkipped: result.itemsSkipped,
          duration: result.duration,
          dryRun: result.dryRun,
          tag: options.tag,
        });
      } else {
        // Log detailed error summary when there are failures
        await this.logger.logError(new Error("Sync completed with errors"), {
          operation: "sync-orchestrator",
          itemsProcessed: result.itemsProcessed,
          itemsPosted: result.itemsPosted,
          itemsSkipped: result.itemsSkipped,
          errorCount: result.errors.length,
          duration: result.duration,
          dryRun: result.dryRun,
          tag: options.tag,
        });
      }

      return result;
    } catch (error: unknown) {
      result.success = false;
      result.duration = `${Date.now() - startTime}ms`;
      result.errors.push(
        `Sync failed: ${error instanceof Error ? error.message : String(error)}`
      );

      await this.logger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: "sync-orchestrator",
          duration: result.duration,
          tag: options.tag,
          dryRun: this.isDryRun,
        }
      );

      return result;
    }
  }

  private async fetchNewBookmarks(
    tag: string,
    since?: Date,
    limit?: number
  ): Promise<RaindropItem[]> {
    try {
      const bookmarks = await this.raindropClient.fetchBookmarks(tag, since);

      // Apply limit if specified
      if (limit && limit > 0) {
        return bookmarks.slice(0, limit);
      }

      return bookmarks;
    } catch (error: unknown) {
      await this.logger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: "fetch-bookmarks",
          tag,
          since: since?.toISOString(),
          limit,
        }
      );
      throw error;
    }
  }

  private async filterNewBookmarks(
    bookmarks: RaindropItem[]
  ): Promise<RaindropItem[]> {
    const newBookmarks: RaindropItem[] = [];

    for (const bookmark of bookmarks) {
      try {
        const alreadyPosted = await this.storage.isItemPosted(bookmark._id);
        if (!alreadyPosted) {
          newBookmarks.push(bookmark);
        }
      } catch (error: unknown) {
        // If we can't check, err on the side of processing it
        await this.logger.logWarning(
          `Failed to check if item ${bookmark._id} was posted, including it`,
          {
            bookmarkId: bookmark._id,
            error: error instanceof Error ? error.message : String(error),
          }
        );
        newBookmarks.push(bookmark);
      }
    }

    return newBookmarks;
  }

  private async processBookmark(bookmark: RaindropItem): Promise<boolean> {
    try {
      // Build content from bookmark
      const content = this.contentBuilder.buildPostContent(
        bookmark.note,
        bookmark.title,
        bookmark.link
      );

      if (this.isDryRun) {
        // In dry run mode, we don't log individual items processed
        return true;
      }

      // Create WordPress post
      const payload = {
        title: bookmark.title,
        content,
        status: "publish" as const,
        format: "link" as const,
      };

      await this.wordpressClient.createPost(payload);

      // Mark as posted
      await this.storage.markItemAsPosted(bookmark._id);

      // Don't log individual successful posts - only the summary at the end
      return true;
    } catch (error: unknown) {
      await this.logger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: "process-bookmark",
          bookmarkId: bookmark._id,
          title: bookmark.title,
          link: bookmark.link,
        }
      );
      throw error;
    }
  }
}
