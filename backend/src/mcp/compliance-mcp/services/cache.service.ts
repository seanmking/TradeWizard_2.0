/**
 * Simple in-memory caching service for the Compliance MCP
 */
export class CacheService {
  private cache: Map<string, {
    data: any;
    expiry: number;
  }> = new Map();
  
  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or undefined if not found or expired
   */
  public get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    const now = Date.now();
    if (item.expiry < now) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.data as T;
  }
  
  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttlMs Time to live in milliseconds (default: 1 hour)
   */
  public set(key: string, value: any, ttlMs: number = 60 * 60 * 1000): void {
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, {
      data: value,
      expiry
    });
  }
  
  /**
   * Remove a value from the cache
   * @param key Cache key
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all values from the cache
   */
  public clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get a value from the cache if it exists, or compute and cache it if it doesn't
   * @param key Cache key
   * @param fn Function to compute the value if not cached
   * @param ttlMs Time to live in milliseconds (default: 1 hour)
   * @returns The cached or computed value
   */
  public async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs: number = 60 * 60 * 1000
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const value = await fn();
    this.set(key, value, ttlMs);
    return value;
  }
  
  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  public getStats() {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;
    
    this.cache.forEach(item => {
      if (item.expiry >= now) {
        validCount++;
      } else {
        expiredCount++;
      }
    });
    
    return {
      totalItems: this.cache.size,
      validItems: validCount,
      expiredItems: expiredCount
    };
  }
}

// Export a singleton instance
export const cacheService = new CacheService(); 