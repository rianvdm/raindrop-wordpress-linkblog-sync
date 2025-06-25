import { describe, it, expect } from 'vitest';
import { getPostedItemKey, serializeJSON, deserializeJSON } from './kv';
import { KV_KEYS } from '../types/kv';

describe('KV Utilities', () => {
  describe('getPostedItemKey', () => {
    it('should generate correct key for posted items', () => {
      const raindropId = 'test-123';
      const key = getPostedItemKey(raindropId);
      expect(key).toBe(`${KV_KEYS.POSTED_PREFIX}test-123`);
    });

    it('should handle special characters in IDs', () => {
      const raindropId = 'test_id-123:456';
      const key = getPostedItemKey(raindropId);
      expect(key).toBe(`${KV_KEYS.POSTED_PREFIX}test_id-123:456`);
    });
  });

  describe('serializeJSON', () => {
    it('should serialize objects to JSON', () => {
      const data = { test: 'value', number: 123 };
      const result = serializeJSON(data);
      expect(result).toBe('{"test":"value","number":123}');
    });

    it('should serialize arrays', () => {
      const data = [1, 2, 3];
      const result = serializeJSON(data);
      expect(result).toBe('[1,2,3]');
    });

    it('should serialize dates', () => {
      const data = { date: new Date('2024-01-01T00:00:00Z') };
      const result = serializeJSON(data);
      expect(result).toBe('{"date":"2024-01-01T00:00:00.000Z"}');
    });
  });

  describe('deserializeJSON', () => {
    it('should deserialize JSON to objects', () => {
      const json = '{"test":"value","number":123}';
      const result = deserializeJSON(json);
      expect(result).toEqual({ test: 'value', number: 123 });
    });

    it('should deserialize arrays', () => {
      const json = '[1,2,3]';
      const result = deserializeJSON(json);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should throw on invalid JSON', () => {
      const invalidJson = 'not valid json';
      expect(() => deserializeJSON(invalidJson)).toThrow();
    });
  });
});