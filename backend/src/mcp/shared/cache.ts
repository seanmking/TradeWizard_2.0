import Redis, { RedisOptions } from 'ioredis';
import { MCPResponse, MCPCacheConfig } from './types';

export class RedisCache {
  private client: Redis;

  constructor(config: RedisOptions = {}) {
    this.client = new Redis(config);
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.client.setex(key, ttl, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    await this.client.flushall();
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export class MCPCache {
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

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set<T>(key: string, value: T, config: MCPCacheConfig): Promise<void> {
    if (!config.enabled) return;
    await this.redis.set(key, JSON.stringify(value), 'EX', config.ttl);
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

  generateKey(mcpType: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = params[key];
          return acc;
        },
        {} as Record<string, unknown>
      );

    return `mcp:${mcpType}:${JSON.stringify(sortedParams)}`;
  }
}

export const mcpCache = MCPCache.getInstance();
