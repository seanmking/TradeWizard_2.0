/**
 * Redis Cluster Service
 * 
 * Implements Redis clustering with failover support for TradeWizard 2.0
 * Designed to support horizontal scaling and high availability
 */

import Redis, { Cluster, ClusterOptions, RedisOptions } from 'ioredis';
import { EventEmitter } from 'events';
import { TTLConfig } from './redis-cache';

interface ClusterNode {
  host: string;
  port: number;
}

interface RedisClusterOptions {
  nodes: ClusterNode[];
  redisOptions?: RedisOptions;
  ttlConfig?: Partial<TTLConfig>;
  namespace?: string;
}

interface ClusterStats {
  hits: number;
  misses: number;
  savings: number;
  nodeStatus: Record<string, 'up' | 'down'>;
  commandsProcessed: number;
  lastReconnectTime?: Date;
  failovers: number;
}

/**
 * Redis Cluster Service
 * Provides distributed caching with high availability and horizontal scaling
 */
export class RedisClusterService extends EventEmitter {
  private cluster: Cluster;
  private stats: ClusterStats;
  private ttlConfig: TTLConfig;
  private isEnabled: boolean = true;
  private namespace: string;
  
  // Default TTL configuration (in seconds)
  private static readonly DEFAULT_TTL_CONFIG: TTLConfig = {
    regulatory: 24 * 60 * 60, // 24 hours
    marketTrends: 7 * 24 * 60 * 60, // 7 days
    countryProfiles: 30 * 24 * 60 * 60, // 30 days
    productInfo: 14 * 24 * 60 * 60, // 14 days
    default: 24 * 60 * 60 // 24 hours
  };
  
  /**
   * Create a new Redis cluster service
   * @param options - Cluster configuration options
   */
  constructor(options: RedisClusterOptions) {
    super();
    
    if (!options.nodes || options.nodes.length === 0) {
      throw new Error('At least one Redis node must be provided');
    }
    
    this.namespace = options.namespace || 'tw2:';
    
    // Initialize cluster stats
    this.stats = {
      hits: 0,
      misses: 0,
      savings: 0,
      nodeStatus: {},
      commandsProcessed: 0,
      failovers: 0
    };
    
    // Set up node status tracking
    options.nodes.forEach(node => {
      this.stats.nodeStatus[`${node.host}:${node.port}`] = 'up';
    });
    
    // Merge default TTL config with provided config
    this.ttlConfig = { 
      ...RedisClusterService.DEFAULT_TTL_CONFIG,
      ...(options.ttlConfig || {})
    };
    
    // Default cluster options
    const defaultClusterOptions: ClusterOptions = {
      clusterRetryStrategy: (times: number) => {
        const delay = Math.min(100 + times * 100, 2000);
        return delay;
      },
      redisOptions: {
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 10) {
            return null; // Stop retrying after 10 attempts
          }
          return Math.min(times * 100, 3000);
        },
        ...options.redisOptions
      }
    };
    
    // Initialize Redis cluster
    this.cluster = new Redis.Cluster(options.nodes, defaultClusterOptions);
    
    // Set up event handlers
    this.setupEventHandlers();
    
    console.log(`Redis cluster service initialized with ${options.nodes.length} nodes`);
  }
  
  /**
   * Setup event handlers for the cluster
   */
  private setupEventHandlers(): void {
    this.cluster.on('error', (err: Error) => {
      console.error('Redis cluster error:', err);
      this.emit('error', err);
    });
    
    this.cluster.on('node error', (err: Error, node: any) => {
      console.error(`Redis node error (${node.options.host}:${node.options.port}):`, err);
      this.stats.nodeStatus[`${node.options.host}:${node.options.port}`] = 'down';
      this.emit('nodeError', { node, error: err });
    });
    
    this.cluster.on('reconnecting', (time: number) => {
      console.log(`Redis cluster reconnecting after ${time}ms`);
      this.stats.lastReconnectTime = new Date();
      this.emit('reconnecting', time);
    });
    
    this.cluster.on('ready', () => {
      console.log('Redis cluster is ready');
      this.emit('ready');
    });
    
    this.cluster.on('+node', (node: any) => {
      console.log(`Node added to Redis cluster: ${node.options.host}:${node.options.port}`);
      this.stats.nodeStatus[`${node.options.host}:${node.options.port}`] = 'up';
      this.emit('nodeAdded', node);
    });
    
    this.cluster.on('-node', (node: any) => {
      console.log(`Node removed from Redis cluster: ${node.options.host}:${node.options.port}`);
      this.stats.nodeStatus[`${node.options.host}:${node.options.port}`] = 'down';
      this.emit('nodeRemoved', node);
    });
    
    this.cluster.on('node end', (node: any) => {
      this.stats.nodeStatus[`${node.options.host}:${node.options.port}`] = 'down';
    });
    
    this.cluster.on('select', () => {
      this.stats.commandsProcessed++;
    });
  }
  
  /**
   * Get data from the cluster cache
   * @param key - The cache key
   * @param estimatedTokenSavings - Estimated token savings for cost tracking
   * @returns The cached data or null if not found
   */
  async get<T>(key: string, estimatedTokenSavings?: number): Promise<T | null> {
    if (!this.isEnabled) return null;
    
    try {
      const fullKey = this.namespace + key;
      const data = await this.cluster.get(fullKey);
      
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
      this.emit('error', error);
      return null;
    }
  }
  
  /**
   * Store data in the cluster cache
   * @param key - The cache key
   * @param data - The data to cache
   * @param dataType - Type of data (affects TTL)
   */
  async set<T>(key: string, data: T, dataType: keyof TTLConfig = 'default'): Promise<void> {
    if (!this.isEnabled) return;
    
    try {
      const fullKey = this.namespace + key;
      const ttl = this.ttlConfig[dataType] || this.ttlConfig.default;
      
      await this.cluster.set(fullKey, JSON.stringify(data), 'EX', ttl);
      console.log(`Stored in cluster cache: ${key} with TTL ${ttl}s`);
    } catch (error) {
      console.error(`Error storing in cluster cache: ${error}`);
      this.emit('error', error);
    }
  }
  
  /**
   * Delete a key from the cluster cache
   * @param key - The cache key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.namespace + key;
      await this.cluster.del(fullKey);
    } catch (error) {
      console.error(`Error deleting from cluster cache: ${error}`);
      this.emit('error', error);
    }
  }
  
  /**
   * Clear all keys with the service namespace
   * Note: In a large cluster, this operation should be used with caution
   */
  async clear(): Promise<void> {
    try {
      // This requires running the KEYS command on each node
      // For large datasets, consider using a more targeted approach
      const pipeline = this.cluster.pipeline();
      const nodes = this.cluster.nodes();
      
      for (const node of nodes) {
        node.keys(`${this.namespace}*`, (err, keys) => {
          if (err) {
            console.error(`Error getting keys from node: ${err}`);
            return;
          }
          
          if (keys.length > 0) {
            node.del(...keys, (err) => {
              if (err) console.error(`Error deleting keys: ${err}`);
            });
          }
        });
      }
      
      await pipeline.exec();
      console.log('Cleared keys from cluster cache');
    } catch (error) {
      console.error(`Error clearing cluster cache: ${error}`);
      this.emit('error', error);
    }
  }
  
  /**
   * Get cluster statistics including hit rate and estimated cost savings
   */
  getStats(): ClusterStats & { hitRate: number, nodeCount: number, healthyNodes: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    
    const nodeCount = Object.keys(this.stats.nodeStatus).length;
    const healthyNodes = Object.values(this.stats.nodeStatus).filter(status => status === 'up').length;
    
    return {
      ...this.stats,
      hitRate,
      nodeCount,
      healthyNodes
    };
  }
  
  /**
   * Reset cluster statistics
   */
  resetStats(): void {
    const nodeStatus = this.stats.nodeStatus;
    this.stats = { 
      hits: 0, 
      misses: 0, 
      savings: 0, 
      nodeStatus,
      commandsProcessed: 0,
      failovers: 0
    };
  }
  
  /**
   * Enable or disable the cache
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`Redis cluster cache ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Check if the cluster is healthy
   * @returns Boolean indicating if the majority of nodes are available
   */
  isHealthy(): boolean {
    const nodeCount = Object.keys(this.stats.nodeStatus).length;
    const healthyNodes = Object.values(this.stats.nodeStatus).filter(status => status === 'up').length;
    
    // Healthy if more than half of nodes are up
    return healthyNodes > nodeCount / 2;
  }
  
  /**
   * Get the current cluster state
   */
  getClusterInfo(): Promise<any> {
    return this.cluster.cluster('info');
  }
  
  /**
   * Close all connections
   */
  async disconnect(): Promise<void> {
    await this.cluster.disconnect();
    console.log('Redis cluster disconnected');
  }
}

/**
 * Migration helper to move from standalone Redis to cluster
 */
export class RedisClusterMigrator {
  private sourceClient: Redis;
  private targetCluster: RedisClusterService;
  private keyPattern: string;
  private batchSize: number;
  
  /**
   * Create a new Redis cluster migrator
   * @param sourceRedisUrl - Source Redis URL
   * @param targetCluster - Target Redis cluster
   * @param keyPattern - Pattern of keys to migrate (default: '*')
   * @param batchSize - Number of keys to migrate at once (default: 100)
   */
  constructor(
    sourceRedisUrl: string,
    targetCluster: RedisClusterService,
    keyPattern: string = '*',
    batchSize: number = 100
  ) {
    this.sourceClient = new Redis(sourceRedisUrl);
    this.targetCluster = targetCluster;
    this.keyPattern = keyPattern;
    this.batchSize = batchSize;
  }
  
  /**
   * Migrate keys from standalone Redis to cluster
   * @returns Statistics about the migration
   */
  async migrateKeys(): Promise<{ total: number, successful: number, failed: number }> {
    const stats = { total: 0, successful: 0, failed: 0 };
    
    try {
      console.log(`Starting Redis migration with pattern: ${this.keyPattern}`);
      
      // Scan for all keys matching the pattern
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.sourceClient.scan(
          cursor, 
          'MATCH', 
          this.keyPattern, 
          'COUNT', 
          this.batchSize.toString()
        );
        
        cursor = nextCursor;
        stats.total += keys.length;
        
        if (keys.length === 0) continue;
        
        // Process keys in batches
        const pipeline = this.sourceClient.pipeline();
        
        // Get values and TTLs for each key
        for (const key of keys) {
          pipeline.get(key);
          pipeline.ttl(key);
        }
        
        const results = await pipeline.exec();
        
        // Process and migrate each key
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const value = results![i * 2][1];
          const ttl = results![i * 2 + 1][1] as number;
          
          try {
            // Remove namespace prefix if present (to avoid double-prefixing)
            const cleanKey = key.replace(/^tw2:/, '');
            
            if (ttl > 0) {
              // Use the Redis Cluster's set method which will add the namespace
              await this.targetCluster.set(cleanKey, JSON.parse(value as string), 'default');
              stats.successful++;
            } else if (ttl === -1) {
              // For keys with no expiration, use default TTL
              await this.targetCluster.set(cleanKey, JSON.parse(value as string), 'default');
              stats.successful++;
            } else {
              // Skip expired keys
              console.log(`Skipping expired key: ${key}`);
            }
          } catch (error) {
            console.error(`Error migrating key ${key}: ${error}`);
            stats.failed++;
          }
        }
        
        console.log(`Migrated batch of ${keys.length} keys. Progress: ${stats.successful + stats.failed}/${stats.total}`);
      } while (cursor !== '0');
      
      console.log(`Migration completed. Total: ${stats.total}, Successful: ${stats.successful}, Failed: ${stats.failed}`);
      return stats;
    } catch (error) {
      console.error(`Migration error: ${error}`);
      throw error;
    } finally {
      // Close source connection
      await this.sourceClient.quit();
    }
  }
}

// Factory function to create a Redis cluster service with sensible defaults
export function createRedisCluster(
  nodes: ClusterNode[] = [{ host: '127.0.0.1', port: 6379 }],
  options: Partial<RedisClusterOptions> = {}
): RedisClusterService {
  return new RedisClusterService({
    nodes,
    ...options
  });
} 