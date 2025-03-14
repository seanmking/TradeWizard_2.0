/**
 * Utility class for exponential backoff implementation
 * Used for retrying failed API requests with increasing delays
 */

export interface BackoffOptions {
  initialDelay: number;
  maxDelay: number;
  factor: number;
  jitter?: boolean;
}

/**
 * Implements an exponential backoff strategy for retrying operations
 */
export class ExponentialBackoff {
  private initialDelay: number;
  private maxDelay: number;
  private factor: number;
  private jitter: boolean;
  private attempts: number;

  /**
   * Create a new exponential backoff instance
   * @param options - Configuration options
   */
  constructor(options: BackoffOptions) {
    this.initialDelay = options.initialDelay;
    this.maxDelay = options.maxDelay;
    this.factor = options.factor;
    this.jitter = options.jitter ?? true;
    this.attempts = 0;
  }

  /**
   * Calculate the next delay duration in milliseconds
   * @returns The next delay duration
   */
  nextDelay(): number {
    this.attempts++;
    
    // Calculate base delay: initialDelay * (factor ^ attempts)
    let delay = this.initialDelay * Math.pow(this.factor, this.attempts - 1);
    
    // Apply jitter if enabled (adds randomness to prevent thundering herd problem)
    if (this.jitter) {
      // Add +/- 20% random jitter
      const jitterFactor = 0.8 + (Math.random() * 0.4);
      delay = delay * jitterFactor;
    }
    
    // Cap at max delay
    delay = Math.min(delay, this.maxDelay);
    
    return Math.floor(delay);
  }

  /**
   * Reset the attempt counter
   */
  reset(): void {
    this.attempts = 0;
  }

  /**
   * Get the current attempt count
   */
  getAttempts(): number {
    return this.attempts;
  }
} 