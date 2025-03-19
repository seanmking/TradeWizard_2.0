import Redis from 'ioredis';
import crypto from 'crypto';

class CacheOptimizer {
  private redisClient: Redis;

  constructor() {
    this.redisClient = new Redis(process.env.REDIS_URL);
  }

  // Generate a consistent cache key
  generateCacheKey(prefix: string, data: any): string {
    // Create a hash of the data to ensure unique but consistent key
    const serializedData = JSON.stringify(data);
    const hash = crypto
      .createHash('md5')
      .update(serializedData)
      .digest('hex');
    
    return `${prefix}:${hash}`;
  }

  // Cached method decorator
  cached(options: {
    prefix: string, 
    ttl?: number
  }) {
    return (
      target: any, 
      propertyKey: string, 
      descriptor: PropertyDescriptor
    ) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function(...args: any[]) {
        const cacheKey = this.generateCacheKey(
          options.prefix, 
          { method: propertyKey, args }
        );

        // Try to get cached result
        const cachedResult = await this.redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Cache the result
        await this.redisClient.set(
          cacheKey, 
          JSON.stringify(result), 
          'EX', 
          options.ttl || 3600 // Default 1 hour
        );

        return result;
      };

      return descriptor;
    };
  }

  // Intelligent cache invalidation
  async invalidateRelatedCaches(prefix: string) {
    const keys = await this.redisClient.keys(`${prefix}:*`);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }

  // Cache usage statistics
  async getCacheStats() {
    const keys = await this.redisClient.keys('*');
    
    // Get sizes of all keys
    const sizes = await Promise.all(
      keys.map(key => this.redisClient.strlen(key))
    );

    return {
      totalKeys: keys.length,
      totalSize: sizes.reduce((a, b) => a + b, 0),
      avgKeySize: sizes.reduce((a, b) => a + b, 0) / keys.length || 0
    };
  }

  // Prune old cache entries
  async pruneCache(maxAge: number = 86400) { // Default 24 hours
    const currentTime = Date.now();
    const keys = await this.redisClient.keys('*');

    for (const key of keys) {
      const ttl = await this.redisClient.ttl(key);
      
      // If TTL is less than maxAge, remove the key
      if (ttl < maxAge) {
        await this.redisClient.del(key);
      }
    }
  }
}

export default new CacheOptimizer();
