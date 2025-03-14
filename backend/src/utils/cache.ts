/**
 * Cache utilities
 */

// Simple in-memory cache
class MemoryCache {
  private cache: Map<string, { value: any; expiry: number }>;
  private maxSize: number;
  
  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if the item has expired
    if (item.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }
  
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    // Implement LRU eviction if we hit the max size
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }
  
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
  
  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// Create a singleton cache instance
export const cache = new MemoryCache();

// Caching decorator function
export function cacheable(ttlSeconds: number = 3600) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Create a cache key from the method name and arguments
      const cacheKey = `${propertyKey}_${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult !== null) {
        console.log(`Cache hit for ${cacheKey}`);
        return cachedResult;
      }
      
      // Execute the original method
      const result = await originalMethod.apply(this, args);
      
      // Store in cache
      await cache.set(cacheKey, result, ttlSeconds);
      
      return result;
    };
    
    return descriptor;
  };
} 