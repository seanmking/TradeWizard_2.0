import { OpenAI } from 'openai';
import { ContextMemoryEngine, ConversationMemory } from './context-memory';
import { PromptComposer } from './prompt-composer';
import { ComplianceMCP } from '../mcp/compliance-mcp/compliance-mcp.service';
import { MarketIntelligenceMCP } from '../mcp/market-intelligence-mcp/market-intelligence-mcp.service';
import { LLMProductAnalyzerService } from '../services/llm-product-analyzer.service';
import { ProductData } from '../types/product.types';
import { ConversationMemory, Message, Intent } from '../types/conversation.types';
import { ProductAnalysisResult } from '../types/product.types';

export class ConversationManager {
  private openai: OpenAI;
  private memoryEngine: ContextMemoryEngine;
  private promptComposer: PromptComposer;
  private complianceMCP: ComplianceMCP;
  private marketMCP: MarketIntelligenceMCP;
  private productAnalyzer: LLMProductAnalyzerService;
  
  constructor(
    memoryEngine: ContextMemoryEngine,
    promptComposer: PromptComposer,
    complianceMCP: ComplianceMCP,
    marketMCP: MarketIntelligenceMCP,
    productAnalyzer: LLMProductAnalyzerService
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.memoryEngine = memoryEngine;
    this.promptComposer = promptComposer;
    this.complianceMCP = complianceMCP;
    this.marketMCP = marketMCP;
    this.productAnalyzer = productAnalyzer;
  }
  
  async processMessage(conversationId: string, userMessage: string): Promise<any> {
    // Get conversation memory
    const memory = await this.memoryEngine.getMemory(conversationId);
    if (!memory) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    // Add user message to memory
    await this.memoryEngine.addInteraction(conversationId, {
      type: 'user',
      content: userMessage
    });
    
    // Analyze intent and entities in the message
    const { intent, entities } = await this.analyzeMessage(userMessage, memory);
    
    // Update memory with any extracted entities
    await this.updateMemoryWithEntities(conversationId, memory, entities);
    
    // Process the message based on current stage and intent
    let response;
    
    switch (memory.assessmentProgress.currentStage) {
      case 'initial':
        response = await this.handleInitialStage(userMessage, memory, entities);
        break;
      case 'product_identification':
        response = await this.handleProductIdentification(userMessage, memory, entities);
        break;
      case 'manufacturing_capacity':
        response = await this.handleManufacturingCapacity(userMessage, memory, entities);
        break;
      case 'market_selection':
        response = await this.handleMarketSelection(userMessage, memory, entities);
        break;
      case 'competitive_analysis':
        response = await this.handleCompetitiveAnalysis(userMessage, memory, entities);
        break;
      default:
        response = await this.generateConversationalResponse(userMessage, memory);
    }
    
    // Add AI response to memory
    await this.memoryEngine.addInteraction(conversationId, {
      type: 'assistant',
      content: response.message
    });
    
    // Return the response with any additional data
    return response;
  }
  
  private async analyzeMessage(userMessage: string, memory: ConversationMemory): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `
              You are an entity extraction system for an export assistance platform.
              
              Current context:
              - Business: ${memory.userProfile.company || 'Unknown'}
              - Products: ${memory.smeProfile.products.map(p => p.name).join(', ') || 'Unknown'}
              - Assessment stage: ${memory.assessmentProgress.currentStage}
              
              Extract the following entities from the user message:
              - business_name: Company name mentioned
              - products: Any products or product categories mentioned
              - markets: Any countries or regions mentioned as export destinations
              - manufacturing_capacity: Any mentions of production volume, capacity, or scaling
              - certifications: Any certifications or standards mentioned
              
              Also determine the primary intent of the message:
              - provide_info: User is providing requested information
              - ask_question: User is asking a question
              - request_analysis: User wants analysis of specific information
              - change_topic: User wants to discuss something different
              
              Return a JSON object with the extracted entities and intent.
            `
          },
          { role: "user", content: userMessage }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing message:', error);
      return { intent: 'provide_info', entities: {} };
    }
  }
  
  private async updateMemoryWithEntities(
    conversationId: string, 
    memory: ConversationMemory, 
    entities: any
  ): Promise<void> {
    const updates: Partial<ConversationMemory> = {};
    
    // Update user profile if business name is provided
    if (entities.business_name && !memory.userProfile.company) {
      updates.userProfile = {
        ...memory.userProfile,
        company: entities.business_name
      };
    }
    
    // Update product information if products are mentioned
    if (entities.products && entities.products.length > 0) {
      // Process each product to avoid duplicates
      const existingProductNames = memory.smeProfile.products.map(p => p.name.toLowerCase());
      const newProducts = entities.products
        .filter((product: string) => !existingProductNames.includes(product.toLowerCase()))
        .map((product: string) => ({ 
          name: product,
          identified: true,
          needsAnalysis: true
        }));
      
      if (newProducts.length > 0) {
        updates.smeProfile = {
          ...memory.smeProfile,
          products: [...memory.smeProfile.products, ...newProducts]
        };
      }
    }
    
    // Update target markets if mentioned
    if (entities.markets && entities.markets.length > 0) {
      const existingMarkets = memory.smeProfile.targetMarkets;
      const newMarkets = entities.markets.filter(
        (market: string) => !existingMarkets.includes(market)
      );
      
      if (newMarkets.length > 0) {
        updates.smeProfile = {
          ...memory.smeProfile,
          targetMarkets: [...existingMarkets, ...newMarkets]
        };
      }
    }
    
    // Update manufacturing capacity if mentioned
    if (entities.manufacturing_capacity) {
      updates.smeProfile = {
        ...memory.smeProfile,
        manufacturingCapacity: {
          ...memory.smeProfile.manufacturingCapacity,
          ...entities.manufacturing_capacity
        }
      };
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await this.memoryEngine.updateMemory(conversationId, updates);
    }
  }
  
  private async handleInitialStage(userMessage: string, memory: ConversationMemory, entities: any): Promise<any> {
    // Check if we've collected basic information to move to product identification
    const hasBusinessName = memory.userProfile.company !== '';
    const hasProducts = memory.smeProfile.products.length > 0;
    
    let nextStage = memory.assessmentProgress.currentStage;
    let pendingQuestions = [...memory.assessmentProgress.pendingQuestions];
    
    // Update pending questions based on what we've learned
    if (hasBusinessName) {
      pendingQuestions = pendingQuestions.filter(q => q !== 'business_name');
    }
    
    if (hasProducts) {
      pendingQuestions = pendingQuestions.filter(q => q !== 'product_identification');
      
      // If we have products, change stage to product identification
      if (nextStage === 'initial') {
        nextStage = 'product_identification';
      }
    }
    
    // Generate response using the prompt composer
    const systemPrompt = this.promptComposer.composeConversationPrompt({
      ...memory,
      assessmentProgress: {
        ...memory.assessmentProgress,
        pendingQuestions
      }
    }, 'conversation');
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        ...this.getRecentMessages(memory, 5),
        { role: "user", content: userMessage }
      ],
      temperature: 0.7
    });
    
    // Update assessment progress if stage has changed
    if (nextStage !== memory.assessmentProgress.currentStage) {
      await this.memoryEngine.updateMemory(memory.conversationId, {
        assessmentProgress: {
          ...memory.assessmentProgress,
          currentStage: nextStage,
          pendingQuestions
        }
      });
    }
    
    return {
      message: response.choices[0].message.content,
      stage: nextStage,
      pendingQuestions
    };
  }
  
  private async handleProductIdentification(userMessage: string, memory: ConversationMemory, entities: any): Promise<any> {
    // If we have products that need analysis, run product analyzer
    const productsNeedingAnalysis = memory.smeProfile.products.filter(p => p.needsAnalysis);
    
    let updatedProducts = [...memory.smeProfile.products];
    let productAnalysisResults = null;
    
    if (productsNeedingAnalysis.length > 0) {
      // Analyze each product
      for (const product of productsNeedingAnalysis) {
        try {
          const enhancedData = await this.productAnalyzer.analyzeProduct({
            name: product.name,
            description: product.description || ''
          });
          
          // Update product in our list with analysis results
          const productIndex = updatedProducts.findIndex(p => p.name === product.name);
          if (productIndex >= 0) {
            updatedProducts[productIndex] = {
              ...updatedProducts[productIndex],
              ...enhancedData,
              needsAnalysis: false,
              analyzed: true
            };
          }
          
          productAnalysisResults = {
            ...productAnalysisResults,
            [product.name]: enhancedData
          };
        } catch (error) {
          console.error(`Error analyzing product ${product.name}:`, error);
        }
      }
      
      // Update memory with analyzed products
      await this.memoryEngine.updateMemory(memory.conversationId, {
        smeProfile: {
          ...memory.smeProfile,
          products: updatedProducts
        }
      });
    }
    
    // Check if we have enough product details to move to manufacturing capacity
    const allProductsAnalyzed = updatedProducts.every(p => p.analyzed);
    let nextStage = memory.assessmentProgress.currentStage;
    let pendingQuestions = [...memory.assessmentProgress.pendingQuestions];
    
    if (allProductsAnalyzed && updatedProducts.length > 0) {
      // Remove product_identification from pending questions
      pendingQuestions = pendingQuestions.filter(q => q !== 'product_identification');
      
      // Add manufacturing_capacity if not already there
      if (!pendingQuestions.includes('manufacturing_capacity')) {
        pendingQuestions.push('manufacturing_capacity');
      }
      
      nextStage = 'manufacturing_capacity';
    }
    
    // Generate response using the prompt composer
    const systemPrompt = this.promptComposer.composeConversationPrompt({
      ...memory,
      smeProfile: {
        ...memory.smeProfile,
        products: updatedProducts
      },
      assessmentProgress: {
        ...memory.assessmentProgress,
        pendingQuestions
      }
    }, 'conversation');
    
    let messages = [
      { role: "system", content: systemPrompt },
      ...this.getRecentMessages(memory, 5)
    ];
    
    // If we analyzed products, include that context
    if (productAnalysisResults) {
      messages.push({
        role: "system",
        content: `I've analyzed the products and identified the following:\n\n${
          Object.entries(productAnalysisResults).map(([name, data]) => 
            `${name}: HS Code ${(data as any).hs_code}, Category: ${(data as any).category}, Subcategory: ${(data as any).subcategory}`
          ).join('\n')
        }\n\nIncorporate this information naturally in your response if relevant, but don't list all HS codes directly unless the user specifically asks about them.`
      });
    }
    
    messages.push({ role: "user", content: userMessage });
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.7
    });
    
    // Update assessment progress if stage has changed
    if (nextStage !== memory.assessmentProgress.currentStage) {
      await this.memoryEngine.updateMemory(memory.conversationId, {
        assessmentProgress: {
          ...memory.assessmentProgress,
          currentStage: nextStage,
          pendingQuestions
        }
      });
    }
    
    return {
      message: response.choices[0].message.content,
      stage: nextStage,
      pendingQuestions,
      productAnalysis: productAnalysisResults
    };
  }
  
  private async handleManufacturingCapacity(userMessage: string, memory: ConversationMemory, entities: any): Promise<any> {
    // Extract manufacturing capacity information if provided
    let manufacturingUpdated = false;
    if (entities.manufacturing_capacity) {
      await this.memoryEngine.updateMemory(memory.conversationId, {
        smeProfile: {
          ...memory.smeProfile,
          manufacturingCapacity: {
            ...memory.smeProfile.manufacturingCapacity,
            ...entities.manufacturing_capacity
          }
        }
      });
      manufacturingUpdated = true;
    }
    
    // Check if we have enough manufacturing information to move to market selection
    let nextStage = memory.assessmentProgress.currentStage;
    let pendingQuestions = [...memory.assessmentProgress.pendingQuestions];
    
    const hasManufacturingInfo = memory.smeProfile.manufacturingCapacity?.monthlyVolume !== undefined &&
                              memory.smeProfile.manufacturingCapacity?.scalabilityPercentage !== undefined;
    
    if (hasManufacturingInfo || 
        (manufacturingUpdated && entities.manufacturing_capacity?.monthlyVolume !== undefined)) {
      // Remove manufacturing_capacity from pending questions
      pendingQuestions = pendingQuestions.filter(q => q !== 'manufacturing_capacity');
      
      // Add target_markets if not already there
      if (!pendingQuestions.includes('target_markets')) {
        pendingQuestions.push('target_markets');
      }
      
      nextStage = 'market_selection';
    }
    
    // Generate response using the prompt composer
    const systemPrompt = this.promptComposer.composeConversationPrompt({
      ...memory,
      assessmentProgress: {
        ...memory.assessmentProgress,
        pendingQuestions
      }
    }, 'conversation');
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        ...this.getRecentMessages(memory, 5),
        { role: "user", content: userMessage }
      ],
      temperature: 0.7
    });
    
    // Update assessment progress if stage has changed
    if (nextStage !== memory.assessmentProgress.currentStage) {
      await this.memoryEngine.updateMemory(memory.conversationId, {
        assessmentProgress: {
          ...memory.assessmentProgress,
          currentStage: nextStage,
          pendingQuestions
        }
      });
    }
    
    return {
      message: response.choices[0].message.content,
      stage: nextStage,
      pendingQuestions
    };
  }
  
  private async handleMarketSelection(userMessage: string, memory: ConversationMemory, entities: any): Promise<any> {
    // Check if markets have been selected
    let nextStage = memory.assessmentProgress.currentStage;
    let pendingQuestions = [...memory.assessmentProgress.pendingQuestions];
    
    const hasTargetMarkets = memory.smeProfile.targetMarkets.length > 0;
    
    // If we have markets, move to competitive analysis
    if (hasTargetMarkets) {
      // Remove target_markets from pending questions
      pendingQuestions = pendingQuestions.filter(q => q !== 'target_markets');
      
      nextStage = 'competitive_analysis';
    }
    
    // Generate response using the prompt composer
    const systemPrompt = this.promptComposer.composeConversationPrompt({
      ...memory,
      assessmentProgress: {
        ...memory.assessmentProgress,
        pendingQuestions
      }
    }, 'conversation');
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        ...this.getRecentMessages(memory, 5),
        { role: "user", content: userMessage }
      ],
      temperature: 0.7
    });
    
    // Update assessment progress if stage has changed
    if (nextStage !== memory.assessmentProgress.currentStage) {
      await this.memoryEngine.updateMemory(memory.conversationId, {
        assessmentProgress: {
          ...memory.assessmentProgress,
          currentStage: nextStage,
          pendingQuestions
        }
      });
    }
    
    return {
      message: response.choices[0].message.content,
      stage: nextStage,
      pendingQuestions
    };
  }
  
  private async handleCompetitiveAnalysis(userMessage: string, memory: ConversationMemory, entities: any): Promise<any> {
    let competitiveData = {};
    
    // Get competitive data for each product in each target market
    for (const product of memory.smeProfile.products) {
      for (const market of memory.smeProfile.targetMarkets) {
        try {
          // Only fetch competitive data for our supported markets
          if (['UAE', 'USA', 'UK'].includes(market)) {
            const marketData = await this.marketMCP.getMarketData(
              product.hs_code || '',
              market
            );
            
            if (marketData) {
              // Get competitive analysis for this product/market
              const competitiveAnalysis = await this.productAnalyzer.analyzeCompetitiveData(
                product,
                market
              );
              
              competitiveData[`${product.name}_${market}`] = {
                marketData,
                competitiveAnalysis
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching market data for ${product.name} in ${market}:`, error);
        }
      }
    }
    
    // Generate response with competitive data
    let systemPrompt = this.promptComposer.composeConversationPrompt(memory, 'conversation');
    
    // Add competitive data to the prompt
    if (Object.keys(competitiveData).length > 0) {
      systemPrompt += `\n\nI have competitive market data for the following products and markets:\n\n`;
      
      Object.entries(competitiveData).forEach(([key, data]) => {
        const [productName, market] = key.split('_');
        const { competitiveAnalysis } = data as any;
        
        systemPrompt += `${productName} in ${market}:\n`;
        systemPrompt += `- Competing products: ${competitiveAnalysis.competing_products.map((p: any) => 
          `${p.name} (${p.positioning}, ${p.price_range}, ${p.market_share} market share)`
        ).join(', ')}\n`;
        systemPrompt += `- Recommended price point: ${competitiveAnalysis.price_point_recommendation}\n`;
        systemPrompt += `- Market entry difficulty: ${competitiveAnalysis.market_entry_difficulty}\n`;
        systemPrompt += `- Potential advantage: ${competitiveAnalysis.potential_advantage}\n\n`;
      });
      
      systemPrompt += `Share this competitive information with the user to help them understand the market landscape and pricing strategies. Focus on whether their products would be price-competitive in these markets.`;
    }
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        ...this.getRecentMessages(memory, 5),
        { role: "user", content: userMessage }
      ],
      temperature: 0.7
    });
    
    // After competitive analysis, move to export readiness summary
    if (memory.assessmentProgress.currentStage === 'competitive_analysis') {
      await this.memoryEngine.updateMemory(memory.conversationId, {
        assessmentProgress: {
          ...memory.assessmentProgress,
          currentStage: 'export_readiness_summary',
          pendingQuestions: []
        }
      });
    }
    
    return {
      message: response.choices[0].message.content,
      stage: 'export_readiness_summary',
      competitiveData
    };
  }
  
  private async generateConversationalResponse(userMessage: string, memory: ConversationMemory): Promise<any> {
    const systemPrompt = this.promptComposer.composeConversationPrompt(memory, 'conversation');
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        ...this.getRecentMessages(memory, 5),
        { role: "user", content: userMessage }
      ],
      temperature: 0.7
    });
    
    return {
      message: response.choices[0].message.content
    };
  }
  
  private getRecentMessages(memory: ConversationMemory, count: number): any[] {
    // Get the last 'count' messages from the interaction history
    return memory.interactionHistory
      .slice(-count * 2) // Get the last count*2 interactions
      .map(interaction => ({
        role: interaction.type === 'assistant' ? 'assistant' : 'user',
        content: interaction.content
      }));
  }
} 