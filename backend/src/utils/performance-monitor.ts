import { performance } from 'perf_hooks';
import winston from 'winston';

class PerformanceMonitor {
  private logger: winston.Logger;

  constructor() {
    // Configure Winston logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        // Write all logs to file
        new winston.transports.File({ 
          filename: 'logs/performance.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        // Also log to console if not in production
        ...(process.env.NODE_ENV !== 'production' 
          ? [new winston.transports.Console({
              format: winston.format.simple()
            })] 
          : [])
      ]
    });
  }

  // Measure and log method execution time
  async measureExecution<T>(
    name: string, 
    fn: () => Promise<T>, 
    tokenLimitWarning = 1000
  ): Promise<T> {
    const start = performance.now();
    let result: T;
    let error: Error | null = null;

    try {
      result = await fn();
    } catch (err) {
      error = err as Error;
    }

    const end = performance.now();
    const duration = end - start;

    // Log performance metrics
    this.logger.info({
      method: name,
      executionTime: duration,
      timestamp: new Date().toISOString(),
      success: !error
    });

    // Warn about slow operations
    if (duration > tokenLimitWarning) {
      this.logger.warn({
        method: name,
        message: 'Execution time exceeded warning threshold',
        executionTime: duration
      });
    }

    // Throw error if one occurred
    if (error) throw error;

    return result;
  }

  // Method to track API token usage
  trackTokenUsage(apiName: string, tokensUsed: number) {
    this.logger.info({
      type: 'token-usage',
      api: apiName,
      tokensUsed,
      timestamp: new Date().toISOString()
    });

    // Optionally implement threshold warnings
    const TOKEN_THRESHOLD = 5000;
    if (tokensUsed > TOKEN_THRESHOLD) {
      this.logger.warn({
        message: 'High token usage detected',
        api: apiName,
        tokensUsed
      });
    }
  }

  // Error tracking method
  logError(error: Error, context?: Record<string, any>) {
    this.logger.error({
      message: error.message,
      stack: error.stack,
      ...context
    });
  }
}

export default new PerformanceMonitor();
