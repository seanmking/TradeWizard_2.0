import { AssessmentStage, AssessmentState, BusinessInfo, ConversationResponse, MarketData } from './types';
import { CONVERSATION_PROMPTS } from './conversation-prompts';
import { WITSDataService } from '../mcp/wits-service';
import { prisma } from '../../../../backend/prisma/client';

export class SarahConversationEngine {
  private witsService: WITSDataService;

  constructor() {
    this.witsService = new WITSDataService();
  }

  async processUserInput(userId: string, input: string): Promise<ConversationResponse> {
    const state = await this.getAssessmentState(userId);
    const response = await this.processStage(state, input);
    await this.updateAssessmentState(userId, state);
    return response;
  }

  private async getAssessmentState(userId: string): Promise<AssessmentState> {
    const assessment = await prisma.assessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!assessment) {
      return {
        currentStage: 'welcome',
        businessInfo: {},
        completedStages: []
      };
    }

    return {
      currentStage: assessment.stage as AssessmentStage,
      businessInfo: assessment.businessInfo as BusinessInfo,
      marketData: assessment.marketData as MarketData | undefined,
      selectedMarket: assessment.selectedMarket,
      completedStages: assessment.completedStages as AssessmentStage[]
    };
  }

  private async updateAssessmentState(userId: string, state: AssessmentState): Promise<void> {
    await prisma.assessment.upsert({
      where: {
        userId_stage: {
          userId,
          stage: state.currentStage
        }
      },
      update: {
        businessInfo: state.businessInfo,
        marketData: state.marketData,
        selectedMarket: state.selectedMarket,
        completedStages: state.completedStages
      },
      create: {
        userId,
        stage: state.currentStage,
        businessInfo: state.businessInfo,
        marketData: state.marketData,
        selectedMarket: state.selectedMarket,
        completedStages: state.completedStages
      }
    });
  }

  private async processStage(state: AssessmentState, input: string): Promise<ConversationResponse> {
    switch (state.currentStage) {
      case 'welcome':
        return this.handleWelcomeStage(state, input);
      case 'website_analysis':
        return this.handleWebsiteAnalysis(state, input);
      case 'production_capacity':
        return this.handleProductionCapacity(state, input);
      case 'market_interest':
        return this.handleMarketInterest(state, input);
      case 'capability_assessment':
        return this.handleCapabilityAssessment(state, input);
      case 'quality_standards':
        return this.handleQualityStandards(state, input);
      case 'financial_readiness':
        return this.handleFinancialReadiness(state, input);
      case 'operational_assessment':
        return this.handleOperationalAssessment(state, input);
      default:
        throw new Error(`Unknown stage: ${state.currentStage}`);
    }
  }

  private async handleWelcomeStage(state: AssessmentState, input: string): Promise<ConversationResponse> {
    state.businessInfo.website = this.validateUrl(input);
    state.completedStages.push('welcome');
    state.currentStage = 'website_analysis';
    return CONVERSATION_PROMPTS.website_analysis({ url: input });
  }

  private async handleWebsiteAnalysis(state: AssessmentState, input: string): Promise<ConversationResponse> {
    const volume = this.extractNumber(input);
    state.businessInfo.monthlyVolume = volume;
    state.completedStages.push('website_analysis');
    state.currentStage = 'production_capacity';
    return CONVERSATION_PROMPTS.production_capacity({ volume });
  }

  private async handleProductionCapacity(state: AssessmentState, input: string): Promise<ConversationResponse> {
    if (input.toLowerCase().includes('yes')) {
      const markets = await this.witsService.getTopMarkets('placeholder_code', 3);
      state.completedStages.push('production_capacity');
      state.currentStage = 'market_interest';
      return CONVERSATION_PROMPTS.market_interest({ markets });
    }
    return CONVERSATION_PROMPTS.production_capacity({ volume: state.businessInfo.monthlyVolume });
  }

  private async handleMarketInterest(state: AssessmentState, selectedMarket: string): Promise<ConversationResponse> {
    const marketData = await this.witsService.getMarketRequirements('placeholder_code', selectedMarket);
    if (!marketData) {
      throw new Error(`Failed to fetch market data for ${selectedMarket}`);
    }
    state.marketData = marketData;
    state.selectedMarket = selectedMarket;
    state.completedStages.push('market_interest');
    state.currentStage = 'capability_assessment';
    return CONVERSATION_PROMPTS.capability_assessment({ 
      market: selectedMarket,
      requirements: { minOrderSize: 1000 } // Placeholder value
    });
  }

  private async handleCapabilityAssessment(state: AssessmentState, input: string): Promise<ConversationResponse> {
    state.completedStages.push('capability_assessment');
    state.currentStage = 'quality_standards';
    return CONVERSATION_PROMPTS.quality_standards({
      market: state.selectedMarket!,
      requirements: state.marketData?.requirements!
    });
  }

  private async handleQualityStandards(state: AssessmentState, input: string): Promise<ConversationResponse> {
    state.completedStages.push('quality_standards');
    state.currentStage = 'financial_readiness';
    return CONVERSATION_PROMPTS.financial_readiness({
      market: state.selectedMarket!,
      requirements: state.marketData?.requirements!
    });
  }

  private async handleFinancialReadiness(state: AssessmentState, input: string): Promise<ConversationResponse> {
    state.completedStages.push('financial_readiness');
    state.currentStage = 'operational_assessment';
    return CONVERSATION_PROMPTS.operational_assessment();
  }

  private async handleOperationalAssessment(state: AssessmentState, input: string): Promise<ConversationResponse> {
    state.completedStages.push('operational_assessment');
    // End of assessment, return a completion message
    return {
      message: "Great! I've gathered all the information needed for your assessment. Would you like to see your export readiness report?",
      actions: {
        type: 'button',
        options: ['View Report', 'Continue Assessment']
      }
    };
  }

  private validateUrl(url: string): string {
    try {
      new URL(url);
      return url;
    } catch {
      return url; // Accept non-URL input for now
    }
  }

  private extractNumber(input: string): number {
    const match = input.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
} 