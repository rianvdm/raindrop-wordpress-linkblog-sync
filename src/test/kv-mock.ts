// ABOUTME: Mock KV namespace implementation for testing that simulates Cloudflare KV behavior.
// ABOUTME: Provides in-memory storage with TTL support and proper async interfaces for unit tests.
import { KVNamespace } from '@cloudflare/workers-types';

interface StoredValue {
  value: string;
  metadata?: any;
  expirationTtl?: number;
  expiresAt?: number;
}

export class MockKVNamespace {
  private store: Map<string, StoredValue> = new Map();

  async get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any> {
    const stored = this.store.get(key);
    if (!stored) return null;

    // Check expiration
    if (stored.expiresAt && Date.now() > stored.expiresAt) {
      this.store.delete(key);
      return null;
    }

    if (type === 'json') {
      return JSON.parse(stored.value);
    }

    return stored.value;
  }

  async put(key: string, value: string, options?: any): Promise<void> {
    const stored: StoredValue = { value };
    
    if (options?.expirationTtl) {
      stored.expirationTtl = options.expirationTtl;
      stored.expiresAt = Date.now() + (options.expirationTtl * 1000);
    }
    
    if (options?.metadata) {
      stored.metadata = options.metadata;
    }

    this.store.set(key, stored);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(options?: any): Promise<any> {
    const keys = Array.from(this.store.keys());
    return { keys: keys.map(name => ({ name })) };
  }

  // Methods not implemented for testing
  async getWithMetadata(key: string, type?: any): Promise<any> {
    const stored = this.store.get(key);
    if (!stored) return { value: null, metadata: null };

    // Check expiration
    if (stored.expiresAt && Date.now() > stored.expiresAt) {
      this.store.delete(key);
      return { value: null, metadata: null };
    }

    return { value: stored.value, metadata: stored.metadata || null };
  }

  // Clear all data (useful for tests)
  clear(): void {
    this.store.clear();
  }
}