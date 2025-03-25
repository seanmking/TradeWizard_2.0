export interface BackoffConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
}

export class ExponentialBackoff {
  private config: BackoffConfig;
  private lastError: Error = new Error('No attempts made');

  constructor(config: Partial<BackoffConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      initialDelay: config.initialDelay ?? 100,
      maxDelay: config.maxDelay ?? 5000,
      factor: config.factor ?? 2
    };
  }

  private calculateDelay(attempt: number): number {
    const delay = this.config.initialDelay * Math.pow(this.config.factor, attempt);
    return Math.min(delay, this.config.maxDelay);
  }

  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) return false;

    // Retry on network errors or rate limits
    if (error instanceof Error) {
      const status = (error as any).status;
      const code = (error as any).code;

      if (status === 429 || status === 503) return true; // Rate limit or service unavailable
      if (code === 'ECONNRESET' || code === 'ETIMEDOUT') return true; // Network errors
    }

    return false;
  }

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;

    while (true) {
      try {
        return await operation();
      } catch (error) {
        this.lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.shouldRetry(error, attempt)) {
          throw this.lastError;
        }

        const delay = this.calculateDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      }
    }
  }

  public getLastError(): Error {
    return this.lastError;
  }
} 