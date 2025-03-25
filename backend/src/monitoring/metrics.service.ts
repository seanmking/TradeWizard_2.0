import { Logger } from '../utils/logger';

export interface MetricValue {
  count: number;
  sum: number;
  min: number;
  max: number;
  average: number;
}

export interface AIRequestMetrics {
  model: string;
  promptTokens: number;
  completionTokens: number;
  latency: number;
  success: boolean;
  cacheHit: boolean;
  error?: string;
}

export interface AIMetrics {
  totalRequests: MetricValue;
  promptTokens: MetricValue;
  completionTokens: MetricValue;
  latency: MetricValue;
  successRate: number;
  cacheHitRate: number;
  errorTypes: Record<string, number>;
}

export class MetricsService {
  private logger: Logger;
  private metrics: Map<string, AIMetrics>;
  private flushInterval: NodeJS.Timeout;

  constructor() {
    this.logger = new Logger('MetricsService');
    this.metrics = new Map();
    this.flushInterval = setInterval(() => this.flushMetrics(), 60000); // Flush every minute
  }

  private getOrCreateMetrics(model: string): AIMetrics {
    let metrics = this.metrics.get(model);
    if (!metrics) {
      metrics = {
        totalRequests: this.createMetricValue(),
        promptTokens: this.createMetricValue(),
        completionTokens: this.createMetricValue(),
        latency: this.createMetricValue(),
        successRate: 0,
        cacheHitRate: 0,
        errorTypes: {}
      };
      this.metrics.set(model, metrics);
    }
    return metrics;
  }

  private createMetricValue(): MetricValue {
    return {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      average: 0
    };
  }

  private updateMetricValue(metric: MetricValue, value: number): void {
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.average = metric.sum / metric.count;
  }

  public recordAIRequest(metrics: AIRequestMetrics): void {
    const modelMetrics = this.getOrCreateMetrics(metrics.model);

    this.updateMetricValue(modelMetrics.totalRequests, 1);
    this.updateMetricValue(modelMetrics.promptTokens, metrics.promptTokens);
    this.updateMetricValue(modelMetrics.completionTokens, metrics.completionTokens);
    this.updateMetricValue(modelMetrics.latency, metrics.latency);

    // Update success and cache hit rates
    const totalRequests = modelMetrics.totalRequests.count;
    modelMetrics.successRate = (modelMetrics.successRate * (totalRequests - 1) + (metrics.success ? 1 : 0)) / totalRequests;
    modelMetrics.cacheHitRate = (modelMetrics.cacheHitRate * (totalRequests - 1) + (metrics.cacheHit ? 1 : 0)) / totalRequests;

    // Record error type if request failed
    if (!metrics.success && metrics.error) {
      modelMetrics.errorTypes[metrics.error] = (modelMetrics.errorTypes[metrics.error] || 0) + 1;
    }
  }

  private flushMetrics(): void {
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send metrics to monitoring service
      this.logger.info('Flushing metrics to monitoring service', { metrics: this.getMetrics() });
    } else {
      // In development, just log the metrics
      this.logger.debug('Current metrics', { metrics: this.getMetrics() });
    }
  }

  public getMetrics(): Record<string, AIMetrics> {
    return Object.fromEntries(this.metrics.entries());
  }

  public clearMetrics(): void {
    this.metrics.clear();
  }

  public async destroy(): Promise<void> {
    clearInterval(this.flushInterval);
  }
} 