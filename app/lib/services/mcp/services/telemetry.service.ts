import { TelemetryConfig } from '../config/product-detector.config';
import { ProductAnalysisMetrics } from '../types/product-detection.types';

export class TelemetryService {
  private config: TelemetryConfig;
  private metrics: ProductAnalysisMetrics[] = [];

  constructor(config: TelemetryConfig) {
    this.config = config;
  }

  async recordMetrics(metrics: ProductAnalysisMetrics): Promise<void> {
    if (!this.config.enabled) return;

    // Apply sampling rate
    if (Math.random() > this.config.sampleRate) return;

    this.metrics.push(metrics);

    // Send metrics if we have accumulated enough
    if (this.metrics.length >= 10) {
      await this.flushMetrics();
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;

    try {
      const response = await fetch(this.config.metricsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timestamp: Date.now(),
          metrics: this.metrics
        })
      });

      if (response.ok) {
        this.metrics = [];
      }
    } catch (error) {
      console.error('Failed to send telemetry metrics:', error);
    }
  }

  getAggregateMetrics(): {
    averageConfidence: number;
    averageProcessingTime: number;
    totalCost: number;
    successRate: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageConfidence: 0,
        averageProcessingTime: 0,
        totalCost: 0,
        successRate: 1
      };
    }

    const totals = this.metrics.reduce((acc, metric) => ({
      confidence: acc.confidence + metric.confidence,
      time: acc.time + metric.totalTime,
      cost: acc.cost + (metric.costIncurred || 0),
      success: acc.success + (metric.productCount > 0 ? 1 : 0)
    }), {
      confidence: 0,
      time: 0,
      cost: 0,
      success: 0
    });

    return {
      averageConfidence: totals.confidence / this.metrics.length,
      averageProcessingTime: totals.time / this.metrics.length,
      totalCost: totals.cost,
      successRate: totals.success / this.metrics.length
    };
  }

  // Get performance metrics for specific model
  getModelPerformance(modelName: string): {
    averageConfidence: number;
    averageProcessingTime: number;
    costPerProduct: number;
  } {
    const modelMetrics = this.metrics.filter(m => m.modelUsed === modelName);
    
    if (modelMetrics.length === 0) {
      return {
        averageConfidence: 0,
        averageProcessingTime: 0,
        costPerProduct: 0
      };
    }

    const totals = modelMetrics.reduce((acc, metric) => ({
      confidence: acc.confidence + metric.confidence,
      time: acc.time + metric.totalTime,
      cost: acc.cost + (metric.costIncurred || 0),
      products: acc.products + metric.productCount
    }), {
      confidence: 0,
      time: 0,
      cost: 0,
      products: 0
    });

    return {
      averageConfidence: totals.confidence / modelMetrics.length,
      averageProcessingTime: totals.time / modelMetrics.length,
      costPerProduct: totals.products > 0 ? totals.cost / totals.products : 0
    };
  }
} 