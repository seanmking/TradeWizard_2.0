import OpenAI from 'openai';
import { ExponentialBackoff } from './utils/backoff';
import costMonitoringService, { estimateTokenCount } from './cost-monitoring';
import { QueryCache } from './utils/query-cache';

// Environment variable types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY: string;
    }
  }
}

// Types for our OpenAI service
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIServiceOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number; // Add timeout option
}

// Define task complexity levels for model selection
export type TaskComplexity = 'high' | 'medium' | 'low';

// Define task types for more specific model selection
export type TaskType = 
  'initial_assessment' | 
  'website_analysis' | 
  'export_experience' | 
  'export_motivation' | 
  'target_markets' | 
  'summary' | 
  'follow_up' | 
  'clarification' | 
  'faq';

// Configuration for model selection and complexity detection
export interface ModelSelectionConfig {
  // Complexity thresholds
  complexityThresholds: {
    queryLength: {
      medium: number; // Character count threshold for medium complexity
      high: number;   // Character count threshold for high complexity
    };
    industryTermCount: {
      medium: number; // Threshold for medium complexity
      high: number;   // Threshold for high complexity
    };
    crossReferenceThreshold: number; // Number of data points that suggest cross-referencing
  };
  
  // Model mapping based on complexity
  modelMapping: {
    high: string;   // Model for high complexity tasks
    medium: string; // Model for medium complexity tasks
    low: string;    // Model for low complexity tasks
  };
  
  // Special case overrides for specific task types
  taskTypeOverrides: {
    [key in TaskType]?: string;
  };
  
  // Industry-specific terms to detect in queries
  industryTerms: string[];
  
  // Cross-reference indicator terms
  crossReferenceTerms: string[];
}

// Custom error classes for better error handling
export class OpenAIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIServiceError';
  }
}

export class OpenAIRateLimitError extends OpenAIServiceError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'OpenAIRateLimitError';
  }
}

export class OpenAITimeoutError extends OpenAIServiceError {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'OpenAITimeoutError';
  }
}

class OpenAIService {
  private openai: OpenAI;
  private defaultOptions: OpenAIServiceOptions;
  private config: ModelSelectionConfig;
  private queryCache: QueryCache<string>;
  private maxRetries = 3;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.defaultOptions = {
      model: 'gpt-3.5-turbo', // Default to cheaper model
      temperature: 0.7,
      maxTokens: 1000,
      timeoutMs: 30000, // 30 second default timeout
    };
    
    // Initialize the query cache with a 1-hour TTL
    this.queryCache = new QueryCache<string>(60 * 60 * 1000);
    
    // Default configuration for model selection
    this.config = {
      complexityThresholds: {
        queryLength: {
          medium: 100, // Queries longer than 100 chars are medium complexity
          high: 300    // Queries longer than 300 chars are high complexity
        },
        industryTermCount: {
          medium: 2,   // 2+ industry terms indicates medium complexity
          high: 5      // 5+ industry terms indicates high complexity
        },
        crossReferenceThreshold: 2 // 2+ cross-reference terms indicates high complexity
      },
      modelMapping: {
        high: 'gpt-4-turbo',
        medium: 'gpt-3.5-turbo',
        low: 'gpt-3.5-turbo'
      },
      taskTypeOverrides: {
        // Force certain task types to specific models regardless of complexity
        'website_analysis': 'gpt-4-turbo',
        'summary': 'gpt-4-turbo'
      },
      industryTerms: [
        // Export and trade terms
        'export', 'import', 'tariff', 'quota', 'customs', 'duties', 'trade agreement',
        'regulatory', 'compliance', 'certification', 'logistics', 'freight', 'incoterms',
        'letter of credit', 'bill of lading', 'distributors', 'market entry',
        // Industry-specific terms for common South African exports
        'mining', 'minerals', 'agriculture', 'wine', 'manufacturing', 'automotive',
        'textiles', 'chemicals', 'machinery', 'processed foods', 'technology',
        // Target market terms
        'UAE', 'Dubai', 'Abu Dhabi', 'USA', 'America', 'UK', 'Britain', 'European Union',
        'Africa', 'BRICS', 'China', 'India', 'Brazil', 'Russia'
      ],
      crossReferenceTerms: [
        'compare', 'comparison', 'contrast', 'versus', 'vs', 'difference',
        'relationship', 'correlation', 'impact', 'effect', 'analyze',
        'evaluation', 'assessment', 'integration', 'synthesis',
        'multiple', 'various', 'several', 'many', 'different',
        'across', 'between', 'among'
      ]
    };
  }
  
  /**
   * Update the configuration for model selection
   */
  updateConfig(newConfig: Partial<ModelSelectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Get the current configuration
   */
  getConfig(): ModelSelectionConfig {
    return { ...this.config };
  }

  /**
   * Detect the complexity of a query based on multiple factors
   */
  detectComplexity(
    query: string,
    taskType: TaskType
  ): TaskComplexity {
    // Always treat certain task types as high complexity
    if (
      taskType === 'website_analysis' || 
      taskType === 'summary'
    ) {
      return 'high';
    }
    
    // Always treat certain task types as low complexity
    if (
      taskType === 'clarification' || 
      taskType === 'faq' ||
      taskType === 'follow_up'
    ) {
      return 'low';
    }
    
    // Score based on query length
    const queryLength = query.length;
    let complexityScore = 0;
    
    if (queryLength >= this.config.complexityThresholds.queryLength.high) {
      complexityScore += 2;
    } else if (queryLength >= this.config.complexityThresholds.queryLength.medium) {
      complexityScore += 1;
    }
    
    // Score based on industry terminology
    let industryTermCount = 0;
    const lowerQuery = query.toLowerCase();
    
    for (const term of this.config.industryTerms) {
      if (lowerQuery.includes(term.toLowerCase())) {
        industryTermCount++;
        // Break early if we've already reached the high threshold
        if (industryTermCount >= this.config.complexityThresholds.industryTermCount.high) {
          break;
        }
      }
    }
    
    if (industryTermCount >= this.config.complexityThresholds.industryTermCount.high) {
      complexityScore += 2;
    } else if (industryTermCount >= this.config.complexityThresholds.industryTermCount.medium) {
      complexityScore += 1;
    }
    
    // Score based on cross-reference terms
    let crossReferenceTermCount = 0;
    
    for (const term of this.config.crossReferenceTerms) {
      if (lowerQuery.includes(term.toLowerCase())) {
        crossReferenceTermCount++;
        // Break early if we've already reached the threshold
        if (crossReferenceTermCount >= this.config.complexityThresholds.crossReferenceThreshold) {
          break;
        }
      }
    }
    
    if (crossReferenceTermCount >= this.config.complexityThresholds.crossReferenceThreshold) {
      complexityScore += 2;
    }
    
    // Convert score to complexity level
    if (complexityScore >= 4) {
      return 'high';
    } else if (complexityScore >= 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Select the appropriate model based on task type
   * Simplified implementation that defaults to GPT-3.5-Turbo
   * @param taskType - The type of task being performed
   * @returns The name of the model to use
   */
  selectModelForTask(
    taskType: TaskType,
    queryContent: string = '',
    hasStructuredData: boolean = false
  ): string {
    // Default to GPT-3.5-Turbo for most tasks
    const defaultModel = 'gpt-3.5-turbo';
    
    // Only use GPT-4 for specific complex tasks
    // No matter the complexity or structured data availability
    if (taskType === 'website_analysis' || taskType === 'summary') {
      return 'gpt-4';
    }
    
    // For all other tasks, use GPT-3.5-Turbo
    return defaultModel;
  }

  /**
   * Map assessment stage to task type
   */
  mapStageToTaskType(stage: string): TaskType {
    switch(stage) {
      case 'introduction':
        return 'initial_assessment';
      case 'website_analysis':
        return 'website_analysis';
      case 'export_experience':
        return 'export_experience';
      case 'motivation':
        return 'export_motivation';
      case 'target_markets':
        return 'target_markets';
      case 'summary':
        return 'summary';
      default:
        return 'follow_up';
    }
  }

  // Generate a cache key for a completion request
  private generateCacheKey(
    messages: OpenAIMessage[],
    options: OpenAIServiceOptions,
    taskType?: TaskType
  ): string {
    // Create a simple hash of the messages and options
    const messagesStr = JSON.stringify(messages);
    const optionsStr = JSON.stringify(options);
    const taskTypeStr = taskType || 'unknown';
    
    return `${messagesStr}|${optionsStr}|${taskTypeStr}`;
  }

  /**
   * Get a completion from OpenAI API with appropriate model selection
   */
  async getCompletion(
    messages: OpenAIMessage[],
    options: OpenAIServiceOptions = {},
    taskType: TaskType = 'clarification',
    hasStructuredData: boolean = false,
    userId?: string
  ): Promise<string> {
    // Set default options
    const modelOptions: OpenAIServiceOptions = {
      model: options.model || this.selectModelForTask(taskType, messages[messages.length - 1]?.content || '', hasStructuredData),
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens,
      timeoutMs: options.timeoutMs || 30000 // 30 seconds default timeout
    };
    
    // Extract the most recent user query for complexity detection
    let userQuery = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userQuery = messages[i].content;
        break;
      }
    }
    
    // Pre-process messages to reduce tokens if needed
    const processedMessages = this.optimizeMessages(messages);
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(processedMessages, modelOptions, taskType);
    
    // Check if we have a cached response
    const cachedResponse = this.queryCache.get(cacheKey);
    if (cachedResponse) {
      console.log(`Using cached response for ${taskType || 'unspecified'} task`);
      
      // Record the usage from the cache to track savings
      const estimatedPromptTokens = processedMessages.reduce(
        (total, msg) => total + estimateTokenCount(msg.content),
        0
      );
      
      const estimatedCompletionTokens = estimateTokenCount(cachedResponse);
      
      // Record the usage with zero response time (cached)
      if (taskType) {
        costMonitoringService.recordUsage(
          modelOptions.model!,
          taskType,
          {
            promptTokens: estimatedPromptTokens,
            completionTokens: estimatedCompletionTokens,
            totalTokens: estimatedPromptTokens + estimatedCompletionTokens
          },
          userId,
          0 // Zero response time for cached responses
        );
      }
      
      return cachedResponse;
    }
    
    console.log(`Using model ${modelOptions.model} for task type: ${taskType || 'unspecified'}`);
    if (taskType) {
      console.log(`Query complexity: ${this.detectComplexity(userQuery, taskType)}`);
    }
    
    // Set up retry logic with exponential backoff
    const backoff = new ExponentialBackoff({
      initialDelay: 1000,
      maxDelay: 10000,
      factor: 2,
    });
    
    let attempts = 0;
    let requestStartTime = Date.now();
    
    while (attempts < this.maxRetries) {
      try {
        attempts++;
        
        // Create a promise that will reject on timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new OpenAITimeoutError(`Request timed out after ${modelOptions.timeoutMs}ms`));
          }, modelOptions.timeoutMs);
        });
        
        // Race the actual API call against the timeout
        const responsePromise = this.openai.chat.completions.create({
          model: modelOptions.model!,
          messages: processedMessages,
          temperature: modelOptions.temperature,
          max_tokens: modelOptions.maxTokens,
        });
        
        const response = await Promise.race([responsePromise, timeoutPromise]);
        
        if (!response.choices[0].message?.content) {
          throw new OpenAIServiceError('No response content from OpenAI');
        }
        
        const responseContent = response.choices[0].message.content;
        const responseTime = Date.now() - requestStartTime;
        
        // Cache the successful response
        this.queryCache.set(cacheKey, responseContent);
        
        // Record the usage
        if (taskType) {
          costMonitoringService.recordUsage(
            modelOptions.model!,
            taskType,
            {
              promptTokens: response.usage?.prompt_tokens || estimateTokenCount(JSON.stringify(processedMessages)),
              completionTokens: response.usage?.completion_tokens || estimateTokenCount(responseContent),
              totalTokens: response.usage?.total_tokens || (
                estimateTokenCount(JSON.stringify(processedMessages)) + 
                estimateTokenCount(responseContent)
              )
            },
            userId,
            responseTime
          );
        }
        
        return responseContent;
        
      } catch (error: any) {
        console.error(`Error calling OpenAI (attempt ${attempts}/${this.maxRetries}):`, error);
        
        // Handle rate limiting
        if (error.status === 429) {
          if (attempts < this.maxRetries) {
            const delayMs = backoff.nextDelay();
            console.log(`Rate limited. Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          } else {
            throw new OpenAIRateLimitError('Rate limit exceeded after maximum retries');
          }
        }
        
        // Handle timeouts
        if (error instanceof OpenAITimeoutError) {
          if (attempts < this.maxRetries) {
            console.log(`Request timed out. Retrying...`);
            continue;
          } else {
            // Final fallback to cheaper model on timeout
            if (modelOptions.model?.includes('gpt-4')) {
              console.log('All retries timed out. Falling back to GPT-3.5 Turbo');
              const fallbackOptions = { ...modelOptions, model: 'gpt-3.5-turbo' };
              return this.getCompletion(messages, fallbackOptions, taskType, hasStructuredData, userId);
            }
            throw error;
          }
        }
        
        // For server errors (5xx), retry with backoff
        if (error.status >= 500 && error.status < 600) {
          if (attempts < this.maxRetries) {
            const delayMs = backoff.nextDelay();
            console.log(`Server error (${error.status}). Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
        }
        
        // If using GPT-4 and it failed for any other reason, fallback to GPT-3.5
        if (modelOptions.model?.includes('gpt-4')) {
          console.log('Falling back to GPT-3.5 after GPT-4 failure');
          const fallbackOptions = { ...modelOptions, model: 'gpt-3.5-turbo' };
          return this.getCompletion(messages, fallbackOptions, taskType, hasStructuredData, userId);
        }
        
        // Re-throw the error if we can't handle it
        throw error;
      }
    }
    
    // This should not be reached due to the retry logic, but just in case
    throw new OpenAIServiceError('Failed to get completion after maximum retries');
  }
  
  // Optimize messages to reduce token usage
  private optimizeMessages(messages: OpenAIMessage[]): OpenAIMessage[] {
    // Keep the system message and last 5 exchanges (up to 11 messages total)
    if (messages.length <= 6) return messages;
    
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system').slice(-10);
    
    return [...systemMessages, ...nonSystemMessages];
  }
}

// Export singleton
export const openAIService = new OpenAIService();
export default openAIService; 