/**
 * Simple in-memory cache with time-to-live (TTL) for query results
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * A generic cache implementation with TTL support
 */
export class QueryCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTtlMs: number;
  private maxEntries: number;
  private cleanupInterval: NodeJS.Timeout;

  /**
   * Create a new cache with TTL
   * @param defaultTtlMs - Default time-to-live in milliseconds
   * @param maxEntries - Maximum number of entries (defaults to 1000)
   * @param cleanupIntervalMs - Interval for cleanup in milliseconds (defaults to 5 minutes)
   */
  constructor(
    defaultTtlMs: number,
    maxEntries: number = 1000,
    cleanupIntervalMs: number = 5 * 60 * 1000
  ) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
    
    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.removeExpiredEntries();
    }, cleanupIntervalMs);
  }

  /**
   * Get a value from the cache
   * @param key - The cache key
   * @returns The cached value or undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    // Check if the entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  /**
   * Set a value in the cache
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttlMs - Optional custom TTL in milliseconds
   */
  set(key: string, value: T, ttlMs?: number): void {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.removeOldestEntry();
    }
    
    const expiresAt = Date.now() + (ttlMs || this.defaultTtlMs);
    
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  /**
   * Check if a key exists in the cache and is not expired
   * @param key - The cache key
   * @returns True if the key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove a key from the cache
   * @param key - The cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of entries in the cache
   */
  size(): number {
    this.removeExpiredEntries(); // Clean up expired entries first
    return this.cache.size;
  }

  /**
   * Remove all expired entries from the cache
   */
  private removeExpiredEntries(): void {
    const now = Date.now();
    
    // Convert Map entries to array for safer iteration
    const entries = Array.from(this.cache.entries());
    
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Remove the oldest entry from the cache
   */
  private removeOldestEntry(): void {
    // If cache is empty, do nothing
    if (this.cache.size === 0) {
      return;
    }
    
    // Find the oldest entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    // Convert Map entries to array for safer iteration
    const entries = Array.from(this.cache.entries());
    
    for (const [key, entry] of entries) {
      if (entry.expiresAt < oldestTime) {
        oldestKey = key;
        oldestTime = entry.expiresAt;
      }
    }
    
    // Delete the oldest entry
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up resources when the cache is no longer needed
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
} 