// ABOUTME: KV storage utilities for key generation and JSON serialization/deserialization.
// ABOUTME: Provides helper functions for consistent KV operations and data handling.
import { KV_KEYS } from "../types/kv";

export function getPostedItemKey(raindropId: string): string {
  return `${KV_KEYS.POSTED_PREFIX}${raindropId}`;
}

export function serializeJSON<T>(data: T): string {
  return JSON.stringify(data);
}

export function deserializeJSON<T>(data: string): T {
  return JSON.parse(data);
}
