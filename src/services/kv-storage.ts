import { KVNamespace } from '@cloudflare/workers-types';
import { LastFetchData, PostedItemData, KV_KEYS, POSTED_ITEM_TTL } from '../types/kv';
import { getPostedItemKey, serializeJSON, deserializeJSON } from '../utils/kv';

export class KVStorageService {
  constructor(private kv: KVNamespace) {}

  async getLastFetchTime(): Promise<Date | null> {
    try {
      const data = await this.kv.get(KV_KEYS.LAST_FETCH);
      if (!data) {
        return null;
      }
      const parsed: LastFetchData = deserializeJSON(data);
      return new Date(parsed.timestamp);
    } catch (error) {
      console.error('Error getting last fetch time:', error);
      return null;
    }
  }

  async setLastFetchTime(date: Date): Promise<void> {
    try {
      const data: LastFetchData = {
        timestamp: date.toISOString(),
      };
      await this.kv.put(KV_KEYS.LAST_FETCH, serializeJSON(data));
    } catch (error) {
      console.error('Error setting last fetch time:', error);
      throw new Error('Failed to update last fetch time');
    }
  }

  async isItemPosted(raindropId: string): Promise<boolean> {
    try {
      const key = getPostedItemKey(raindropId);
      const data = await this.kv.get(key);
      return data !== null;
    } catch (error) {
      console.error('Error checking if item is posted:', error);
      // In case of error, we return false to allow retry
      return false;
    }
  }

  async markItemAsPosted(raindropId: string): Promise<void> {
    try {
      const key = getPostedItemKey(raindropId);
      const data: PostedItemData = {
        raindropId,
        postedAt: new Date().toISOString(),
      };
      await this.kv.put(key, serializeJSON(data), {
        expirationTtl: POSTED_ITEM_TTL,
      });
    } catch (error) {
      console.error('Error marking item as posted:', error);
      throw new Error(`Failed to mark item ${raindropId} as posted`);
    }
  }
}