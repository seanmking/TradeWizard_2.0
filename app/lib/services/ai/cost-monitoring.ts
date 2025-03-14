/**
 * Cost Monitoring Service
 * 
 * This service tracks and logs AI model usage and estimated costs
 * for analytics and cost optimization purposes.
 */

import { TaskType } from './types';

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ModelUsageRecord {
  model: string;
  taskType: TaskType;
  timestamp: Date;
  tokenUsage: TokenUsage;
  estimatedCost: number;
  userId?: string;
  responseTime?: number; // in milliseconds
}

/**
 * Cost rates per 1000 tokens for different models (in USD)
 * These rates should be updated if OpenAI's pricing changes
 */
export const MODEL_COSTS = {
  'gpt-4': {
    promptRate: 0.03,     // $0.03 per 1K prompt tokens
    completionRate: 0.06  // $0.06 per 1K completion tokens
  },
  'gpt-4-turbo': {
    promptRate: 0.01,     // $0.01 per 1K prompt tokens
    completionRate: 0.03  // $0.03 per 1K completion tokens
  },
  'gpt-3.5-turbo': {
    promptRate: 0.0015,   // $0.0015 per 1K prompt tokens
    completionRate: 0.002 // $0.002 per 1K completion tokens
  }
};

/**
 * Rough estimation for token count from string length
 * @param text - Text to estimate token count for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  // On average, 1 token is approximately 4 characters for English text
  return Math.ceil(text.length / 4);
}

class CostMonitoringService {
  private usageRecords: ModelUsageRecord[] = [];
  private isEnabled: boolean = true;
  
  // Set up in-memory storage limits
  private readonly maxRecordsInMemory: number = 1000;
  
  constructor() {
    // Set up periodic flushing to prevent memory growth
    setInterval(() => this.flushRecordsIfNeeded(), 60 * 60 * 1000); // Every hour
  }
  
  /**
   * Enable or disable cost monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
  
  /**
   * Record usage of an AI model
   * @param model - The model used (e.g., 'gpt-4', 'gpt-3.5-turbo')
   * @param taskType - The type of task performed
   * @param tokenUsage - Token usage information
   * @param userId - Optional user ID for attribution
   * @param responseTime - Optional response time in milliseconds
   */
  recordUsage(
    model: string,
    taskType: TaskType,
    tokenUsage: TokenUsage,
    userId?: string,
    responseTime?: number
  ): void {
    if (!this.isEnabled) return;
    
    // Calculate estimated cost
    const estimatedCost = this.calculateCost(model, tokenUsage);
    
    // Create usage record
    const record: ModelUsageRecord = {
      model,
      taskType,
      timestamp: new Date(),
      tokenUsage,
      estimatedCost,
      userId,
      responseTime
    };
    
    // Add to records
    this.usageRecords.push(record);
    
    // Log usage
    console.log(`Model Usage: ${model}, Task: ${taskType}, Tokens: ${tokenUsage.totalTokens}, Est. Cost: $${estimatedCost.toFixed(6)}`);
    
    // Check if we need to flush records
    this.flushRecordsIfNeeded();
  }
  
  /**
   * Calculate the cost of a model usage
   * @param model - The model used
   * @param tokenUsage - Token usage information
   * @returns The estimated cost in USD
   */
  private calculateCost(model: string, tokenUsage: TokenUsage): number {
    // Get cost rates for the model
    const modelRates = MODEL_COSTS[model as keyof typeof MODEL_COSTS] || MODEL_COSTS['gpt-3.5-turbo'];
    
    // Calculate cost
    const promptCost = (tokenUsage.promptTokens / 1000) * modelRates.promptRate;
    const completionCost = (tokenUsage.completionTokens / 1000) * modelRates.completionRate;
    
    return promptCost + completionCost;
  }
  
  /**
   * Flush records to prevent memory growth
   */
  private flushRecordsIfNeeded(): void {
    if (this.usageRecords.length > this.maxRecordsInMemory) {
      // In a production system, we would save these to a database
      // For now, we'll just log that we're flushing and keep the most recent records
      console.log(`Flushing ${this.usageRecords.length - this.maxRecordsInMemory} cost monitoring records`);
      this.usageRecords = this.usageRecords.slice(-this.maxRecordsInMemory);
    }
  }
  
  /**
   * Get usage statistics for a time period
   * @param startDate - Start date for the period
   * @param endDate - End date for the period
   * @param userId - Optional user ID to filter by
   * @returns Usage statistics
   */
  getUsageStats(startDate: Date, endDate: Date, userId?: string): {
    totalCost: number;
    totalTokens: number;
    usageByModel: Record<string, { count: number, tokens: number, cost: number }>;
    usageByTaskType: Record<string, { count: number, tokens: number, cost: number }>;
  } {
    // Filter records by date range and user ID
    const filteredRecords = this.usageRecords.filter(record => {
      const matchesDateRange = record.timestamp >= startDate && record.timestamp <= endDate;
      const matchesUserId = !userId || record.userId === userId;
      return matchesDateRange && matchesUserId;
    });
    
    // Initialize stats
    const usageByModel: Record<string, { count: number, tokens: number, cost: number }> = {};
    const usageByTaskType: Record<string, { count: number, tokens: number, cost: number }> = {};
    let totalCost = 0;
    let totalTokens = 0;
    
    // Calculate statistics
    for (const record of filteredRecords) {
      // Update total stats
      totalCost += record.estimatedCost;
      totalTokens += record.tokenUsage.totalTokens;
      
      // Update model stats
      if (!usageByModel[record.model]) {
        usageByModel[record.model] = { count: 0, tokens: 0, cost: 0 };
      }
      usageByModel[record.model].count++;
      usageByModel[record.model].tokens += record.tokenUsage.totalTokens;
      usageByModel[record.model].cost += record.estimatedCost;
      
      // Update task type stats
      if (!usageByTaskType[record.taskType]) {
        usageByTaskType[record.taskType] = { count: 0, tokens: 0, cost: 0 };
      }
      usageByTaskType[record.taskType].count++;
      usageByTaskType[record.taskType].tokens += record.tokenUsage.totalTokens;
      usageByTaskType[record.taskType].cost += record.estimatedCost;
    }
    
    return {
      totalCost,
      totalTokens,
      usageByModel,
      usageByTaskType
    };
  }
  
  /**
   * Get the most recent usage records
   * @param limit - Maximum number of records to return
   * @returns Most recent usage records
   */
  getRecentUsage(limit: number = 50): ModelUsageRecord[] {
    return [...this.usageRecords]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  /**
   * Calculate the average response time for a model
   * @param model - The model to calculate for
   * @returns Average response time in milliseconds
   */
  getAverageResponseTime(model: string): number | null {
    const modelRecords = this.usageRecords.filter(
      r => r.model === model && r.responseTime !== undefined
    );
    
    if (modelRecords.length === 0) return null;
    
    const totalResponseTime = modelRecords.reduce(
      (sum, record) => sum + (record.responseTime || 0), 
      0
    );
    
    return totalResponseTime / modelRecords.length;
  }
}

// Export singleton instance
const costMonitoringService = new CostMonitoringService();
export default costMonitoringService; 