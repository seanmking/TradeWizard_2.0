import { Redis, RedisOptions } from 'ioredis';
import { Logger } from '../../utils/logger';
import { MetricsService } from '../../monitoring/metrics.service';
import { ExponentialBackoff } from '../../utils/backoff';

export interface AIServiceConfig {
  apiKey: string;
  model: string;
  maxRetries?: number;
  temperature?: number;
  redisConfig?: RedisOptions;
}

export interface AIRequestOptions {
  prompt: string;
  requiresStructuredOutput?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
}

export class BaseAIService {
  private logger: Logger;
  private metrics: MetricsService;
  private redis: Redis | null = null;
  private backoff: ExponentialBackoff;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.logger = new Logger('BaseAIService');
    this.metrics = new MetricsService();
    this.backoff = new ExponentialBackoff();

    if (config.redisConfig) {
      this.initRedis(config.redisConfig);
    }
  }

  private initRedis(config: RedisOptions): void {
    try {
      this.redis = new Redis({
        ...config,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });

      this.redis.on('error', (error: Error) => {
        this.logger.error('Redis connection error', { error });
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis', { error });
    }
  }

  public async makeAIRequest(options: AIRequestOptions): Promise<string> {
    const { prompt, requiresStructuredOutput = false, cacheKey, cacheTTL } = options;

    if (cacheKey && this.redis) {
      try {
        const cachedResult = await this.getFromCache(cacheKey);
        if (cachedResult) {
          this.metrics.recordAIRequest({
            model: this.config.model,
            promptTokens: 0,
            completionTokens: 0,
            latency: 0,
            success: true,
            cacheHit: true
          });
          return cachedResult;
        }
      } catch (error) {
        this.logger.warn('Failed to get from cache', { error });
      }
    }

    try {
      const startTime = Date.now();
      const completion = await this.backoff.execute(async () => {
        // TODO: Replace with actual OpenAI API call
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              {
                role: 'system',
                content: requiresStructuredOutput ? 
                  'You are a helpful assistant that always responds in valid JSON format.' :
                  'You are a helpful assistant.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: this.config.temperature ?? 0.7
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const result = await response.json();
        return result.choices[0].message.content;
      });

      const latency = Date.now() - startTime;

      this.metrics.recordAIRequest({
        model: this.config.model,
        promptTokens: prompt.length / 4, // Rough estimate
        completionTokens: completion.length / 4, // Rough estimate
        latency,
        success: true,
        cacheHit: false
      });

      if (cacheKey && this.redis && cacheTTL) {
        try {
          await this.setInCache(cacheKey, completion, cacheTTL);
        } catch (error) {
          this.logger.warn('Failed to set cache', { error });
        }
      }

      return completion;
    } catch (error) {
      this.metrics.recordAIRequest({
        model: this.config.model,
        promptTokens: prompt.length / 4,
        completionTokens: 0,
        latency: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        cacheHit: false
      });
      throw error;
    }
  }

  private async getFromCache(key: string): Promise<string | null> {
    if (!this.redis) return null;
    try {
      return await this.redis.get(key);
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Cache get error', { error: typedError });
      return null;
    }
  }

  private async setInCache(key: string, value: string, ttl: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.setex(key, ttl, value);
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Cache set error', { error: typedError });
    }
  }

  public async destroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    await this.metrics.destroy();
  }
} 