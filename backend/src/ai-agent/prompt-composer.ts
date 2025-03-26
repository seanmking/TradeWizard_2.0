import { ConversationMemory } from '../types/conversation.types';

export class PromptComposer {
  composeConversationPrompt(memory: ConversationMemory, type: 'conversation' | 'analysis'): string {
    const basePrompt = `You are Sarah, an expert export readiness consultant at TradeWizard. Your role is to help businesses assess their export readiness and identify opportunities in international markets.

Current Context:
- Business: ${memory.userProfile.company || 'Unknown'}
- Products: ${memory.smeProfile.products.map(p => p.name).join(', ') || 'None identified yet'}
- Assessment Stage: ${memory.assessmentProgress.currentStage}
- Target Markets: ${memory.smeProfile.targetMarkets.join(', ') || 'Not selected yet'}

Manufacturing Capacity:
${this.formatManufacturingCapacity(memory)}

Assessment Progress:
${this.formatAssessmentProgress(memory)}

Your communication style should be:
1. Professional yet conversational
2. Clear and concise
3. Encouraging and supportive
4. Focused on gathering necessary information
5. Educational when providing insights

${this.getStageSpecificInstructions(memory.assessmentProgress.currentStage)}`;

    if (type === 'analysis') {
      return basePrompt + `\n\nFocus on analyzing the provided information and generating insights. Be thorough in your analysis but present findings in a clear, actionable format.`;
    }

    return basePrompt;
  }

  private formatManufacturingCapacity(memory: ConversationMemory): string {
    const capacity = memory.smeProfile.manufacturingCapacity;
    if (!capacity.monthlyVolume) {
      return '- Not yet provided';
    }

    return `- Monthly Volume: ${capacity.monthlyVolume} units
- Scalability: ${capacity.scalabilityPercentage || 'Unknown'}% potential increase
- Certifications: ${capacity.certifications?.join(', ') || 'None specified'}`;
  }

  private formatAssessmentProgress(memory: ConversationMemory): string {
    const { currentStage, pendingQuestions } = memory.assessmentProgress;
    
    const stages = [
      'initial',
      'product_identification',
      'manufacturing_capacity',
      'market_selection',
      'competitive_analysis',
      'export_readiness_summary'
    ];

    const currentIndex = stages.indexOf(currentStage);
    const progress = stages.map((stage, index) => {
      const status = index < currentIndex ? '✓' : 
                     index === currentIndex ? '→' : 
                     '○';
      return `${status} ${this.formatStageName(stage)}`;
    }).join('\n');

    return `${progress}\n\nPending Questions: ${pendingQuestions.length > 0 ? 
      '\n- ' + pendingQuestions.map(q => this.formatQuestionName(q)).join('\n- ') : 
      'None'}`;
  }

  private formatStageName(stage: string): string {
    return stage
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatQuestionName(question: string): string {
    const questionMap: { [key: string]: string } = {
      'business_name': 'Company name',
      'product_identification': 'Product details',
      'manufacturing_capacity': 'Manufacturing capacity information',
      'target_markets': 'Target market selection',
      'competitive_analysis': 'Competitive landscape analysis'
    };

    return questionMap[question] || question;
  }

  private getStageSpecificInstructions(stage: string): string {
    switch (stage) {
      case 'initial':
        return `Focus on:
- Introducing yourself and the assessment process
- Gathering basic business information
- Understanding their export goals
- Identifying their products`;

      case 'product_identification':
        return `Focus on:
- Gathering detailed product information
- Identifying HS codes
- Understanding product specifications
- Assessing product export readiness`;

      case 'manufacturing_capacity':
        return `Focus on:
- Current production capacity
- Scalability potential
- Quality certifications
- Production flexibility`;

      case 'market_selection':
        return `Focus on:
- Target market preferences
- Market entry requirements
- Trade agreements
- Logistics considerations`;

      case 'competitive_analysis':
        return `Focus on:
- Market positioning
- Competitive advantages
- Price point analysis
- Market entry strategy`;

      case 'export_readiness_summary':
        return `Focus on:
- Summarizing findings
- Providing actionable recommendations
- Highlighting key opportunities
- Identifying next steps`;

      default:
        return '';
    }
  }
} 