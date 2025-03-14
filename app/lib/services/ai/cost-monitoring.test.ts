/**
 * Tests for the Cost Monitoring Service
 */

import costMonitoringService, { MODEL_COSTS, estimateTokenCount } from './cost-monitoring';
import { TaskType } from './types';

describe('Cost Monitoring Service', () => {
  // Save original console.log
  const originalConsoleLog = console.log;
  
  beforeEach(() => {
    // Mock console.log to avoid cluttering test output
    console.log = jest.fn();
  });
  
  afterEach(() => {
    // Restore console.log
    console.log = originalConsoleLog;
  });
  
  test('should estimate token count correctly', () => {
    expect(estimateTokenCount('Hello world')).toBe(3); // 11 chars ÷ 4 = 2.75, rounded to 3
    expect(estimateTokenCount('')).toBe(0);
    expect(estimateTokenCount('This is a longer sentence to test the token estimation function')).toBe(17); // 66 chars ÷ 4 = 16.5, rounded to 17
  });
  
  test('should record and retrieve usage statistics', () => {
    // Clear any previous records
    (costMonitoringService as any).usageRecords = [];
    
    // Record some test usage
    const testUsage = {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150
    };
    
    costMonitoringService.recordUsage(
      'gpt-4',
      'website_analysis' as TaskType,
      testUsage,
      'user123',
      500 // 500ms response time
    );
    
    costMonitoringService.recordUsage(
      'gpt-3.5-turbo',
      'follow_up' as TaskType,
      {
        promptTokens: 50,
        completionTokens: 30,
        totalTokens: 80
      },
      'user123',
      200 // 200ms response time
    );
    
    // Test getRecentUsage
    const recentUsage = costMonitoringService.getRecentUsage(10);
    expect(recentUsage.length).toBe(2);
    expect(recentUsage[0].model).toBe('gpt-3.5-turbo');
    expect(recentUsage[1].model).toBe('gpt-4');
    
    // Test getAverageResponseTime
    const gpt4ResponseTime = costMonitoringService.getAverageResponseTime('gpt-4');
    expect(gpt4ResponseTime).toBe(500);
    
    const gpt35ResponseTime = costMonitoringService.getAverageResponseTime('gpt-3.5-turbo');
    expect(gpt35ResponseTime).toBe(200);
    
    // Test getUsageStats
    const startDate = new Date(Date.now() - 86400000); // 24 hours ago
    const endDate = new Date(Date.now() + 86400000); // 24 hours from now
    
    const stats = costMonitoringService.getUsageStats(startDate, endDate, 'user123');
    
    // Calculate expected cost for gpt-4
    const gpt4PromptCost = (testUsage.promptTokens / 1000) * MODEL_COSTS['gpt-4'].promptRate;
    const gpt4CompletionCost = (testUsage.completionTokens / 1000) * MODEL_COSTS['gpt-4'].completionRate;
    const gpt4TotalCost = gpt4PromptCost + gpt4CompletionCost;
    
    // Calculate expected cost for gpt-3.5-turbo
    const gpt35PromptCost = (50 / 1000) * MODEL_COSTS['gpt-3.5-turbo'].promptRate;
    const gpt35CompletionCost = (30 / 1000) * MODEL_COSTS['gpt-3.5-turbo'].completionRate;
    const gpt35TotalCost = gpt35PromptCost + gpt35CompletionCost;
    
    // Total expected cost
    const expectedTotalCost = gpt4TotalCost + gpt35TotalCost;
    
    // Verify the statistics
    expect(stats.totalTokens).toBe(230); // 150 + 80
    expect(stats.totalCost).toBeCloseTo(expectedTotalCost, 6);
    
    // Check model breakdown
    expect(stats.usageByModel['gpt-4'].count).toBe(1);
    expect(stats.usageByModel['gpt-4'].tokens).toBe(150);
    expect(stats.usageByModel['gpt-4'].cost).toBeCloseTo(gpt4TotalCost, 6);
    
    expect(stats.usageByModel['gpt-3.5-turbo'].count).toBe(1);
    expect(stats.usageByModel['gpt-3.5-turbo'].tokens).toBe(80);
    expect(stats.usageByModel['gpt-3.5-turbo'].cost).toBeCloseTo(gpt35TotalCost, 6);
    
    // Check task type breakdown
    expect(stats.usageByTaskType['website_analysis'].count).toBe(1);
    expect(stats.usageByTaskType['website_analysis'].tokens).toBe(150);
    
    expect(stats.usageByTaskType['follow_up'].count).toBe(1);
    expect(stats.usageByTaskType['follow_up'].tokens).toBe(80);
  });
  
  test('should handle filtering by date range', () => {
    // Clear any previous records
    (costMonitoringService as any).usageRecords = [];
    
    // Add a record with a specific date
    const pastDate = new Date('2023-01-01');
    const futureDate = new Date('2025-01-01');
    
    const pastRecord = {
      model: 'gpt-4',
      taskType: 'summary' as TaskType,
      timestamp: pastDate,
      tokenUsage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      },
      estimatedCost: 0.01,
      userId: 'user123'
    };
    
    const futureRecord = {
      model: 'gpt-4',
      taskType: 'summary' as TaskType,
      timestamp: futureDate,
      tokenUsage: {
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300
      },
      estimatedCost: 0.02,
      userId: 'user123'
    };
    
    // Add records directly to the service
    (costMonitoringService as any).usageRecords.push(pastRecord, futureRecord);
    
    // Test filtering by date range - only past record
    const pastOnlyStats = costMonitoringService.getUsageStats(
      new Date('2022-01-01'),
      new Date('2023-12-31'),
      'user123'
    );
    
    expect(pastOnlyStats.totalTokens).toBe(150);
    expect(Object.keys(pastOnlyStats.usageByModel).length).toBe(1);
    
    // Test filtering by date range - only future record
    const futureOnlyStats = costMonitoringService.getUsageStats(
      new Date('2024-01-01'),
      new Date('2026-01-01'),
      'user123'
    );
    
    expect(futureOnlyStats.totalTokens).toBe(300);
    expect(Object.keys(futureOnlyStats.usageByModel).length).toBe(1);
    
    // Test filtering by date range - both records
    const allStats = costMonitoringService.getUsageStats(
      new Date('2022-01-01'),
      new Date('2026-01-01'),
      'user123'
    );
    
    expect(allStats.totalTokens).toBe(450); // 150 + 300
    expect(Object.keys(allStats.usageByModel).length).toBe(1);
  });
  
  test('should handle enabling and disabling monitoring', () => {
    // Clear any previous records
    (costMonitoringService as any).usageRecords = [];
    
    // Disable monitoring
    costMonitoringService.setEnabled(false);
    
    // This should not be recorded
    costMonitoringService.recordUsage(
      'gpt-4',
      'website_analysis' as TaskType,
      {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    );
    
    // Verify no records were added
    expect(costMonitoringService.getRecentUsage().length).toBe(0);
    
    // Enable monitoring
    costMonitoringService.setEnabled(true);
    
    // This should be recorded
    costMonitoringService.recordUsage(
      'gpt-4',
      'website_analysis' as TaskType,
      {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    );
    
    // Verify the record was added
    expect(costMonitoringService.getRecentUsage().length).toBe(1);
  });
}); 