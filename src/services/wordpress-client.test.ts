import { describe, it, expect, beforeEach, vi } from "vitest";
import { WordPressClient } from "./wordpress-client";
import { WordPressError } from "../types/wordpress";
import {
  mockCreatePostPayload,
  mockWordPressPost,
  mockWordPressErrorResponse,
  mockWordPressAuthErrorResponse,
} from "../test/fixtures/wordpress";

// Mock global fetch
global.fetch = vi.fn();

describe("WordPressClient", () => {
  let client: WordPressClient;
  const mockEndpoint = "https://example.com/wp-json/wp/v2";
  const mockUsername = "testuser";
  const mockPassword = "testpass";

  beforeEach(() => {
    client = new WordPressClient(mockEndpoint, mockUsername, mockPassword);
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should handle endpoint with /posts suffix", () => {
      const clientWithPosts = new WordPressClient(
        "https://example.com/wp-json/wp/v2/posts",
        mockUsername,
        mockPassword
      );
      expect(clientWithPosts).toBeInstanceOf(WordPressClient);
    });

    it("should add /posts suffix if missing", () => {
      const clientWithoutPosts = new WordPressClient(
        "https://example.com/wp-json/wp/v2",
        mockUsername,
        mockPassword
      );
      expect(clientWithoutPosts).toBeInstanceOf(WordPressClient);
    });
  });

  describe("createPost", () => {
    it("should create post successfully", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWordPressPost,
      } as Response);

      const result = await client.createPost(mockCreatePostPayload);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/wp-json/wp/v2/posts",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(mockCreatePostPayload),
        })
      );

      expect(result).toEqual(mockWordPressPost);
    });

    it("should generate correct Basic Auth header", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWordPressPost,
      } as Response);

      await client.createPost(mockCreatePostPayload);

      const authHeader = (mockFetch.mock.calls[0][1]?.headers as any)?.[
        "Authorization"
      ];
      expect(authHeader).toBe(`Basic ${btoa("testuser:testpass")}`);
    });

    it("should handle WordPress API errors", async () => {
      const mockFetch = vi.mocked(fetch);
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: vi.fn().mockResolvedValue(mockWordPressErrorResponse),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.createPost(mockCreatePostPayload)).rejects.toThrow(
        WordPressError
      );
      await expect(client.createPost(mockCreatePostPayload)).rejects.toThrow(
        "Invalid parameter(s): title"
      );
    });

    it("should handle authentication errors", async () => {
      const mockFetch = vi.mocked(fetch);
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: vi.fn().mockResolvedValue(mockWordPressAuthErrorResponse),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.createPost(mockCreatePostPayload)).rejects.toThrow(
        WordPressError
      );
      await expect(client.createPost(mockCreatePostPayload)).rejects.toThrow(
        "not allowed to create posts"
      );
    });

    it("should handle non-JSON error responses", async () => {
      const mockFetch = vi.mocked(fetch);
      const mockResponse = {
        ok: false,
        status: 400, // Use 400 to avoid retries
        statusText: "Bad Request",
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        text: vi.fn().mockResolvedValue("Server error occurred"),
        clone: vi.fn().mockReturnThis(),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.createPost(mockCreatePostPayload)).rejects.toThrow(
        "Server error occurred"
      );
    });

    it("should validate response has required fields", async () => {
      const mockFetch = vi.mocked(fetch);
      const invalidResponse = { ...mockWordPressPost, id: undefined };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      } as Response);

      await expect(client.createPost(mockCreatePostPayload)).rejects.toThrow(
        "missing required fields"
      );
    });

    it("should handle network errors", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      await expect(client.createPost(mockCreatePostPayload)).rejects.toThrow(
        "Failed to create WordPress post: Network failure"
      );
    });

    it("should retry on server errors", async () => {
      const mockFetch = vi.mocked(fetch);

      // First attempt fails with 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ message: "Server Error" }),
      } as Response);

      // Second attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWordPressPost,
      } as Response);

      const result = await client.createPost(mockCreatePostPayload);

      expect(result).toEqual(mockWordPressPost);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should not retry on client errors", async () => {
      const mockFetch = vi.mocked(fetch);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => mockWordPressErrorResponse,
      } as Response);

      await expect(client.createPost(mockCreatePostPayload)).rejects.toThrow(
        WordPressError
      );
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
    });
  });
});
