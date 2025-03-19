/**
 * Types and interfaces related to conversation management with Sarah AI
 */
import { OpenAIMessage } from './openai-service';

/**
 * Communication profile for tone and style preferences
 */
export interface CommunicationProfile {
  preferredTone?: 'professional' | 'friendly' | 'formal' | 'casual';
  languageComplexity?: 'simple' | 'moderate' | 'advanced';
  emotionalResonance?: string[];
}

/**
 * Context for the conversation, containing key assessment data
 */
export interface ConversationContext {
  // User information
  userName?: string;
  userId?: string;
  role?: string;
  
  // Business information
  businessName?: string;
  industry?: string;
  website?: string;
  
  // Export information
  exportExperience?: string;
  motivation?: string;
  targetMarkets?: string[];
  supportedTargetMarkets?: string[];
  
  // Communication preferences
  communicationProfile?: CommunicationProfile;
  
  // Assessment meta data
  currentStage?: string;
  assessmentStarted?: Date;
  
  // Additional info
  additionalNotes?: string;
}

/**
 * Represents a single conversation with context and message history
 */
export class Conversation {
  private messages: OpenAIMessage[] = [];
  private context: ConversationContext;
  private systemPrompt: string;
  private maxStoredMessages = 15; // Limit the number of stored messages
  
  constructor(systemPrompt: string, userId?: string) {
    this.systemPrompt = systemPrompt;
    this.context = { 
      userId,
      assessmentStarted: new Date() 
    };
    
    // Add the system message to start the conversation
    this.messages.push({
      role: 'system',
      content: systemPrompt
    });
  }
  
  /**
   * Add a user message to the conversation
   */
  addUserMessage(content: string): void {
    this.messages.push({
      role: 'user',
      content
    });
    
    // Trim message history if needed
    this.trimMessageHistory();
  }
  
  /**
   * Add an assistant (AI) message to the conversation
   */
  addAssistantMessage(content: string): void {
    this.messages.push({
      role: 'assistant',
      content
    });
    
    // Trim message history if needed
    this.trimMessageHistory();
  }
  
  /**
   * Trim message history to reduce token usage
   */
  private trimMessageHistory(): void {
    if (this.messages.length <= this.maxStoredMessages) return;
    
    // Keep system message and last (maxStoredMessages-1) messages
    const systemMessages = this.messages.filter(m => m.role === 'system');
    const nonSystemMessages = this.messages.filter(m => m.role !== 'system')
      .slice(-(this.maxStoredMessages - systemMessages.length));
    
    this.messages = [...systemMessages, ...nonSystemMessages];
  }
  
  /**
   * Get all messages in the conversation
   */
  getAllMessages(): OpenAIMessage[] {
    return [...this.messages];
  }
  
  /**
   * Get the most recent n messages
   */
  getRecentMessages(count: number): OpenAIMessage[] {
    // Always include the system message(s)
    const systemMessages = this.messages.filter(m => m.role === 'system');
    const nonSystemMessages = this.messages.filter(m => m.role !== 'system').slice(-count);
    
    return [...systemMessages, ...nonSystemMessages];
  }
  
  /**
   * Update the conversation context with new information
   */
  updateContext(update: Partial<ConversationContext>): void {
    this.context = {
      ...this.context,
      ...update
    };
  }
  
  /**
   * Get the current conversation context
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }
  
  /**
   * Reset the conversation, keeping only the system prompt
   */
  reset(): void {
    const userId = this.context.userId;
    this.messages = [{
      role: 'system',
      content: this.systemPrompt
    }];
    this.context = { 
      userId,
      assessmentStarted: new Date() 
    };
  }
}

/**
 * Manages multiple conversations across different users
 */
export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  private defaultSystemPrompt: string;
  
  constructor(defaultSystemPrompt: string) {
    this.defaultSystemPrompt = defaultSystemPrompt;
  }
  
  /**
   * Get or create a conversation for a specific user
   */
  getConversation(userId: string): Conversation {
    if (!this.conversations.has(userId)) {
      this.conversations.set(
        userId, 
        new Conversation(this.defaultSystemPrompt, userId)
      );
    }
    
    return this.conversations.get(userId)!;
  }
  
  /**
   * Alias for getConversation for more explicit naming
   * Gets an existing conversation or creates a new one if it doesn't exist
   */
  getOrCreateConversation(userId: string): Conversation {
    return this.getConversation(userId);
  }
  
  /**
   * Reset a user's conversation
   */
  resetConversation(userId: string): void {
    if (this.conversations.has(userId)) {
      this.conversations.get(userId)!.reset();
    } else {
      this.getConversation(userId);
    }
  }
  
  /**
   * Delete a conversation
   */
  deleteConversation(userId: string): boolean {
    return this.conversations.delete(userId);
  }
  
  /**
   * Clean up inactive conversations older than the specified hours
   */
  cleanupInactiveConversations(olderThanHours: number = 24): number {
    let count = 0;
    const now = new Date();
    
    this.conversations.forEach((conversation, userId) => {
      const context = conversation.getContext();
      const startTime = context.assessmentStarted;
      
      if (startTime) {
        const hoursSinceStart = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceStart > olderThanHours) {
          this.deleteConversation(userId);
          count++;
        }
      }
    });
    
    return count;
  }
} 