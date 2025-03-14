/**
 * Redis-based cache service for regulatory and market data
 * Provides persistent caching with configurable TTL based on data type
 */

import Redis from 'ioredis';
import costMonitoringService from '../cost-monitoring';

// Cache hit/miss statistics for reporting
interface CacheStats {
  hits: number;
  misses: number;
  savings: number;
}

// TTL configuration by data type
export interface TTLConfig {
  regulatory: number;
  marketTrends: number;
  countryProfiles: number;
  productInfo: number;
  default: number;
}

// Default TTL configuration (in seconds)
const DEFAULT_TTL_CONFIG: TTLConfig = {
  regulatory: 24 * 60 * 60, // 24 hours
  marketTrends: 7 * 24 * 60 * 60, // 7 days
  countryProfiles: 30 * 24 * 60 * 60, // 30 days
  productInfo: 14 * 24 * 60 * 60, // 14 days
  default: 24 * 60 * 60 // 24 hours
};

/**
 * Redis Cache Service for persisting and retrieving cached data
 * with support for different TTLs based on data types
 */
export class RedisCacheService {
  private client: Redis;
  private stats: CacheStats = { hits: 0, misses: 0, savings: 0 };
  private ttlConfig: TTLConfig;
  private isEnabled: boolean = true;
  private prefix: string = 'tw2:';
  
  /**
   * Create a new Redis cache service
   * @param redisUrl - Redis connection URL (defaults to environment variable or localhost)
   * @param ttlConfig - Custom TTL configuration
   */
  constructor(
    redisUrl?: string,
    ttlConfig: Partial<TTLConfig> = {}
  ) {
    // Use environment variable, provided URL, or default to localhost
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Initialize Redis client
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      enableOfflineQueue: true
    });
    
    // Set up error handler
    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    // Merge default TTL config with provided config
    this.ttlConfig = { 
      ...DEFAULT_TTL_CONFIG,
      ...ttlConfig
    };
    
    console.log('Redis cache service initialized');
  }
  
  /**
   * Enable or disable the cache service
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
  
  /**
   * Get data from the cache
   * @param key - The cache key
   * @param dataType - Type of data (affects TTL)
   * @returns The cached data or null if not found
   */
  async get<T>(key: string, estimatedTokenSavings?: number): Promise<T | null> {
    if (!this.isEnabled) return null;
    
    try {
      const fullKey = this.prefix + key;
      const data = await this.client.get(fullKey);
      
      if (data) {
        // Cache hit
        this.stats.hits++;
        
        // Track cost savings if provided
        if (estimatedTokenSavings) {
          // Assuming GPT-4 token costs for savings calculation
          const tokenCost = 0.03 / 1000; // $0.03 per 1000 tokens for GPT-4
          const savings = estimatedTokenSavings * tokenCost;
          this.stats.savings += savings;
          
          console.log(`Cache hit for ${key}. Estimated savings: $${savings.toFixed(6)}`);
        } else {
          console.log(`Cache hit for ${key}`);
        }
        
        return JSON.parse(data) as T;
      }
      
      // Cache miss
      this.stats.misses++;
      console.log(`Cache miss for ${key}`);
      return null;
    } catch (error) {
      console.error(`Error retrieving from cache: ${error}`);
      return null;
    }
  }
  
  /**
   * Store data in the cache
   * @param key - The cache key
   * @param data - The data to cache
   * @param dataType - Type of data (affects TTL)
   */
  async set<T>(key: string, data: T, dataType: keyof TTLConfig = 'default'): Promise<void> {
    if (!this.isEnabled) return;
    
    try {
      const fullKey = this.prefix + key;
      const ttl = this.ttlConfig[dataType] || this.ttlConfig.default;
      
      await this.client.set(fullKey, JSON.stringify(data), 'EX', ttl);
      console.log(`Stored in cache: ${key} with TTL ${ttl}s`);
    } catch (error) {
      console.error(`Error storing in cache: ${error}`);
    }
  }
  
  /**
   * Delete a key from the cache
   * @param key - The cache key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.prefix + key;
      await this.client.del(fullKey);
    } catch (error) {
      console.error(`Error deleting from cache: ${error}`);
    }
  }
  
  /**
   * Clear all keys with the service prefix
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      
      if (keys.length > 0) {
        await this.client.del(...keys);
        console.log(`Cleared ${keys.length} keys from cache`);
      }
    } catch (error) {
      console.error(`Error clearing cache: ${error}`);
    }
  }
  
  /**
   * Get cache statistics including hit rate and estimated cost savings
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    
    return {
      ...this.stats,
      hitRate
    };
  }
  
  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, savings: 0 };
  }
  
  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }
}

// Create singleton instance
const redisCacheService = new RedisCacheService();
export default redisCacheService; 