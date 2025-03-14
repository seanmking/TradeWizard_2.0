/**
 * AI Service Module
 * 
 * This module provides AI-powered assessment and analysis capabilities.
 * It uses a cost-effective approach by using GPT-3.5 for most tasks
 * and GPT-4 only for complex analyses that require enhanced capabilities.
 */
export { default as openAIService } from './openai-service';
export { default as modelSelector, selectModelForTask } from './model-selector';
export { default as costMonitoringService, estimateTokenCount, MODEL_COSTS } from './cost-monitoring';
export type { OpenAIMessage, OpenAIServiceOptions, TaskType, ModelSelectionConfig, TaskComplexity } from './openai-service';
export { OpenAIServiceError, OpenAIRateLimitError, OpenAITimeoutError } from './openai-service';
export { Conversation, ConversationManager } from './conversation';
export type { ConversationContext } from './conversation';
export { 
  DEFAULT_SYSTEM_PROMPT, 
  getAssessmentPrompt, 
  formatResponseWithData,
  ASSESSMENT_STAGES,
  FIXED_PROMPTS
} from './prompt-templates';

// Utility exports
export { ExponentialBackoff } from './utils/backoff';
export type { BackoffOptions } from './utils/backoff';
export { QueryCache } from './utils/query-cache';
export { RedisCacheService, redisCacheService } from './utils';
export type { TTLConfig } from './utils';
export { PromptGenerator, promptGenerator } from './utils';
export type { PromptType, Industry, PromptTemplate } from './utils';

// Create a convenient AI Assessment service
import openAIService, { TaskType } from './openai-service';
import { ConversationManager, ConversationContext, Conversation } from './conversation';
import { 
  DEFAULT_SYSTEM_PROMPT, 
  getAssessmentPrompt, 
  formatResponseWithData,
  ASSESSMENT_STAGES,
  FIXED_PROMPTS
} from './prompt-templates';
import { estimateTokenCount, MODEL_COSTS } from './cost-monitoring';

// Import MCP service
import { WebsiteAnalysisResult } from '../mcp';
import { analyzeWebsite as mcpAnalyzeWebsite } from '../mcp/actions';

// Import cost monitoring
import costMonitoringService from './cost-monitoring';

class AIAssessmentService {
  // Changed from private to public to allow access from assessmentService
  public conversationManager: ConversationManager;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.conversationManager = new ConversationManager(DEFAULT_SYSTEM_PROMPT);
    
    // Set up periodic cleanup of old conversations (every 6 hours)
    this.setupPeriodicCleanup();
  }
  
  // Set up periodic cleanup
  private setupPeriodicCleanup(): void {
    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Set up new interval (6 hours)
    this.cleanupInterval = setInterval(() => {
      const cleanedCount = this.conversationManager.cleanupInactiveConversations(12); // 12 hours
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} inactive conversations`);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
  }
  
  async processUserMessage(
    userId: string, 
    message: string, 
    stage: string,
    contextUpdate: Partial<ConversationContext> = {}
  ): Promise<{response: string, nextStage: string, websiteAnalysis?: WebsiteAnalysisResult, costSavings?: number}> {
    // Get or create conversation
    const conversation = this.conversationManager.getOrCreateConversation(userId);
    
    // Add incoming message
    conversation.addUserMessage(message);
    
    // Update context if needed
    if (Object.keys(contextUpdate).length > 0) {
      conversation.updateContext(contextUpdate);
    }
    
    // Get current context
    const context = conversation.getContext();
    
    // Set current stage if not already set
    if (!context.currentStage) {
      context.currentStage = stage;
      conversation.updateContext({ currentStage: stage });
    }
    
    // Special case: initial website analysis via MCP
    let websiteAnalysis: WebsiteAnalysisResult | undefined;
    let costSavings: number | undefined;
    
    if (stage === ASSESSMENT_STAGES.WEBSITE_ANALYSIS) {
      // Check if message contains a URL
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = message.match(urlRegex);
      
      if (matches && matches.length > 0) {
        const websiteUrl = matches[0];
        console.log(`Detected website URL: ${websiteUrl}`);
        
        try {
          // Track start time for performance measurement
          const startTime = Date.now();
          
          // Perform website analysis using MCP
          websiteAnalysis = await mcpAnalyzeWebsite(websiteUrl);
          
          // Update context with discovered website
          conversation.updateContext({ 
            website: websiteUrl,
            currentStage: stage
          });
          
          // The website analysis data is structured data we can use
          const hasStructuredData = true;
          
          // Generate prompt with structured data
          const structuredPrompt = this.addStructuredDataToContext(
            getAssessmentPrompt(stage, conversation.getContext()),
            websiteAnalysis
          );
          
          // Estimate tokens for GPT-4 vs GPT-3.5 to calculate savings
          const estimatedPromptTokens = estimateTokenCount(structuredPrompt);
          
          // Select models for comparison - what we would have used without structured data
          const fullAnalysisModel = 'gpt-4-turbo'; // The model we'd use without scraper
          const optimizedModel = 'gpt-3.5-turbo'; // The model we use with structured data
          
          // Calculate the prompt cost difference
          const gpt4PromptCost = (estimatedPromptTokens / 1000) * MODEL_COSTS['gpt-4-turbo'].promptRate;
          const gpt35PromptCost = (estimatedPromptTokens / 1000) * MODEL_COSTS['gpt-3.5-turbo'].promptRate;
          
          // Generate AI response with structured data, using GPT-3.5 for cost savings
          const taskType = openAIService.mapStageToTaskType(stage);
          const aiResponse = await openAIService.getCompletion(
            [
              { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
              { role: 'user', content: structuredPrompt }
            ],
            { model: optimizedModel }, // Force use of GPT-3.5 when we have structured data
            taskType,
            hasStructuredData,
            userId // Pass userId for usage tracking
          );
          
          // Estimate completion tokens
          const estimatedCompletionTokens = estimateTokenCount(aiResponse);
          
          // Calculate completion cost difference
          const gpt4CompletionCost = (estimatedCompletionTokens / 1000) * MODEL_COSTS['gpt-4-turbo'].completionRate;
          const gpt35CompletionCost = (estimatedCompletionTokens / 1000) * MODEL_COSTS['gpt-3.5-turbo'].completionRate;
          
          // Total cost savings
          costSavings = (gpt4PromptCost + gpt4CompletionCost) - (gpt35PromptCost + gpt35CompletionCost);
          
          // Record the performance gain
          const processingTime = Date.now() - startTime;
          console.log(`Website analysis processing time: ${processingTime}ms`);
          console.log(`Estimated cost savings: $${costSavings.toFixed(6)}`);
          
          // Add AI response to conversation
          conversation.addAssistantMessage(aiResponse);
          
          // Return the response with website analysis data and cost savings
          return {
            response: aiResponse,
            nextStage: ASSESSMENT_STAGES.EXPORT_EXPERIENCE,
            websiteAnalysis,
            costSavings
          };
        } catch (error) {
          console.error('Error analyzing website:', error);
          
          // If website analysis fails, continue with regular prompt
          conversation.updateContext({ website: matches[0] });
        }
      }
    }
    
    // For other stages, use the appropriate prompt based on the stage
    const prompt = getAssessmentPrompt(stage, conversation.getContext());
    
    // Use SARAH to generate a response
    const taskType = openAIService.mapStageToTaskType(stage);
    const messages = [
      { role: 'system' as const, content: DEFAULT_SYSTEM_PROMPT },
      ...conversation.getAllMessages()
    ];
    
    try {
      // Determine if structured data is available
      const hasStructuredData = !!(
        context.website || 
        context.businessName || 
        (context.targetMarkets && context.targetMarkets.length > 0)
      );
      
      // Get AI completion with appropriate model based on task complexity
      const aiResponse = await openAIService.getCompletion(
        messages, 
        undefined, 
        taskType,
        hasStructuredData,
        userId // Pass userId for usage tracking
      );
      
      // Add AI response to conversation
      conversation.addAssistantMessage(aiResponse);
      
      // Determine next stage based on current stage
      let nextStage = stage;
      
      if (stage === ASSESSMENT_STAGES.INTRODUCTION) {
        nextStage = ASSESSMENT_STAGES.WEBSITE_ANALYSIS;
      } else if (stage === ASSESSMENT_STAGES.WEBSITE_ANALYSIS) {
        nextStage = ASSESSMENT_STAGES.EXPORT_EXPERIENCE;
      } else if (stage === ASSESSMENT_STAGES.EXPORT_EXPERIENCE) {
        nextStage = ASSESSMENT_STAGES.MOTIVATION;
      } else if (stage === ASSESSMENT_STAGES.MOTIVATION) {
        nextStage = ASSESSMENT_STAGES.TARGET_MARKETS;
      } else if (stage === ASSESSMENT_STAGES.TARGET_MARKETS) {
        nextStage = ASSESSMENT_STAGES.SUMMARY;
      }
      
      // Return the response
      return {
        response: aiResponse,
        nextStage,
        costSavings
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // In case of error, return a fallback response
      const fallbackResponse = "I'm sorry, I'm having trouble generating a response right now. Could you please try again?";
      
      conversation.addAssistantMessage(fallbackResponse);
      
      return {
        response: fallbackResponse,
        nextStage: stage, // Stay on the same stage
        costSavings
      };
    }
  }
  
  /**
   * Add structured website data to context for AI consumption
   */
  private addStructuredDataToContext(
    baseContext: string, 
    websiteData: WebsiteAnalysisResult
  ): string {
    // Create a structured format that's easy for the AI to process
    const structuredWebsiteData = `
STRUCTURED WEBSITE DATA:
Products/Services: ${websiteData.productCategories.join(', ')}
Business Size: ${websiteData.businessSize}
Certifications: ${websiteData.certifications.join(', ') || 'None found'}
Customer Segments: ${websiteData.customerSegments.join(', ')}
Geographic Presence: ${websiteData.geographicPresence.join(', ')}
Export Readiness Score: ${websiteData.exportReadiness}/100
`;
    
    return baseContext + structuredWebsiteData;
  }
  
  getFixedPrompt(stage: string, context: ConversationContext): string {
    const prompt = FIXED_PROMPTS[stage];
    if (!prompt) return '';
    
    return formatResponseWithData(prompt, context);
  }
  
  resetConversation(userId: string): void {
    this.conversationManager.resetConversation(userId);
  }
  
  // Manual cleanup method for on-demand use
  cleanupOldConversations(olderThanHours: number = 12): number {
    return this.conversationManager.cleanupInactiveConversations(olderThanHours);
  }
  
  // Configure the model selection parameters
  updateModelSelectionConfig(config: Partial<typeof openAIService.getConfig>): void {
    openAIService.updateConfig(config);
    console.log('Model selection configuration updated');
  }
}

export const aiAssessmentService = new AIAssessmentService();
export default aiAssessmentService; 