/**
 * Redis Migration Utility
 * 
 * Provides tools to gradually migrate from singleton Redis to a Redis cluster
 * with minimal downtime and zero data loss.
 */

import { RedisCacheService } from './redis-cache';
import { RedisClusterService, RedisClusterMigrator } from './redis-cluster';

/**
 * Configuration for dual-write migration
 */
interface DualWriteMigrationConfig {
  // How long to maintain dual writes before switching read strategy
  dualWriteDurationMs: number;
  // Percentage of reads to direct to cluster during migration (0-100)
  clusterReadPercentage: number;
  // Whether to verify data consistency between systems
  verifyConsistency: boolean;
  // Log level: 'error', 'warn', 'info', 'debug'
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Redis Dual-Write Migration Service
 * 
 * Implements the dual-write pattern to safely migrate from a singleton Redis
 * to a Redis cluster with zero data loss and minimal performance impact.
 */
export class RedisDualWriteMigrationService {
  private singletonCache: RedisCacheService;
  private clusterCache: RedisClusterService;
  private config: DualWriteMigrationConfig;
  private migrationStartTime: number;
  private migrationCompleted: boolean = false;
  private inconsistenciesFound: number = 0;
  
  /**
   * Create a new dual-write migration service
   * @param singletonCache - Existing singleton Redis cache
   * @param clusterCache - Target Redis cluster
   * @param config - Migration configuration options
   */
  constructor(
    singletonCache: RedisCacheService,
    clusterCache: RedisClusterService,
    config: Partial<DualWriteMigrationConfig> = {}
  ) {
    this.singletonCache = singletonCache;
    this.clusterCache = clusterCache;
    
    // Default configuration
    this.config = {
      dualWriteDurationMs: 3 * 24 * 60 * 60 * 1000, // 3 days
      clusterReadPercentage: 0, // Start with 0% reads from cluster
      verifyConsistency: true,
      logLevel: 'info',
      ...config
    };
    
    this.migrationStartTime = Date.now();
    this.log('info', 'Dual-write migration service initialized');
  }
  
  /**
   * Initialize the migration process
   * This will copy existing data and configure dual writes
   */
  async initializeMigration(batchSize: number = 100): Promise<void> {
    this.log('info', 'Starting Redis migration initialization');
    
    try {
      // Migrate existing data
      const migrator = new RedisClusterMigrator(
        process.env.REDIS_URL || 'redis://localhost:6379',
        this.clusterCache,
        'tw2:*',
        batchSize
      );
      
      const stats = await migrator.migrateKeys();
      this.log('info', `Initial data migration completed. Migrated ${stats.successful} of ${stats.total} keys successfully.`);
      
      this.migrationStartTime = Date.now();
      this.log('info', 'Dual-write phase started');
    } catch (error) {
      this.log('error', `Migration initialization failed: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get a value from cache during migration
   * Uses a weighted strategy based on configuration
   */
  async get<T>(key: string, estimatedTokenSavings?: number): Promise<T | null> {
    // If migration complete, use cluster only
    if (this.migrationCompleted) {
      return this.clusterCache.get<T>(key, estimatedTokenSavings);
    }
    
    // Calculate if we should read from cluster based on configured percentage
    const useCluster = Math.random() * 100 < this.config.clusterReadPercentage;
    
    if (useCluster) {
      const clusterValue = await this.clusterCache.get<T>(key);
      
      // Verify consistency if configured
      if (this.config.verifyConsistency) {
        setTimeout(async () => {
          await this.verifyConsistency(key, clusterValue);
        }, 0);
      }
      
      return clusterValue;
    } else {
      // Default to singleton Redis
      return this.singletonCache.get<T>(key, estimatedTokenSavings);
    }
  }
  
  /**
   * Set a value in both caches during migration
   */
  async set<T>(key: string, data: T, dataType: any = 'default'): Promise<void> {
    if (this.migrationCompleted) {
      // Migration complete, write only to cluster
      await this.clusterCache.set<T>(key, data, dataType);
      return;
    }
    
    // During migration, write to both systems
    try {
      // Write in parallel but wait for both to complete
      await Promise.all([
        this.singletonCache.set<T>(key, data, dataType),
        this.clusterCache.set<T>(key, data, dataType)
      ]);
    } catch (error) {
      this.log('error', `Dual-write failed for key ${key}: ${error}`);
      // Always make sure the primary system has the data
      await this.singletonCache.set<T>(key, data, dataType);
      throw error;
    }
  }
  
  /**
   * Delete a key from both caches during migration
   */
  async delete(key: string): Promise<void> {
    if (this.migrationCompleted) {
      // Migration complete, delete only from cluster
      await this.clusterCache.delete(key);
      return;
    }
    
    // During migration, delete from both systems
    try {
      await Promise.all([
        this.singletonCache.delete(key),
        this.clusterCache.delete(key)
      ]);
    } catch (error) {
      this.log('error', `Dual-delete failed for key ${key}: ${error}`);
      // Always make sure to delete from primary
      await this.singletonCache.delete(key);
      throw error;
    }
  }
  
  /**
   * Check migration status and progress
   */
  getMigrationStatus(): {
    inProgress: boolean;
    daysElapsed: number;
    daysRemaining: number;
    percentComplete: number;
    clusterReadPercentage: number;
    inconsistenciesFound: number;
  } {
    const now = Date.now();
    const elapsedMs = now - this.migrationStartTime;
    const daysElapsed = elapsedMs / (24 * 60 * 60 * 1000);
    
    const percentComplete = Math.min(
      100,
      (elapsedMs / this.config.dualWriteDurationMs) * 100
    );
    
    const daysRemaining = Math.max(
      0,
      (this.config.dualWriteDurationMs - elapsedMs) / (24 * 60 * 60 * 1000)
    );
    
    return {
      inProgress: !this.migrationCompleted,
      daysElapsed,
      daysRemaining,
      percentComplete,
      clusterReadPercentage: this.config.clusterReadPercentage,
      inconsistenciesFound: this.inconsistenciesFound
    };
  }
  
  /**
   * Update the cluster read percentage
   * @param percentage - New percentage (0-100)
   */
  updateClusterReadPercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
    
    this.config.clusterReadPercentage = percentage;
    this.log('info', `Cluster read percentage updated to ${percentage}%`);
  }
  
  /**
   * Complete the migration process
   * This will finalize the migration and direct all traffic to the cluster
   */
  async completeMigration(): Promise<void> {
    // Final migration to ensure all data is synchronized
    this.log('info', 'Running final data synchronization');
    
    try {
      const migrator = new RedisClusterMigrator(
        process.env.REDIS_URL || 'redis://localhost:6379',
        this.clusterCache,
        'tw2:*',
        500 // Larger batch size for final sync
      );
      
      const stats = await migrator.migrateKeys();
      this.log('info', `Final sync completed. Migrated ${stats.successful} of ${stats.total} keys`);
      
      // Mark migration as complete
      this.migrationCompleted = true;
      this.config.clusterReadPercentage = 100;
      
      this.log('info', 'Migration completed. All operations now directed to Redis cluster');
    } catch (error) {
      this.log('error', `Failed to complete migration: ${error}`);
      throw error;
    }
  }
  
  /**
   * Verify data consistency between caches
   */
  private async verifyConsistency<T>(key: string, clusterValue: T | null): Promise<boolean> {
    try {
      // Get value from singleton
      const singletonValue = await this.singletonCache.get<T>(key);
      
      // Check for consistency issues
      if (JSON.stringify(clusterValue) !== JSON.stringify(singletonValue)) {
        this.inconsistenciesFound++;
        this.log('warn', `Inconsistency found for key ${key}`);
        
        // Re-sync this key
        if (singletonValue !== null) {
          await this.clusterCache.set(key, singletonValue, 'default');
          this.log('info', `Re-synchronized inconsistent key: ${key}`);
        }
        
        return false;
      }
      
      return true;
    } catch (error) {
      this.log('error', `Error during consistency check: ${error}`);
      return false;
    }
  }
  
  /**
   * Log a message with the specified level
   */
  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string): void {
    const logLevels = {
      'error': 0,
      'warn': 1,
      'info': 2,
      'debug': 3
    };
    
    // Only log if level is at or above configured level
    if (logLevels[level] <= logLevels[this.config.logLevel]) {
      const timestamp = new Date().toISOString();
      const formattedMessage = `[${timestamp}] [Redis Migration] [${level.toUpperCase()}] ${message}`;
      
      switch (level) {
        case 'error':
          console.error(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'debug':
          console.debug(formattedMessage);
          break;
        case 'info':
        default:
          console.log(formattedMessage);
      }
    }
  }
} 