import OpenAI from 'openai';

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

class OpenAIService {
  private openai: OpenAI;
  private defaultOptions: OpenAIServiceOptions;
  private config: ModelSelectionConfig;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.defaultOptions = {
      model: 'gpt-3.5-turbo', // Default to cheaper model
      temperature: 0.7,
      maxTokens: 1000,
    };
    
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
    this.config.industryTerms.forEach(term => {
      if (query.toLowerCase().includes(term.toLowerCase())) {
        industryTermCount++;
      }
    });
    
    if (industryTermCount >= this.config.complexityThresholds.industryTermCount.high) {
      complexityScore += 2;
    } else if (industryTermCount >= this.config.complexityThresholds.industryTermCount.medium) {
      complexityScore += 1;
    }
    
    // Score based on cross-reference terms
    let crossReferenceTermCount = 0;
    this.config.crossReferenceTerms.forEach(term => {
      if (query.toLowerCase().includes(term.toLowerCase())) {
        crossReferenceTermCount++;
      }
    });
    
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
   * Select the appropriate model based on task complexity and data availability
   */
  selectModelForTask(
    taskType: TaskType,
    userQuery: string = '',
    hasStructuredData: boolean = false
  ): string {
    // 1. Check for task type overrides first
    if (this.config.taskTypeOverrides[taskType]) {
      return this.config.taskTypeOverrides[taskType]!;
    }
    
    // 2. If structured data is available, we can often use a less powerful model
    if (hasStructuredData) {
      // Even with structured data, some tasks still need GPT-4
      if (taskType === 'summary') {
        return this.config.modelMapping.high;
      }
      
      // Most other tasks can use GPT-3.5 when structured data is available
      return this.config.modelMapping.medium;
    }
    
    // 3. For regular cases, detect complexity and select model accordingly
    const complexity = this.detectComplexity(userQuery, taskType);
    return this.config.modelMapping[complexity];
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

  // Get a completion from the OpenAI API
  async getCompletion(
    messages: OpenAIMessage[],
    options?: Partial<OpenAIServiceOptions>,
    taskType?: TaskType,
    hasStructuredData: boolean = false
  ): Promise<string> {
    try {
      // Start with default options
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      // Extract the most recent user query for complexity detection
      let userQuery = '';
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          userQuery = messages[i].content;
          break;
        }
      }
      
      // Override model based on task if provided
      if (taskType) {
        mergedOptions.model = this.selectModelForTask(taskType, userQuery, hasStructuredData);
      }
      
      // Pre-process messages to reduce tokens if needed
      const processedMessages = this.optimizeMessages(messages);
      
      console.log(`Using model ${mergedOptions.model} for task type: ${taskType || 'unspecified'}`);
      console.log(`Query complexity: ${taskType ? this.detectComplexity(userQuery, taskType) : 'unspecified'}`);
      
      const response = await this.openai.chat.completions.create({
        model: mergedOptions.model!,
        messages: processedMessages,
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.maxTokens,
      });

      if (!response.choices[0].message?.content) {
        throw new Error('No response from OpenAI');
      }

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      
      // If using GPT-4 and it failed, fallback to GPT-3.5
      if (options?.model?.includes('gpt-4') && error instanceof Error) {
        console.log('Falling back to GPT-3.5 after GPT-4 failure');
        const fallbackOptions = { ...options, model: 'gpt-3.5-turbo' };
        return this.getCompletion(messages, fallbackOptions);
      }
      
      throw error;
    }
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