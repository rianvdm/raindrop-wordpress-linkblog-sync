// ABOUTME: KV storage type definitions for sync state management and deduplication tracking.
// ABOUTME: Defines data structures for timestamps, posted items, and storage keys used in the sync process.
export interface LastFetchData {
  timestamp: string; // ISO 8601 timestamp
}

export interface PostedItemData {
  raindropId: string;
  postedAt: string; // ISO 8601 timestamp
}

// KV key patterns
export const KV_KEYS = {
  LAST_FETCH: "raindrop:lastFetched",
  POSTED_PREFIX: "raindrop:posted:",
} as const;

// TTL for posted items (30 days in seconds)
export const POSTED_ITEM_TTL = 30 * 24 * 60 * 60;
