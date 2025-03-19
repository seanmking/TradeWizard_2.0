import { CacheConfig } from '../config/product-detector.config';
import { ProductDetectionResult } from '../types/product-detection.types';

interface CacheEntry {
  data: ProductDetectionResult;
  timestamp: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
  }

  get(key: string): ProductDetectionResult | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.config.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: ProductDetectionResult): void {
    if (!this.config.enabled) return;

    // Enforce cache size limit
    if (this.cache.size >= this.config.maxEntries) {
      // Remove oldest entry
      const oldestKey = this.findOldestEntry();
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  // Helper method to generate cache key
  static generateKey(url: string, config: string): string {
    return `${url}:${config}`;
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): {size: number, maxSize: number, enabled: boolean} {
    return {
      size: this.cache.size,
      maxSize: this.config.maxEntries,
      enabled: this.config.enabled
    };
  }
} 