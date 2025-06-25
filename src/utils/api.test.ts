import { describe, it, expect } from 'vitest';
import { buildQueryString, parseRaindropDate, formatDateForRaindrop } from './api';

describe('API Utilities', () => {
  describe('buildQueryString', () => {
    it('should build query string from object', () => {
      const params = {
        search: '#blog',
        sort: 'created',
        perpage: 50,
      };
      
      const result = buildQueryString(params);
      expect(result).toBe('?search=%23blog&sort=created&perpage=50');
    });

    it('should handle special characters', () => {
      const params = {
        search: '#tag with spaces',
        filter: 'type:article',
      };
      
      const result = buildQueryString(params);
      expect(result).toBe('?search=%23tag%20with%20spaces&filter=type%3Aarticle');
    });

    it('should filter out undefined values', () => {
      const params = {
        search: '#blog',
        sort: undefined,
        perpage: 50,
        filter: '',
      };
      
      const result = buildQueryString(params);
      expect(result).toBe('?search=%23blog&perpage=50&filter=');
    });

    it('should return empty string for empty object', () => {
      const result = buildQueryString({});
      expect(result).toBe('');
    });

    it('should handle boolean values', () => {
      const params = {
        nested: true,
        public: false,
      };
      
      const result = buildQueryString(params);
      expect(result).toBe('?nested=true&public=false');
    });
  });

  describe('parseRaindropDate', () => {
    it('should parse ISO 8601 date string', () => {
      const dateString = '2024-01-01T12:00:00.000Z';
      const result = parseRaindropDate(dateString);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(new Date(dateString).getTime());
    });

    it('should handle different ISO formats', () => {
      const dateString = '2024-01-01T12:00:00Z';
      const result = parseRaindropDate(dateString);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getDate()).toBe(1);
    });
  });

  describe('formatDateForRaindrop', () => {
    it('should format date as ISO 8601 string', () => {
      const date = new Date('2024-01-01T12:00:00.000Z');
      const result = formatDateForRaindrop(date);
      
      expect(result).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should handle different timezones consistently', () => {
      const date = new Date(2024, 0, 1, 12, 0, 0); // Local time
      const result = formatDateForRaindrop(date);
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should be compatible with parseRaindropDate', () => {
      const originalDate = new Date('2024-01-01T12:00:00.000Z');
      const formatted = formatDateForRaindrop(originalDate);
      const parsed = parseRaindropDate(formatted);
      
      expect(parsed.getTime()).toBe(originalDate.getTime());
    });
  });
});