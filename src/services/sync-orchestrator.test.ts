import { describe, it, expect, beforeEach, vi } from "vitest";
import { SyncOrchestrator } from "./sync-orchestrator";
import { Env } from "../types/env";
import { mockRaindropItem } from "../test/fixtures/raindrop";
import { mockWordPressPost } from "../test/fixtures/wordpress";
import { MockKVNamespace } from "../test/kv-mock";

// Mock all the services
vi.mock("./raindrop-client");
vi.mock("./wordpress-client");
vi.mock("./kv-storage");
vi.mock("./content-builder");
vi.mock("./error-logger");

describe("SyncOrchestrator", () => {
  let orchestrator: SyncOrchestrator;
  let mockEnv: Env;
  let mockRaindropClient: any;
  let mockWordPressClient: any;
  let mockStorage: any;
  let mockContentBuilder: any;
  let mockLogger: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockEnv = {
      SYNC_STATE: new MockKVNamespace() as any,
      RAINDROP_ERRORS: new MockKVNamespace() as any,
      TRIGGER_TOKEN: "test-token",
      RAINDROP_TOKEN: "raindrop-token",
      RAINDROP_TAG: "blog",
      WP_ENDPOINT: "https://example.com/wp-json/wp/v2/posts",
      WP_USERNAME: "testuser",
      WP_APP_PASSWORD: "testpass",
    };

    // Setup mocks
    const { RaindropClient } = await import("./raindrop-client");
    const { WordPressClient } = await import("./wordpress-client");
    const { KVStorageService } = await import("./kv-storage");
    const { ContentBuilder } = await import("./content-builder");
    const { ErrorLogger } = await import("./error-logger");

    mockRaindropClient = {
      fetchBookmarks: vi.fn(),
    };
    mockWordPressClient = {
      createPost: vi.fn(),
    };
    mockStorage = {
      getLastFetchTime: vi.fn(),
      setLastFetchTime: vi.fn(),
      isItemPosted: vi.fn(),
      markItemAsPosted: vi.fn(),
    };
    mockContentBuilder = {
      buildPostContent: vi.fn(),
    };
    mockLogger = {
      logInfo: vi.fn(),
      logError: vi.fn(),
      logWarning: vi.fn(),
    };

    vi.mocked(RaindropClient).mockImplementation(() => mockRaindropClient);
    vi.mocked(WordPressClient).mockImplementation(() => mockWordPressClient);
    vi.mocked(KVStorageService).mockImplementation(() => mockStorage);
    vi.mocked(ContentBuilder).mockImplementation(() => mockContentBuilder);
    vi.mocked(ErrorLogger).mockImplementation(() => mockLogger);

    orchestrator = new SyncOrchestrator(mockEnv);
  });

  describe("performSync", () => {
    it("should perform complete sync successfully", async () => {
      const lastFetchTime = new Date("2024-01-01T10:00:00Z");
      const newBookmark = { ...mockRaindropItem, _id: "new-bookmark-1" };

      mockStorage.getLastFetchTime.mockResolvedValue(lastFetchTime);
      mockRaindropClient.fetchBookmarks.mockResolvedValue([newBookmark]);
      mockStorage.isItemPosted.mockResolvedValue(false);
      mockContentBuilder.buildPostContent.mockReturnValue(
        "<p>Test content</p>"
      );
      mockWordPressClient.createPost.mockResolvedValue(mockWordPressPost);
      mockStorage.markItemAsPosted.mockResolvedValue(undefined);
      mockStorage.setLastFetchTime.mockResolvedValue(undefined);

      const result = await orchestrator.performSync();

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsPosted).toBe(1);
      expect(result.itemsSkipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.dryRun).toBe(false);
      expect(result.duration).toMatch(/^\d+ms$/);

      expect(mockRaindropClient.fetchBookmarks).toHaveBeenCalledWith(
        "blog",
        lastFetchTime
      );
      expect(mockStorage.isItemPosted).toHaveBeenCalledWith("new-bookmark-1");
      expect(mockWordPressClient.createPost).toHaveBeenCalledWith({
        title: newBookmark.title,
        content: "<p>Test content</p>",
        status: "publish",
        format: "link",
      });
      expect(mockStorage.markItemAsPosted).toHaveBeenCalledWith(
        "new-bookmark-1"
      );
      expect(mockStorage.setLastFetchTime).toHaveBeenCalled();
    });

    it("should skip already posted items", async () => {
      const bookmark1 = { ...mockRaindropItem, _id: "bookmark-1" };
      const bookmark2 = { ...mockRaindropItem, _id: "bookmark-2" };

      mockStorage.getLastFetchTime.mockResolvedValue(null);
      mockRaindropClient.fetchBookmarks.mockResolvedValue([
        bookmark1,
        bookmark2,
      ]);
      mockStorage.isItemPosted.mockImplementation((id: string) => {
        return Promise.resolve(id === "bookmark-1"); // First one already posted
      });
      mockContentBuilder.buildPostContent.mockReturnValue(
        "<p>Test content</p>"
      );
      mockWordPressClient.createPost.mockResolvedValue(mockWordPressPost);
      mockStorage.markItemAsPosted.mockResolvedValue(undefined);

      const result = await orchestrator.performSync();

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(2);
      expect(result.itemsPosted).toBe(1);
      expect(result.itemsSkipped).toBe(1);
      expect(mockWordPressClient.createPost).toHaveBeenCalledTimes(1);
    });

    it("should handle dry run mode", async () => {
      const newBookmark = { ...mockRaindropItem, _id: "new-bookmark-1" };
      mockEnv.DRY_RUN = "true";
      orchestrator = new SyncOrchestrator(mockEnv);

      mockStorage.getLastFetchTime.mockResolvedValue(null);
      mockRaindropClient.fetchBookmarks.mockResolvedValue([newBookmark]);
      mockStorage.isItemPosted.mockResolvedValue(false);
      mockContentBuilder.buildPostContent.mockReturnValue(
        "<p>Test content</p>"
      );

      const result = await orchestrator.performSync();

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsPosted).toBe(1);
      expect(result.dryRun).toBe(true);
      expect(mockWordPressClient.createPost).not.toHaveBeenCalled();
      expect(mockStorage.markItemAsPosted).not.toHaveBeenCalled();
      expect(mockStorage.setLastFetchTime).not.toHaveBeenCalled();
    });

    it("should handle custom tag and limit options", async () => {
      const bookmarks = [
        { ...mockRaindropItem, _id: "bookmark-1" },
        { ...mockRaindropItem, _id: "bookmark-2" },
        { ...mockRaindropItem, _id: "bookmark-3" },
      ];

      mockStorage.getLastFetchTime.mockResolvedValue(null);
      mockRaindropClient.fetchBookmarks.mockResolvedValue(bookmarks);
      mockStorage.isItemPosted.mockResolvedValue(false);

      const result = await orchestrator.performSync({
        tag: "custom",
        limit: 2,
      });

      expect(mockRaindropClient.fetchBookmarks).toHaveBeenCalledWith(
        "custom",
        undefined
      );
      expect(result.itemsProcessed).toBe(2); // Limited to 2
    });

    it("should handle Raindrop fetch errors", async () => {
      const fetchError = new Error("Raindrop API error");
      mockStorage.getLastFetchTime.mockResolvedValue(null);
      mockRaindropClient.fetchBookmarks.mockRejectedValue(fetchError);

      const result = await orchestrator.performSync();

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Sync failed: Raindrop API error");
      expect(mockLogger.logError).toHaveBeenCalledWith(
        fetchError,
        expect.objectContaining({
          operation: "sync-orchestrator",
        })
      );
    });

    it("should handle WordPress post creation errors", async () => {
      const newBookmark = { ...mockRaindropItem, _id: "new-bookmark-1" };
      const postError = new Error("WordPress API error");

      mockStorage.getLastFetchTime.mockResolvedValue(null);
      mockRaindropClient.fetchBookmarks.mockResolvedValue([newBookmark]);
      mockStorage.isItemPosted.mockResolvedValue(false);
      mockContentBuilder.buildPostContent.mockReturnValue(
        "<p>Test content</p>"
      );
      mockWordPressClient.createPost.mockRejectedValue(postError);

      const result = await orchestrator.performSync();

      expect(result.success).toBe(false);
      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsPosted).toBe(0);
      expect(result.errors).toContain(
        "Failed to process bookmark new-bookmark-1: WordPress API error"
      );
      expect(mockStorage.setLastFetchTime).not.toHaveBeenCalled(); // Don't update timestamp on error
    });

    it("should handle KV storage errors gracefully", async () => {
      const newBookmark = { ...mockRaindropItem, _id: "new-bookmark-1" };

      mockStorage.getLastFetchTime.mockResolvedValue(null);
      mockRaindropClient.fetchBookmarks.mockResolvedValue([newBookmark]);
      mockStorage.isItemPosted.mockRejectedValue(new Error("KV error"));
      mockContentBuilder.buildPostContent.mockReturnValue(
        "<p>Test content</p>"
      );
      mockWordPressClient.createPost.mockResolvedValue(mockWordPressPost);

      const result = await orchestrator.performSync();

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsPosted).toBe(1);
      expect(mockLogger.logWarning).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to check if item new-bookmark-1 was posted"
        ),
        expect.objectContaining({ bookmarkId: "new-bookmark-1" })
      );
    });

    it("should not update timestamp if there are errors", async () => {
      const bookmark1 = {
        ...mockRaindropItem,
        _id: "good-bookmark",
        title: "Good Bookmark",
      };
      const bookmark2 = {
        ...mockRaindropItem,
        _id: "bad-bookmark",
        title: "Bad Bookmark",
      };

      mockStorage.getLastFetchTime.mockResolvedValue(null);
      mockRaindropClient.fetchBookmarks.mockResolvedValue([
        bookmark1,
        bookmark2,
      ]);
      mockStorage.isItemPosted.mockResolvedValue(false);
      mockContentBuilder.buildPostContent.mockReturnValue(
        "<p>Test content</p>"
      );
      mockWordPressClient.createPost.mockImplementation((payload: any) => {
        if (payload.title === "Bad Bookmark") {
          throw new Error("WordPress error");
        }
        return Promise.resolve(mockWordPressPost);
      });

      const result = await orchestrator.performSync();

      expect(result.success).toBe(false);
      expect(result.itemsPosted).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(mockStorage.setLastFetchTime).not.toHaveBeenCalled();
    });

    it("should include lastFetchTime in result", async () => {
      const lastFetchTime = new Date("2024-01-01T10:00:00Z");
      mockStorage.getLastFetchTime.mockResolvedValue(lastFetchTime);
      mockRaindropClient.fetchBookmarks.mockResolvedValue([]);

      const result = await orchestrator.performSync();

      expect(result.lastFetchTime).toBe("2024-01-01T10:00:00.000Z");
    });
  });
});
