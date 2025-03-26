import { ConversationMemory, Interaction } from '../types/conversation.types';
import { PrismaClient } from '@prisma/client';

export class ContextMemoryEngine {
  private prisma: PrismaClient;
  private memoryCache: Map<string, ConversationMemory>;
  
  constructor() {
    this.prisma = new PrismaClient();
    this.memoryCache = new Map();
  }
  
  async createMemory(userId: string): Promise<string> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const memory: ConversationMemory = {
      conversationId,
      userId,
      userProfile: {
        company: ''
      },
      smeProfile: {
        products: [],
        targetMarkets: [],
        manufacturingCapacity: {}
      },
      assessmentProgress: {
        currentStage: 'initial',
        pendingQuestions: ['business_name', 'product_identification']
      },
      interactionHistory: []
    };
    
    // Store in database
    await this.prisma.conversation.create({
      data: {
        id: conversationId,
        userId,
        memory: memory as any
      }
    });
    
    // Cache in memory
    this.memoryCache.set(conversationId, memory);
    
    return conversationId;
  }
  
  async getMemory(conversationId: string): Promise<ConversationMemory | null> {
    // Check cache first
    if (this.memoryCache.has(conversationId)) {
      return this.memoryCache.get(conversationId)!;
    }
    
    // If not in cache, get from database
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId }
    });
    
    if (!conversation) {
      return null;
    }
    
    // Cache and return
    const memory = JSON.parse(JSON.stringify(conversation.memory)) as ConversationMemory;
    this.memoryCache.set(conversationId, memory);
    return memory;
  }
  
  async updateMemory(conversationId: string, updates: Partial<ConversationMemory>): Promise<void> {
    // Get current memory
    const memory = await this.getMemory(conversationId);
    if (!memory) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    // Apply updates
    const updatedMemory = {
      ...memory,
      ...updates
    };
    
    // Update cache
    this.memoryCache.set(conversationId, updatedMemory);
    
    // Update database
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        memory: updatedMemory as any
      }
    });
  }
  
  async addInteraction(conversationId: string, interaction: Interaction): Promise<void> {
    const memory = await this.getMemory(conversationId);
    if (!memory) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    // Add timestamp if not provided
    const timestampedInteraction = {
      ...interaction,
      timestamp: interaction.timestamp || new Date()
    };
    
    // Update memory with new interaction
    const updatedMemory = {
      ...memory,
      interactionHistory: [...memory.interactionHistory, timestampedInteraction]
    };
    
    // Update cache and database
    this.memoryCache.set(conversationId, updatedMemory);
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        memory: updatedMemory as any
      }
    });
  }
  
  async clearMemory(conversationId: string): Promise<void> {
    // Remove from cache
    this.memoryCache.delete(conversationId);
    
    // Delete from database
    await this.prisma.conversation.delete({
      where: { id: conversationId }
    });
  }
} 