export { default as openAIService } from './openai-service';
export type { OpenAIMessage, OpenAIServiceOptions, TaskType, ModelSelectionConfig, TaskComplexity } from './openai-service';
export { Conversation, ConversationManager } from './conversation';
export type { ConversationContext } from './conversation';
export { 
  DEFAULT_SYSTEM_PROMPT, 
  getAssessmentPrompt, 
  formatResponseWithData,
  ASSESSMENT_STAGES,
  FIXED_PROMPTS
} from './prompt-templates';

// Create a convenient AI Assessment service
import openAIService, { TaskType } from './openai-service';
import { ConversationManager, ConversationContext } from './conversation';
import { 
  DEFAULT_SYSTEM_PROMPT, 
  getAssessmentPrompt, 
  formatResponseWithData,
  ASSESSMENT_STAGES,
  FIXED_PROMPTS
} from './prompt-templates';

// Import MCP service
import { WebsiteAnalysisResult } from '../mcp';
import { analyzeWebsite as mcpAnalyzeWebsite } from '../mcp/actions';

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
  ): Promise<{response: string, nextStage: string, websiteAnalysis?: WebsiteAnalysisResult}> {
    // Get the conversation for this user
    const conversation = this.conversationManager.getConversation(userId);
    
    // Update the context if new information is provided
    if (Object.keys(contextUpdate).length > 0) {
      conversation.updateContext(contextUpdate);
    }
    
    // Add the new user message
    conversation.addUserMessage(message);
    
    // Get the current context
    const context = conversation.getContext();
    
    // Store website analysis results to return
    let websiteAnalysisResult: WebsiteAnalysisResult | undefined;
    
    // Flag to indicate if we have structured data
    let hasStructuredData = false;
    
    // Special handling for website URL if we're in the website analysis stage
    let website = '';
    if (stage === ASSESSMENT_STAGES.WEBSITE_ANALYSIS) {
      // Extract website URL using regex
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const match = message.match(urlRegex);
      
      if (match && match[0]) {
        website = match[0];
        
        // Update context with the website
        conversation.updateContext({ website });
        
        // Call MCP to analyze website
        try {
          console.log(`Website detected: ${website} - Triggering MCP analysis`);
          websiteAnalysisResult = await mcpAnalyzeWebsite(website);
          
          // We now have structured data from the scraper
          hasStructuredData = true;
          
          // Update the context with insights from website analysis
          conversation.updateContext({
            industry: websiteAnalysisResult.productCategories.join(', '),
            additionalNotes: `Website analysis: Business appears to be ${websiteAnalysisResult.businessSize} sized, with certifications: ${websiteAnalysisResult.certifications.join(', ')}. Primarily serves ${websiteAnalysisResult.customerSegments.join(', ')} customers.`
          });
          
          console.log(`Website analysis complete: Export readiness score from MCP: ${websiteAnalysisResult.exportReadiness}`);
        } catch (error) {
          console.error('Error analyzing website:', error);
          // We'll proceed without structured data if the scraper fails
          hasStructuredData = false;
        }
      }
    }
    
    // Extract key information based on the stage
    if (stage === ASSESSMENT_STAGES.INTRODUCTION) {
      // Try to extract name, role, business name
      const nameMatch = message.match(/(?:my name is|i'm|im|i am|name is|hi|hello|hey|this is|i'm called)\s+([a-zA-Z]+)/i);
      const roleMatch = message.match(/(?:(?:i'm|im|i am)(?: a| the)? ([^,.]+? (?:at|in|of|for)))/i);
      const businessMatch = message.match(/(?:(?:at|for|from|with|of) ([\w\s&\-\.]+))/i);
      
      let contextUpdates: Partial<ConversationContext> = {};
      
      if (nameMatch && nameMatch[1]) {
        contextUpdates.userName = nameMatch[1];
      }
      
      if (roleMatch && roleMatch[1]) {
        contextUpdates.role = roleMatch[1];
      }
      
      if (businessMatch && businessMatch[1]) {
        contextUpdates.businessName = businessMatch[1];
      }
      
      // Update context with extracted information
      if (Object.keys(contextUpdates).length > 0) {
        conversation.updateContext(contextUpdates);
      }
    }
    
    // Extract export experience if we're in that stage
    if (stage === ASSESSMENT_STAGES.EXPORT_EXPERIENCE) {
      conversation.updateContext({ 
        exportExperience: message.length > 5 ? message : 'No export experience mentioned' 
      });
    }

    // Extract motivation if we're in that stage  
    if (stage === ASSESSMENT_STAGES.MOTIVATION) {
      conversation.updateContext({ motivation: message });
    }

    // Extract target markets if we're in that stage
    if (stage === ASSESSMENT_STAGES.TARGET_MARKETS) {
      // Store the complete response
      conversation.updateContext({ targetMarkets: [message] });
      
      // Check if they mentioned our supported markets
      const mentionedMarkets = [];
      if (message.toLowerCase().includes('uae') || 
          message.toLowerCase().includes('emirates') || 
          message.toLowerCase().includes('dubai')) {
        mentionedMarkets.push('UAE');
      }
      if (message.toLowerCase().includes('usa') || 
          message.toLowerCase().includes('united states') || 
          message.toLowerCase().includes('america')) {
        mentionedMarkets.push('USA');
      }
      if (message.toLowerCase().includes('uk') || 
          message.toLowerCase().includes('united kingdom') || 
          message.toLowerCase().includes('britain')) {
        mentionedMarkets.push('UK');
      }
      
      if (mentionedMarkets.length > 0) {
        conversation.updateContext({ 
          supportedTargetMarkets: mentionedMarkets,
          additionalNotes: (context.additionalNotes || '') + 
            `\nUser is interested in these supported markets: ${mentionedMarkets.join(', ')}`
        });
      }
    }
    
    // Get the stage-specific prompt
    const stagePrompt = getAssessmentPrompt(stage, context);
    
    // Create a more concise context summary from the current conversation context
    const contextSummary = `
User: ${context.userName || 'Unknown'}, ${context.role || 'Unknown'} at ${context.businessName || 'Unknown'}
Website: ${context.website || 'Not provided'}
Industry: ${context.industry || 'Unknown'}
Export Exp: ${context.exportExperience || 'Not discussed'}
Motivation: ${context.motivation || 'Not discussed'}
Markets: ${context.targetMarkets ? context.targetMarkets.join(', ') : 'Not discussed'}
${context.additionalNotes ? `Notes: ${context.additionalNotes}` : ''}
`;
    
    // Enhance context with structured website data if available
    let enhancedContext = contextSummary;
    if (websiteAnalysisResult && hasStructuredData) {
      enhancedContext = this.addStructuredDataToContext(contextSummary, websiteAnalysisResult);
    }
    
    // Create a temporary system message for this interaction with enhanced context
    const systemMessage = {
      role: 'system' as const,
      content: `${stagePrompt}\n\nCONTEXT:\n${enhancedContext}`
    };
    
    // Get only the last 6 conversation messages to reduce token usage
    const recentMessages = conversation.getRecentMessages(6);
    
    // Combine messages for the API call (excluding the original system message)
    const messagesToSend = [
      systemMessage,
      ...recentMessages.filter(m => m.role !== 'system')
    ];
    
    // Map the stage to a task type for model selection
    const taskType = openAIService.mapStageToTaskType(stage);
    
    // Log the task type and complexity before making the API call
    console.log(`Processing ${stage} stage as task type: ${taskType}`);
    
    // Get the AI response using the appropriate model based on task type and message complexity
    const aiResponse = await openAIService.getCompletion(
      messagesToSend,
      undefined, // Use default options
      taskType,
      hasStructuredData
    );
    
    // Add the AI response to the conversation
    conversation.addAssistantMessage(aiResponse);
    
    // Determine the next stage
    let nextStage = stage;
    switch (stage) {
      case ASSESSMENT_STAGES.INTRODUCTION:
        nextStage = ASSESSMENT_STAGES.WEBSITE_ANALYSIS;
        break;
      case ASSESSMENT_STAGES.WEBSITE_ANALYSIS:
        nextStage = ASSESSMENT_STAGES.EXPORT_EXPERIENCE;
        break;
      case ASSESSMENT_STAGES.EXPORT_EXPERIENCE:
        nextStage = ASSESSMENT_STAGES.MOTIVATION;
        break;
      case ASSESSMENT_STAGES.MOTIVATION:
        nextStage = ASSESSMENT_STAGES.TARGET_MARKETS;
        break;
      case ASSESSMENT_STAGES.TARGET_MARKETS:
        nextStage = ASSESSMENT_STAGES.SUMMARY;
        break;
      // Keep on SUMMARY stage once reached
      case ASSESSMENT_STAGES.SUMMARY:
        nextStage = ASSESSMENT_STAGES.SUMMARY;
        break;
    }
    
    return {
      response: aiResponse,
      nextStage,
      websiteAnalysis: websiteAnalysisResult
    };
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