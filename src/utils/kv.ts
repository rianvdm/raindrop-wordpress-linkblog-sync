import { KV_KEYS } from '../types/kv';

export function getPostedItemKey(raindropId: string): string {
  return `${KV_KEYS.POSTED_PREFIX}${raindropId}`;
}

export function serializeJSON<T>(data: T): string {
  return JSON.stringify(data);
}

export function deserializeJSON<T>(data: string): T {
  return JSON.parse(data);
}