import { describe, it, expect, beforeEach, vi } from "vitest";
import { RaindropClient } from "./raindrop-client";
import { RaindropError } from "../types/raindrop";
import {
  mockRaindropResponse,
  mockEmptyResponse,
  mockErrorResponse,
  mockInvalidResponse,
  mockItemMissingFields,
} from "../test/fixtures/raindrop";

// Mock global fetch
global.fetch = vi.fn();

describe("RaindropClient", () => {
  let client: RaindropClient;
  const mockToken = "test-token";

  beforeEach(() => {
    client = new RaindropClient(mockToken);
    vi.clearAllMocks();
  });

  describe("fetchBookmarks", () => {
    it("should fetch bookmarks with tag filter", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRaindropResponse,
      } as Response);

      const result = await client.fetchBookmarks("blog");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/raindrops/0?search=%23blog"),
        expect.objectContaining({
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          },
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0]._id).toBe("987654321"); // Newest item first (2024-01-02)
      expect(result[1]._id).toBe("123456789"); // Older item second (2024-01-01)
      expect(result[0].tags).toContain("blog");
    });

    it("should fetch bookmarks with date filter", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRaindropResponse,
      } as Response);

      const sinceDate = new Date("2023-12-01T00:00:00Z");
      await client.fetchBookmarks("blog", sinceDate);

      // API no longer filters by date - we only filter client-side
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("search=%23blog"),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.not.stringContaining("created%3A%3E"),
        expect.any(Object)
      );
    });

    it("should handle empty response", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyResponse,
      } as Response);

      const result = await client.fetchBookmarks("blog");

      expect(result).toEqual([]);
    });

    it("should filter by exact tag match (case-insensitive)", async () => {
      const mockFetch = vi.mocked(fetch);
      const responseWithMixedTags = {
        result: true,
        items: [
          { ...mockRaindropResponse.items[0], tags: ["BLOG", "test"] },
          { ...mockRaindropResponse.items[1], tags: ["blogging", "test"] }, // Should be filtered out
        ],
        count: 2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithMixedTags,
      } as Response);

      const result = await client.fetchBookmarks("blog");

      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain("BLOG");
    });

    it("should filter out items missing required fields", async () => {
      const mockFetch = vi.mocked(fetch);
      const responseWithInvalidItems = {
        result: true,
        items: [mockRaindropResponse.items[0], mockItemMissingFields],
        count: 2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithInvalidItems,
      } as Response);

      const result = await client.fetchBookmarks("blog");

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe("123456789");
    });

    it("should handle 401 authentication error", async () => {
      const mockFetch = vi.mocked(fetch);
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: vi.fn().mockResolvedValue("Invalid token"),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.fetchBookmarks("blog")).rejects.toThrow(
        RaindropError
      );
      await expect(client.fetchBookmarks("blog")).rejects.toThrow(
        "Unauthorized"
      );
    });

    it("should handle 500 server error", async () => {
      const mockFetch = vi.mocked(fetch);
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: vi.fn().mockResolvedValue("Server error"),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.fetchBookmarks("blog")).rejects.toThrow(
        RaindropError
      );
      await expect(client.fetchBookmarks("blog")).rejects.toThrow(
        "Internal Server Error"
      );
    });

    it("should handle unsuccessful result", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse,
      } as Response);

      await expect(client.fetchBookmarks("blog")).rejects.toThrow(
        "unsuccessful result"
      );
    });

    it("should handle invalid response structure", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInvalidResponse,
      } as Response);

      await expect(client.fetchBookmarks("blog")).rejects.toThrow(
        "items is not an array"
      );
    });

    it("should handle network errors", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      await expect(client.fetchBookmarks("blog")).rejects.toThrow(
        "Failed to fetch bookmarks: Network failure"
      );
    });

    it("should filter by date on client side as well", async () => {
      const mockFetch = vi.mocked(fetch);
      const sinceDate = new Date("2024-01-01T18:00:00Z");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRaindropResponse,
      } as Response);

      const result = await client.fetchBookmarks("blog", sinceDate);

      // Only the second item should pass the date filter
      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe("987654321");
    });

    it("should include correct query parameters", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyResponse,
      } as Response);

      await client.fetchBookmarks("test-tag");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("search=%23test-tag");
      expect(callUrl).toContain("sort=-created"); // Updated to expect descending sort
      expect(callUrl).toContain("perpage=50");
    });
  });
});

describe("RaindropError", () => {
  it("should create error with status and response", () => {
    const error = new RaindropError("Test error", 404, { detail: "Not found" });

    expect(error.message).toBe("Test error");
    expect(error.name).toBe("RaindropError");
    expect(error.status).toBe(404);
    expect(error.response).toEqual({ detail: "Not found" });
  });
});
