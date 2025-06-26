// ABOUTME: Raindrop.io API client that fetches bookmarks with specific tags and date filtering.
// ABOUTME: Handles authentication and provides methods to retrieve bookmarks for syncing to WordPress.
import {
  RaindropItem,
  RaindropResponse,
  RaindropError,
} from "../types/raindrop";
import { RAINDROP_API_BASE, buildQueryString } from "../utils/api";

export class RaindropClient {
  constructor(private token: string) {}

  async fetchBookmarks(tag: string, since?: Date): Promise<RaindropItem[]> {
    try {
      // Build query parameters
      const params: Record<string, string | number | boolean | undefined> = {
        search: `#${tag}`,
        sort: "-created", // Sort by creation date descending (newest first)
        perpage: 50, // Fetch up to 50 items per page
      };

      // Note: Raindrop API doesn't support filtering by modification date,
      // only by creation date. Since we need to catch old bookmarks with new tags,
      // we'll fetch all bookmarks with the tag and filter by lastUpdate client-side.

      const url = `${RAINDROP_API_BASE}/raindrops/0${buildQueryString(params)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new RaindropError(
          `Raindrop API error: ${response.statusText}`,
          response.status,
          await response.text()
        );
      }

      const data: RaindropResponse = await response.json();

      if (!data.result) {
        throw new RaindropError(
          "Raindrop API returned unsuccessful result",
          undefined,
          data
        );
      }

      // Validate response structure
      if (!Array.isArray(data.items)) {
        throw new RaindropError(
          "Invalid response structure: items is not an array",
          undefined,
          data
        );
      }

      // Filter items to ensure they have the required fields
      const validItems = data.items.filter(
        item =>
          item._id &&
          item.title &&
          item.link &&
          item.created &&
          Array.isArray(item.tags)
      );

      // Additional filtering by exact tag match (case-insensitive)
      const tagLower = tag.toLowerCase();
      const taggedItems = validItems.filter(item =>
        item.tags.some(t => t.toLowerCase() === tagLower)
      );

      // If we have a since date, also filter by lastUpdate date
      // This is a double-check since the API should handle it
      let filteredItems = taggedItems;
      if (since) {
        filteredItems = taggedItems.filter(item => {
          const itemDate = new Date(item.lastUpdate || item.created);
          return itemDate > since;
        });
      }

      // Sort by creation date descending (newest first) as a final guarantee
      return filteredItems.sort((a, b) => {
        const dateA = new Date(a.created);
        const dateB = new Date(b.created);
        return dateB.getTime() - dateA.getTime(); // Descending order
      });
    } catch (error) {
      if (error instanceof RaindropError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new RaindropError(`Failed to fetch bookmarks: ${error.message}`);
      }

      throw new RaindropError(
        "Unknown error occurred while fetching bookmarks"
      );
    }
  }
}
