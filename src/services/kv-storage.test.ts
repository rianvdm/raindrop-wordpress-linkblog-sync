import { describe, it, expect, beforeEach } from 'vitest';
import { KVStorageService } from './kv-storage';
import { MockKVNamespace } from '../test/kv-mock';
import { KV_KEYS, POSTED_ITEM_TTL } from '../types/kv';

describe('KVStorageService', () => {
  let mockKV: MockKVNamespace;
  let service: KVStorageService;

  beforeEach(() => {
    mockKV = new MockKVNamespace();
    service = new KVStorageService(mockKV as unknown as KVNamespace);
  });

  describe('getLastFetchTime', () => {
    it('should return null when no last fetch time exists', async () => {
      const result = await service.getLastFetchTime();
      expect(result).toBeNull();
    });

    it('should return the stored last fetch time', async () => {
      const testDate = new Date('2024-01-01T12:00:00Z');
      await mockKV.put(KV_KEYS.LAST_FETCH, JSON.stringify({ timestamp: testDate.toISOString() }));

      const result = await service.getLastFetchTime();
      expect(result).toEqual(testDate);
    });

    it('should handle corrupted data gracefully', async () => {
      await mockKV.put(KV_KEYS.LAST_FETCH, 'invalid-json');

      const result = await service.getLastFetchTime();
      expect(result).toBeNull();
    });
  });

  describe('setLastFetchTime', () => {
    it('should store the last fetch time', async () => {
      const testDate = new Date('2024-01-01T12:00:00Z');
      await service.setLastFetchTime(testDate);

      const stored = await mockKV.get(KV_KEYS.LAST_FETCH);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.timestamp).toBe(testDate.toISOString());
    });

    it('should overwrite existing last fetch time', async () => {
      const date1 = new Date('2024-01-01T12:00:00Z');
      const date2 = new Date('2024-01-02T12:00:00Z');

      await service.setLastFetchTime(date1);
      await service.setLastFetchTime(date2);

      const result = await service.getLastFetchTime();
      expect(result).toEqual(date2);
    });
  });

  describe('isItemPosted', () => {
    it('should return false for unposted items', async () => {
      const result = await service.isItemPosted('test-id');
      expect(result).toBe(false);
    });

    it('should return true for posted items', async () => {
      const raindropId = 'test-id';
      await service.markItemAsPosted(raindropId);

      const result = await service.isItemPosted(raindropId);
      expect(result).toBe(true);
    });

    it('should use correct key format', async () => {
      const raindropId = 'test-id-123';
      await service.markItemAsPosted(raindropId);

      const key = `${KV_KEYS.POSTED_PREFIX}${raindropId}`;
      const stored = await mockKV.get(key);
      expect(stored).toBeTruthy();
    });
  });

  describe('markItemAsPosted', () => {
    it('should store posted item data', async () => {
      const raindropId = 'test-id';
      const beforePost = new Date();
      
      await service.markItemAsPosted(raindropId);
      
      const key = `${KV_KEYS.POSTED_PREFIX}${raindropId}`;
      const stored = await mockKV.get(key);
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.raindropId).toBe(raindropId);
      
      const postedAt = new Date(parsed.postedAt);
      expect(postedAt.getTime()).toBeGreaterThanOrEqual(beforePost.getTime());
    });

    it('should set TTL for posted items', async () => {
      // This test verifies the TTL is being passed to KV
      // In a real environment, the item would expire after 30 days
      const raindropId = 'test-id';
      let putOptions: any;
      
      // Override the put method to capture options
      const originalPut = mockKV.put.bind(mockKV);
      mockKV.put = async (key: string, value: string, options?: any) => {
        putOptions = options;
        return originalPut(key, value, options);
      };

      await service.markItemAsPosted(raindropId);

      expect(putOptions).toBeDefined();
      expect(putOptions.expirationTtl).toBe(POSTED_ITEM_TTL);
    });

    it('should allow re-marking items as posted', async () => {
      const raindropId = 'test-id';
      
      await service.markItemAsPosted(raindropId);
      // Should not throw when marking again
      await expect(service.markItemAsPosted(raindropId)).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle KV errors in getLastFetchTime', async () => {
      // Make KV throw an error
      mockKV.get = async () => {
        throw new Error('KV error');
      };

      const result = await service.getLastFetchTime();
      expect(result).toBeNull();
    });

    it('should throw error when setLastFetchTime fails', async () => {
      mockKV.put = async () => {
        throw new Error('KV error');
      };

      await expect(service.setLastFetchTime(new Date())).rejects.toThrow('Failed to update last fetch time');
    });

    it('should return false when isItemPosted encounters error', async () => {
      mockKV.get = async () => {
        throw new Error('KV error');
      };

      const result = await service.isItemPosted('test-id');
      expect(result).toBe(false);
    });

    it('should throw error when markItemAsPosted fails', async () => {
      mockKV.put = async () => {
        throw new Error('KV error');
      };

      await expect(service.markItemAsPosted('test-id')).rejects.toThrow('Failed to mark item test-id as posted');
    });
  });
});