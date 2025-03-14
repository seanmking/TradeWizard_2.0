/**
 * AI Service Integration Module
 * 
 * This module integrates the web scraper, model selector, cost monitoring, and Redis caching
 * components to provide a unified interface for the AI services with cost optimization.
 */

import { modelSelector, selectModelForTask, costMonitoringService, estimateTokenCount } from './index';
import { redisCacheService } from './utils';
import { promptGenerator } from './utils';
import openAIService, { TaskType, TaskComplexity } from './openai-service';
import { WebScraper } from '../web-scraper';

interface WebsiteAnalysisResult {
  complexity: TaskComplexity;
  contentType: string;
  wordCount: number;
  estimatedTokens: number;
}

interface CostStatistics {
  totalCost: number;
  totalTokens: number;
  averageCostPerRequest: number;
  usageByModel: any[];
  usageByTaskType: any[];
}

/**
 * Analyzes a website to determine the appropriate model complexity
 * @param url The website URL to analyze
 * @returns Analysis result with complexity assessment
 */
export async function analyzeWebsite(url: string): Promise<WebsiteAnalysisResult> {
  try {
    // Use the web scraper to extract content
    const scraper = new WebScraper();
    const content = await scraper.scrapeUrl(url);
    
    // Analyze the content complexity
    const wordCount = content.text.split(/\s+/).length;
    const estimatedTokens = estimateTokenCount(content.text);
    
    // Determine complexity based on content
    let complexity: TaskComplexity = 'low';
    
    if (wordCount > 2000 || estimatedTokens > 4000) {
      complexity = 'high';
    } else if (wordCount > 1000 || estimatedTokens > 2000) {
      complexity = 'medium';
    }
    
    // Determine content type based on meta tags or content analysis
    const contentType = determineContentType(content);
    
    return {
      complexity,
      contentType,
      wordCount,
      estimatedTokens
    };
  } catch (error) {
    console.error('Error analyzing website:', error);
    // Default to medium complexity if analysis fails
    return {
      complexity: 'medium',
      contentType: 'unknown',
      wordCount: 0,
      estimatedTokens: 0
    };
  }
}

/**
 * Determines the content type of a webpage
 * @param content The scraped content
 * @returns The determined content type
 */
function determineContentType(content: { text: string; meta: Record<string, string> }): string {
  // Check meta tags first
  if (content.meta['og:type']) {
    return content.meta['og:type'];
  }
  
  // Simple keyword-based classification
  const text = content.text.toLowerCase();
  
  if (text.includes('regulation') || text.includes('compliance') || text.includes('law')) {
    return 'regulatory';
  } else if (text.includes('market') || text.includes('industry') || text.includes('trend')) {
    return 'market';
  } else if (text.includes('country') || text.includes('region') || text.includes('nation')) {
    return 'country';
  } else if (text.includes('product') || text.includes('service') || text.includes('offering')) {
    return 'product';
  }
  
  return 'general';
}

/**
 * Processes a query with cost optimization
 * @param query The user query
 * @param taskType The type of task
 * @param websiteUrl Optional website URL to analyze
 * @returns The optimized response
 */
export async function processOptimizedQuery(
  query: string,
  taskType: TaskType,
  websiteUrl?: string
): Promise<{ response: string; costSavings: number }> {
  // Check cache first
  const cacheKey = `query:${query}:${taskType}`;
  const cachedResponse = await redisCacheService.get(cacheKey);
  
  if (cachedResponse) {
    // Calculate cost savings from cache hit
    const estimatedTokens = estimateTokenCount(query) + estimateTokenCount(cachedResponse as string);
    const savedCost = estimateModelCost('gpt-4-turbo', estimatedTokens);
    
    return {
      response: cachedResponse as string,
      costSavings: savedCost
    };
  }
  
  // Determine complexity based on website analysis if URL is provided
  let complexity: TaskComplexity = 'medium';
  let contentType = 'general';
  let websiteAnalysis = null;
  
  if (websiteUrl) {
    try {
      const analysis = await analyzeWebsite(websiteUrl);
      complexity = analysis.complexity;
      contentType = analysis.contentType;
      websiteAnalysis = analysis;
      console.log(`Website analysis completed: ${JSON.stringify(analysis)}`);
    } catch (error) {
      console.error('Error analyzing website:', error);
    }
  }
  
  // Select the appropriate model based on task and complexity
  const selectedModel = selectModelForTask(taskType, complexity);
  console.log(`Selected model for task: ${selectedModel}`);
  
  // Generate optimized prompt using the prompt generator
  const industry = determineIndustry(query);
  const optimizedPrompt = promptGenerator.generatePrompt(
    'general', // Using 'general' as a fallback prompt type
    industry as any, // Cast to any since we're not using the exact Industry type
    {
      query,
      taskType: taskType.toString(),
      complexity: complexity.toString()
    }
  );
  
  // Calculate token savings from prompt optimization
  const originalTokens = estimateTokenCount(query);
  const optimizedTokens = estimateTokenCount(optimizedPrompt);
  const promptSavings = originalTokens - optimizedTokens > 0 ? originalTokens - optimizedTokens : 0;
  
  // Extract business details and target markets for a more detailed prompt
  const businessName = query.includes('business_name') 
    ? query.split('business_name:')[1]?.split('\n')[0]?.trim() 
    : '';
    
  const targetMarkets = [];
  if (query.toLowerCase().includes('uk')) targetMarkets.push('UK');
  if (query.toLowerCase().includes('uae') || query.toLowerCase().includes('united arab emirates')) targetMarkets.push('UAE');
  if (query.toLowerCase().includes('usa') || query.toLowerCase().includes('united states')) targetMarkets.push('USA');
  
  // Build a more detailed prompt with specific business information
  const detailedPrompt = `
Analyze the export readiness for a business with the following details:
- Business name: ${businessName || 'Unknown'}
- Target markets: ${targetMarkets.length > 0 ? targetMarkets.join(', ') : 'International markets'}
- Industry: ${industry}
- Complexity assessment: ${complexity}
${websiteAnalysis ? `- Website analysis: Word count: ${websiteAnalysis.wordCount}, Content type: ${websiteAnalysis.contentType}` : ''}

Original query: ${query}

Provide specific insights on:
1. Market opportunities in ${targetMarkets.length > 0 ? targetMarkets.join(' and ') : 'international markets'}
2. Regulatory considerations for this business type
3. Competitive positioning analysis
4. Specific next steps for export readiness

Format your response as JSON with the following structure:
{
  "strengths": ["strength1", "strength2", ...],
  "challenges": ["challenge1", "challenge2", ...],
  "marketInsights": [
    {"name": "Market Name", "potential": "high/medium/low", "description": "Market description"},
    ...
  ],
  "regulatoryInsights": ["insight1", "insight2", ...],
  "competitiveInsights": ["insight1", "insight2", ...]
}
`;

  console.log(`Making API call to OpenAI with model: ${selectedModel}`);
  console.log(`Detailed prompt (first 300 chars): ${detailedPrompt.substring(0, 300)}...`);
  
  // Use the imported openAIService instead of requiring it
  try {
    // Make the actual API call to OpenAI
    const aiResponse = await openAIService.getCompletion(
      [
        { role: 'system', content: 'You are an export readiness advisor. Provide detailed, market-specific analysis.' },
        { role: 'user', content: detailedPrompt }
      ],
      { model: selectedModel },
      taskType
    );
    
    console.log(`Received response from OpenAI (first 300 chars): ${aiResponse.substring(0, 300)}...`);
    
    // Use the actual response from the API
    const response = aiResponse;
    
    // Cache the response with appropriate TTL based on content type
    // Map the content type to the appropriate TTL config key
    const ttlType = mapContentTypeToTTLType(contentType);
    await redisCacheService.set(cacheKey, response, ttlType);
    
    // Calculate total cost savings
    const modelSavings = calculateModelSelectionSavings(selectedModel, 'gpt-4-turbo', optimizedTokens);
    const totalSavings = modelSavings + (promptSavings * 0.01); // Assuming $0.01 per token saved
    
    return {
      response,
      costSavings: totalSavings
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Fallback to a default response in case of API failure
    const fallbackResponse = JSON.stringify({
      strengths: ["Your business shows potential for export growth"],
      challenges: ["International market entry requires careful planning"],
      marketInsights: [
        {
          name: targetMarkets.length > 0 ? targetMarkets.join(' and ') : "International Markets",
          potential: "medium",
          description: "Based on your business profile, we've identified potential export markets that match your products and capabilities."
        }
      ],
      regulatoryInsights: [
        "Your business may need to address key compliance requirements before entering international markets."
      ],
      competitiveInsights: [
        "Your product's unique features position you well against international competition in selected markets."
      ]
    });
    
    return {
      response: fallbackResponse,
      costSavings: 0
    };
  }
}

/**
 * Maps content type to TTL configuration type
 * @param contentType The content type from website analysis
 * @returns The TTL configuration key
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

/**
 * Estimates the cost for a specific model and token count
 * @param model The model name
 * @param tokenCount The number of tokens
 * @returns The estimated cost
 */
function estimateModelCost(model: string, tokenCount: number): number {
  // Simple cost estimation based on model type
  // In a real implementation, this would use the actual pricing
  const costPerToken = model.includes('gpt-4') ? 0.00003 : 0.000002;
  return tokenCount * costPerToken;
}

/**
 * Calculates savings from using a cheaper model
 * @param actualModel The model actually used
 * @param baselineModel The baseline model for comparison
 * @param tokenCount The number of tokens
 * @returns The cost savings
 */
function calculateModelSelectionSavings(actualModel: string, baselineModel: string, tokenCount: number): number {
  const baselineCost = estimateModelCost(baselineModel, tokenCount);
  const actualCost = estimateModelCost(actualModel, tokenCount);
  return baselineCost - actualCost;
}

/**
 * Determines the industry based on query content
 * @param query The user query
 * @returns The determined industry
 */
function determineIndustry(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('agriculture') || lowerQuery.includes('farming') || lowerQuery.includes('crop')) {
    return 'agriculture';
  } else if (lowerQuery.includes('manufacturing') || lowerQuery.includes('factory') || lowerQuery.includes('production')) {
    return 'manufacturing';
  } else if (lowerQuery.includes('finance') || lowerQuery.includes('banking') || lowerQuery.includes('investment')) {
    return 'finance';
  } else if (lowerQuery.includes('healthcare') || lowerQuery.includes('medical') || lowerQuery.includes('patient')) {
    return 'healthcare';
  } else if (lowerQuery.includes('technology') || lowerQuery.includes('software') || lowerQuery.includes('digital')) {
    return 'technology';
  }
  
  return 'general';
}

/**
 * Gets cost monitoring statistics
 * @param timeframe The time period for statistics
 * @returns Cost monitoring statistics
 */
export async function getCostStatistics(timeframe: '7d' | '30d' | '90d'): Promise<CostStatistics> {
  // In a real implementation, this would call the cost monitoring service
  // For now, return mock data
  return {
    totalCost: timeframe === '7d' ? 125.67 : timeframe === '30d' ? 450.89 : 1250.45,
    totalTokens: timeframe === '7d' ? 2345678 : timeframe === '30d' ? 8765432 : 24567890,
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
    ]
  };
}

/**
 * Gets cache performance statistics
 * @returns Cache performance statistics
 */
export async function getCacheStatistics() {
  return redisCacheService.getStats();
} 