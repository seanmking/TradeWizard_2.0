/**
 * Web Scraper Queue Service
 * 
 * Implements a priority queue system for web scraping jobs with rate limiting
 * and distributed execution to prevent overloading target websites.
 */

import { EventEmitter } from 'events';
import { WebScraperService } from './web-scraper.service';
import { ScraperOptions } from '../models/website-data.model';
import * as crypto from 'crypto';

// Job priority levels
export enum JobPriority {
  URGENT = 0,      // Immediate processing
  HIGH = 1,        // Process after all URGENTs
  NORMAL = 2,      // Standard priority
  LOW = 3,         // Process when queue is otherwise empty
  BACKGROUND = 4   // Very low priority, batch processing
}

// Job status values
export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RATE_LIMITED = 'rate_limited',
  CANCELLED = 'cancelled'
}

// Domain rate limit configuration
interface DomainRateLimit {
  requestsPerMinute: number;
  concurrentRequests: number;
  requestsWindow: number; // Time window in milliseconds
}

// The scraper job definition
export interface ScraperJob {
  id: string;
  url: string;
  domain: string;
  priority: JobPriority;
  status: JobStatus;
  options?: ScraperOptions;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, any>;
}

// Rate limit tracking for a domain
interface DomainRateLimitState {
  requestTimes: number[];
  currentConcurrent: number;
}

// Queue configuration
interface ScraperQueueConfig {
  maxConcurrentJobs: number;
  defaultRateLimit: DomainRateLimit;
  domainRateLimits: Record<string, DomainRateLimit>;
  retryDelayMs: number;
  maxRetries: number;
  jobTimeoutMs: number;
}

/**
 * Web Scraper Queue Service
 * Provides a scalable, rate-limited job queue for web scraping tasks
 */
export class WebScraperQueueService extends EventEmitter {
  private queue: ScraperJob[] = [];
  private activeJobs: Map<string, ScraperJob> = new Map();
  private domainStates: Map<string, DomainRateLimitState> = new Map();
  private scraperService: WebScraperService;
  private config: ScraperQueueConfig;
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private domainQueueCounts: Map<string, number> = new Map();
  
  /**
   * Create a new web scraper queue service
   * @param scraperService - The web scraper service to use for job execution
   * @param config - Queue configuration options
   */
  constructor(
    scraperService: WebScraperService,
    config: Partial<ScraperQueueConfig> = {}
  ) {
    super();
    
    this.scraperService = scraperService;
    
    // Default configuration
    this.config = {
      maxConcurrentJobs: 10,
      defaultRateLimit: {
        requestsPerMinute: 10,
        concurrentRequests: 2,
        requestsWindow: 60000 // 1 minute
      },
      domainRateLimits: {},
      retryDelayMs: 5000,
      maxRetries: 3,
      jobTimeoutMs: 30000,
      ...config
    };
    
    // Start processing queue
    this.startProcessing();
  }
  
  /**
   * Add a job to the scraper queue
   * @param url - URL to scrape
   * @param priority - Job priority
   * @param options - Scraper options
   * @param metadata - Additional metadata for the job
   * @returns The created job
   */
  enqueueJob(
    url: string,
    priority: JobPriority = JobPriority.NORMAL,
    options?: ScraperOptions,
    metadata?: Record<string, any>
  ): ScraperJob {
    // Extract domain from URL
    const domain = this.extractDomain(url);
    
    // Create job
    const job: ScraperJob = {
      id: crypto.randomUUID(),
      url,
      domain,
      priority,
      status: JobStatus.QUEUED,
      options,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      metadata
    };
    
    // Add to queue
    this.queue.push(job);
    
    // Sort queue by priority
    this.sortQueue();
    
    // Update domain queue count
    this.updateDomainQueueCount(domain, 1);
    
    this.emit('job:queued', job);
    
    return job;
  }
  
  /**
   * Get current queue statistics
   */
  getQueueStats(): {
    queuedJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    avgWaitTime: number;
    avgProcessTime: number;
    domainBreakdown: Record<string, { queued: number; active: number }>;
  } {
    const stats = {
      queuedJobs: this.queue.length,
      activeJobs: this.activeJobs.size,
      completedJobs: 0,
      failedJobs: 0,
      avgWaitTime: 0,
      avgProcessTime: 0,
      domainBreakdown: {} as Record<string, { queued: number; active: number }>
    };
    
    // Domain breakdown
    this.domainQueueCounts.forEach((count, domain) => {
      stats.domainBreakdown[domain] = {
        queued: count,
        active: 0
      };
    });
    
    // Count active jobs by domain
    this.activeJobs.forEach(job => {
      const domain = job.domain;
      if (!stats.domainBreakdown[domain]) {
        stats.domainBreakdown[domain] = { queued: 0, active: 0 };
      }
      stats.domainBreakdown[domain].active++;
    });
    
    return stats;
  }
  
  /**
   * Cancel a specific job by ID
   * @param jobId - ID of the job to cancel
   * @returns Boolean indicating if job was found and cancelled
   */
  cancelJob(jobId: string): boolean {
    // Check if job is in queue
    const index = this.queue.findIndex(job => job.id === jobId);
    
    if (index >= 0) {
      const job = this.queue[index];
      job.status = JobStatus.CANCELLED;
      
      // Remove from queue
      this.queue.splice(index, 1);
      
      // Update domain queue count
      this.updateDomainQueueCount(job.domain, -1);
      
      this.emit('job:cancelled', job);
      
      return true;
    }
    
    // Check if job is active
    if (this.activeJobs.has(jobId)) {
      const job = this.activeJobs.get(jobId)!;
      job.status = JobStatus.CANCELLED;
      
      // Note: Cannot stop already executing job, but marking it cancelled
      // will prevent results from being processed
      
      this.emit('job:cancelled', job);
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Clear all queued jobs (does not affect active jobs)
   * @param domain - Optional domain to clear jobs for
   */
  clearQueue(domain?: string): number {
    if (!domain) {
      // Clear entire queue
      const count = this.queue.length;
      
      // Reset domain counts
      this.domainQueueCounts.clear();
      
      this.queue = [];
      
      this.emit('queue:cleared');
      
      return count;
    } else {
      // Clear only jobs for specific domain
      const initialCount = this.queue.length;
      
      this.queue = this.queue.filter(job => job.domain !== domain);
      
      const clearedCount = initialCount - this.queue.length;
      
      // Update domain count
      this.domainQueueCounts.set(domain, 0);
      
      this.emit('queue:domain:cleared', domain);
      
      return clearedCount;
    }
  }
  
  /**
   * Set a custom rate limit for a specific domain
   * @param domain - Domain to set rate limit for
   * @param rateLimit - Rate limit configuration
   */
  setDomainRateLimit(domain: string, rateLimit: DomainRateLimit): void {
    this.config.domainRateLimits[domain] = rateLimit;
    
    // Reset rate limit state for this domain
    this.domainStates.delete(domain);
    
    this.emit('domain:ratelimit:updated', { domain, rateLimit });
  }
  
  /**
   * Remove custom rate limit for a domain
   * @param domain - Domain to remove custom rate limit for
   */
  removeDomainRateLimit(domain: string): void {
    delete this.config.domainRateLimits[domain];
    
    // Reset rate limit state
    this.domainStates.delete(domain);
    
    this.emit('domain:ratelimit:removed', domain);
  }
  
  /**
   * Start processing the queue
   */
  startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    // Process queue at regular intervals
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Check every second
    
    this.emit('processing:started');
  }
  
  /**
   * Stop processing the queue
   */
  stopProcessing(): void {
    if (!this.isProcessing) return;
    
    this.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    this.emit('processing:stopped');
  }
  
  /**
   * Process the next job(s) in the queue
   */
  private processQueue(): void {
    // Skip if at max concurrent jobs
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      return;
    }
    
    // Get domains that can accept more jobs
    const availableDomains = this.getAvailableDomains();
    
    // Process one job for each available domain
    for (const domain of availableDomains) {
      // Find the highest priority job for this domain
      const jobIndex = this.queue.findIndex(job => job.domain === domain);
      
      if (jobIndex >= 0) {
        const job = this.queue[jobIndex];
        
        // Remove from queue
        this.queue.splice(jobIndex, 1);
        
        // Update domain queue count
        this.updateDomainQueueCount(job.domain, -1);
        
        // Execute job
        this.executeJob(job);
      }
    }
  }
  
  /**
   * Execute a specific job
   * @param job - Job to execute
   */
  private async executeJob(job: ScraperJob): Promise<void> {
    // Update job status
    job.status = JobStatus.PROCESSING;
    job.startedAt = new Date();
    
    // Add to active jobs
    this.activeJobs.set(job.id, job);
    
    // Update domain rate limit state
    this.updateDomainRateLimitState(job.domain, true);
    
    this.emit('job:started', job);
    
    try {
      // Set timeout to prevent long-running jobs
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Job timed out after ${this.config.jobTimeoutMs}ms`));
        }, this.config.jobTimeoutMs);
      });
      
      // Execute job with timeout
      const result = await Promise.race([
        this.scraperService.scrapeWebsite(job.url, job.options),
        timeoutPromise
      ]);
      
      // Job completed successfully
      job.status = JobStatus.COMPLETED;
      job.completedAt = new Date();
      job.result = result;
      
      this.emit('job:completed', job);
    } catch (error) {
      // Check if we should retry
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = JobStatus.QUEUED;
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queue.push(job);
          this.sortQueue();
          this.updateDomainQueueCount(job.domain, 1);
          this.emit('job:retrying', job);
        }, this.config.retryDelayMs);
      } else {
        // Max retries exceeded
        job.status = JobStatus.FAILED;
        job.completedAt = new Date();
        job.error = error instanceof Error ? error.message : String(error);
        
        this.emit('job:failed', job);
      }
    } finally {
      // Remove from active jobs
      this.activeJobs.delete(job.id);
      
      // Update domain rate limit state
      this.updateDomainRateLimitState(job.domain, false);
    }
  }
  
  /**
   * Sort the queue by priority
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // First by priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // Then by creation time
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }
  
  /**
   * Get list of domains that can accept more jobs
   */
  private getAvailableDomains(): string[] {
    const domains = new Set<string>();
    
    // First collect all unique domains from the queue
    this.queue.forEach(job => {
      domains.add(job.domain);
    });
    
    // Filter to only domains that can accept more jobs
    return Array.from(domains).filter(domain => {
      return this.canProcessDomain(domain);
    });
  }
  
  /**
   * Check if a domain can accept more requests
   * @param domain - Domain to check
   */
  private canProcessDomain(domain: string): boolean {
    // Get rate limit config for this domain
    const rateLimit = this.config.domainRateLimits[domain] || this.config.defaultRateLimit;
    
    // Get current state
    let state = this.domainStates.get(domain);
    
    // Initialize if doesn't exist
    if (!state) {
      state = {
        requestTimes: [],
        currentConcurrent: 0
      };
      this.domainStates.set(domain, state);
    }
    
    // Check concurrent requests limit
    if (state.currentConcurrent >= rateLimit.concurrentRequests) {
      return false;
    }
    
    // Check request rate limit
    const now = Date.now();
    
    // Filter request times to only those within the window
    state.requestTimes = state.requestTimes.filter(time => {
      return now - time < rateLimit.requestsWindow;
    });
    
    // Check if we're under the rate limit
    return state.requestTimes.length < rateLimit.requestsPerMinute;
  }
  
  /**
   * Update the domain rate limit state for a request
   * @param domain - Domain being requested
   * @param starting - Whether request is starting (true) or ending (false)
   */
  private updateDomainRateLimitState(domain: string, starting: boolean): void {
    // Get current state
    let state = this.domainStates.get(domain);
    
    // Initialize if doesn't exist
    if (!state) {
      state = {
        requestTimes: [],
        currentConcurrent: 0
      };
      this.domainStates.set(domain, state);
    }
    
    if (starting) {
      // New request starting
      state.requestTimes.push(Date.now());
      state.currentConcurrent++;
    } else {
      // Request ending
      state.currentConcurrent = Math.max(0, state.currentConcurrent - 1);
    }
  }
  
  /**
   * Update the domain queue count
   * @param domain - Domain to update
   * @param delta - Amount to change count by
   */
  private updateDomainQueueCount(domain: string, delta: number): void {
    const currentCount = this.domainQueueCounts.get(domain) || 0;
    const newCount = Math.max(0, currentCount + delta);
    
    if (newCount === 0) {
      this.domainQueueCounts.delete(domain);
    } else {
      this.domainQueueCounts.set(domain, newCount);
    }
  }
  
  /**
   * Extract domain from URL
   * @param url - URL to extract domain from
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      // Fall back to string manipulation if URL parsing fails
      const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/);
      return match ? match[1] : 'unknown-domain';
    }
  }
} 