import Redis from 'ioredis';
import { MCPResponse, MCPCacheConfig } from './schema';

class MCPCache {
  private redis: Redis;
  private static instance: MCPCache;

  private constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  public static getInstance(): MCPCache {
    if (!MCPCache.instance) {
      MCPCache.instance = new MCPCache();
    }
    return MCPCache.instance;
  }

  async get<T>(key: string): Promise<MCPResponse<T> | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as MCPResponse<T>;
  }

  async set(key: string, value: MCPResponse<any>, config: MCPCacheConfig): Promise<void> {
    await this.redis.set(
      key,
      JSON.stringify(value),
      'EX',
      config.ttl
    );
  }

  async prefetch(keys: string[]): Promise<void> {
    // Implement prefetching logic here
    // This will be called by the prefetch engine
  }

  async invalidate(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  generateKey(mcpType: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    return `mcp:${mcpType}:${JSON.stringify(sortedParams)}`;
  }
}

export const mcpCache = MCPCache.getInstance(); 