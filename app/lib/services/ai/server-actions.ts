// Server-side actions for AI processing
'use server';

import { redisCacheService } from './utils';
import { TaskType } from './openai-service';
import { estimateTokenCount } from './index';
import { processOptimizedQuery as originalProcessQuery } from './integration';

interface OptimizedQueryResult {
  response: string;
  costSavings: number;
}

/**
 * Server-side function to handle Redis cache operations
 */
export async function checkCache(query: string, taskType: TaskType): Promise<string | null> {
  const cacheKey = `query:${query}:${taskType}`;
  return redisCacheService.get(cacheKey);
}

/**
 * Server-side function to save to Redis cache
 */
export async function saveToCache(
  query: string, 
  taskType: TaskType,
  response: string,
  contentType: string = 'default'
): Promise<void> {
  const cacheKey = `query:${query}:${taskType}`;
  const ttlType = mapContentTypeToTTLType(contentType);
  await redisCacheService.set(cacheKey, response, ttlType);
}

/**
 * Server-side function to process a query with Redis caching
 */
export async function processOptimizedQuery(
  query: string,
  taskType: TaskType,
  websiteUrl?: string
): Promise<OptimizedQueryResult> {
  console.log(`Server action: Processing optimized query for task type: ${taskType}`);
  console.log(`Query (first 100 chars): ${query.substring(0, 100)}...`);
  if (websiteUrl) {
    console.log(`With website URL: ${websiteUrl}`);
  }
  
  try {
    const result = await originalProcessQuery(query, taskType, websiteUrl);
    console.log(`Query processed successfully, response length: ${result.response.length}`);
    return result;
  } catch (error) {
    console.error(`Error in server action processOptimizedQuery:`, error);
    throw error;
  }
}

/**
 * Maps content type to TTL configuration type
 */
function mapContentTypeToTTLType(contentType: string): 'regulatory' | 'marketTrends' | 'countryProfiles' | 'productInfo' | 'default' {
  switch (contentType) {
    case 'regulatory':
      return 'regulatory';
    case 'market':
      return 'marketTrends';
    case 'country':
      return 'countryProfiles';
    case 'product':
      return 'productInfo';
    default:
      return 'default';
  }
} 