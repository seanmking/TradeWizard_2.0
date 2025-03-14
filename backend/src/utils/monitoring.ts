/**
 * Monitoring utilities for tracking API performance
 */

interface TimingLabel {
  [key: string]: string | number | boolean;
}

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  labels: TimingLabel;
}

const metrics: PerformanceMetric[] = [];

/**
 * Track the response time of a function
 * @param name The name of the operation being tracked
 * @param fn The async function to track
 * @param labels Additional labels to attach to the timing
 * @returns The result of the function
 */
export async function trackResponseTime<T>(
  name: string,
  fn: () => Promise<T>,
  labels: TimingLabel = {}
): Promise<T> {
  const startTime = Date.now();
  
  const metric: PerformanceMetric = {
    name,
    startTime,
    labels
  };
  
  metrics.push(metric);
  
  try {
    const result = await fn();
    
    metric.endTime = Date.now();
    metric.duration = metric.endTime - startTime;
    
    // Log the performance metric
    console.log(`Performance [${name}]: ${metric.duration}ms`, labels);
    
    return result;
  } catch (error) {
    metric.endTime = Date.now();
    metric.duration = metric.endTime - startTime;
    
    // Log the performance metric with error
    console.error(`Performance [${name}] (Error): ${metric.duration}ms`, labels);
    
    throw error;
  }
}

/**
 * Get all collected performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetric[] {
  return metrics;
}

/**
 * Clear all collected performance metrics
 */
export function clearPerformanceMetrics(): void {
  metrics.length = 0;
}

/**
 * Get a summary of performance metrics
 */
export function getPerformanceSummary(): {
  [name: string]: {
    count: number;
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
  };
} {
  const summary: {
    [name: string]: {
      count: number;
      totalDuration: number;
      averageDuration: number;
      minDuration: number;
      maxDuration: number;
    };
  } = {};
  
  metrics.forEach(metric => {
    if (!metric.duration) return;
    
    if (!summary[metric.name]) {
      summary[metric.name] = {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0
      };
    }
    
    const entry = summary[metric.name];
    entry.count++;
    entry.totalDuration += metric.duration;
    entry.minDuration = Math.min(entry.minDuration, metric.duration);
    entry.maxDuration = Math.max(entry.maxDuration, metric.duration);
    entry.averageDuration = entry.totalDuration / entry.count;
  });
  
  return summary;
} 