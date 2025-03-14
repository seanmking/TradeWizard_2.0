'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

// Define types for our data
interface UsageByModel {
  model: string;
  tokens: number;
  cost: number;
  percentage: number;
}

interface UsageByTaskType {
  taskType: string;
  tokens: number;
  cost: number;
  percentage: number;
}

interface UsageStats {
  totalCost: number;
  totalTokens: number;
  averageCostPerRequest: number;
  usageByModel: UsageByModel[];
  usageByTaskType: UsageByTaskType[];
  costTrend: { date: string; cost: number }[];
  tokenTrend: { date: string; tokens: number }[];
}

interface CacheSavingsStats {
  totalSavings: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  savingsByDataType: { dataType: string; savings: number }[];
}

// Mock service functions
const fetchCostData = async (timeframe: string): Promise<UsageStats> => {
  // In a real implementation, this would call an API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalCost: 125.67,
        totalTokens: 2345678,
        averageCostPerRequest: 0.023,
        usageByModel: [
          { model: 'gpt-4', tokens: 1234567, cost: 98.76, percentage: 78.5 },
          { model: 'gpt-3.5-turbo', tokens: 987654, cost: 19.75, percentage: 15.7 },
          { model: 'claude-3-opus', tokens: 123457, cost: 7.16, percentage: 5.8 },
        ],
        usageByTaskType: [
          { taskType: 'Regulatory Analysis', tokens: 1345678, cost: 67.28, percentage: 53.5 },
          { taskType: 'Market Research', tokens: 567890, cost: 28.39, percentage: 22.6 },
          { taskType: 'Product Comparison', tokens: 432110, cost: 30.00, percentage: 23.9 },
        ],
        costTrend: [
          { date: '2023-06-01', cost: 23.45 },
          { date: '2023-06-02', cost: 19.87 },
          { date: '2023-06-03', cost: 25.67 },
          { date: '2023-06-04', cost: 18.98 },
          { date: '2023-06-05', cost: 22.34 },
          { date: '2023-06-06', cost: 15.36 },
        ],
        tokenTrend: [
          { date: '2023-06-01', tokens: 456789 },
          { date: '2023-06-02', tokens: 398765 },
          { date: '2023-06-03', tokens: 512345 },
          { date: '2023-06-04', tokens: 378965 },
          { date: '2023-06-05', tokens: 446789 },
          { date: '2023-06-06', tokens: 307654 },
        ],
      });
    }, 1000);
  });
};

const fetchCacheSavings = async (timeframe: string): Promise<CacheSavingsStats> => {
  // In a real implementation, this would call an API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalSavings: 45.67,
        cacheHits: 3456,
        cacheMisses: 1234,
        hitRate: 73.7,
        savingsByDataType: [
          { dataType: 'Regulatory', savings: 23.45 },
          { dataType: 'Market', savings: 12.34 },
          { dataType: 'Country', savings: 5.67 },
          { dataType: 'Product', savings: 4.21 },
        ],
      });
    }, 800);
  });
};

export default function CostMonitoringDashboard() {
  const [timeframe, setTimeframe] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<UsageStats | null>(null);
  const [cacheSavings, setCacheSavings] = useState<CacheSavingsStats | null>(null);
  const [hasAnomalies, setHasAnomalies] = useState(false);

  // Load data based on selected timeframe
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [usage, savings] = await Promise.all([
          fetchCostData(timeframe),
          fetchCacheSavings(timeframe),
        ]);
        setUsageData(usage);
        setCacheSavings(savings);
        
        // Check for unusual cost patterns
        const costTrend = usage.costTrend;
        if (costTrend.length > 2) {
          const latestCost = costTrend[costTrend.length - 1].cost;
          const previousCost = costTrend[costTrend.length - 2].cost;
          setHasAnomalies(latestCost > previousCost * 1.5); // 50% increase
        }
      } catch (err) {
        setError('Failed to load cost monitoring data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [timeframe]);

  const handleRefresh = () => {
    // Reload data with current timeframe
    setIsLoading(true);
    fetchCostData(timeframe)
      .then(data => {
        setUsageData(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError('Failed to refresh data');
        setIsLoading(false);
        console.error(err);
      });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading cost data...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cost Monitoring Dashboard</h1>
        <div className="flex space-x-4">
          <div className="flex space-x-2">
            <Button
              variant={timeframe === '7d' ? 'default' : 'outline'}
              onClick={() => setTimeframe('7d')}
            >
              7 Days
            </Button>
            <Button
              variant={timeframe === '30d' ? 'default' : 'outline'}
              onClick={() => setTimeframe('30d')}
            >
              30 Days
            </Button>
            <Button
              variant={timeframe === '90d' ? 'default' : 'outline'}
              onClick={() => setTimeframe('90d')}
            >
              90 Days
            </Button>
          </div>
          <Button onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      {hasAnomalies && (
        <Alert variant="destructive">
          <AlertTitle>Cost Anomaly Detected</AlertTitle>
          <AlertDescription>
            There has been a significant increase in costs recently. Consider reviewing your usage patterns.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">Model Usage</TabsTrigger>
          <TabsTrigger value="tasks">Task Types</TabsTrigger>
          <TabsTrigger value="cache">Cache Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${usageData?.totalCost.toFixed(2)}</div>
                <p className="text-sm text-gray-500">Last {timeframe === '7d' ? '7' : timeframe === '30d' ? '30' : '90'} days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{usageData?.totalTokens.toLocaleString()}</div>
                <p className="text-sm text-gray-500">Processed in period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cache Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${cacheSavings?.totalSavings.toFixed(2)}</div>
                <p className="text-sm text-gray-500">Hit rate: {cacheSavings?.hitRate.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {/* In a real implementation, this would be a chart component */}
                <div className="flex h-full items-end space-x-2">
                  {usageData?.costTrend.map((day, i) => (
                    <div 
                      key={i} 
                      className="bg-blue-500 w-full rounded-t"
                      style={{ 
                        height: `${(day.cost / Math.max(...usageData.costTrend.map(d => d.cost))) * 100}%`,
                      }}
                    >
                      <div className="text-xs text-center mt-2 transform -rotate-90 origin-bottom-left">
                        ${day.cost.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {usageData?.costTrend.map((day, i) => (
                    <div key={i} className="text-xs">
                      {day.date.split('-')[2]}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usageData?.usageByModel.map((model, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{model.model}</span>
                      <span>${model.cost.toFixed(2)} ({model.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${model.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {model.tokens.toLocaleString()} tokens
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Task Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usageData?.usageByTaskType.map((task, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{task.taskType}</span>
                      <span>${task.cost.toFixed(2)} ({task.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ width: `${task.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {task.tokens.toLocaleString()} tokens
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cache Hits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{cacheSavings?.cacheHits.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cache Misses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{cacheSavings?.cacheMisses.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Hit Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{cacheSavings?.hitRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Savings by Data Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cacheSavings?.savingsByDataType.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{item.dataType} Data</span>
                      <span>${item.savings.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-purple-600 h-2.5 rounded-full" 
                        style={{ 
                          width: `${(item.savings / cacheSavings.totalSavings) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 