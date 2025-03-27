import { AssessmentStage, ConversationResponse, InputAction, ButtonAction, MultiChoiceAction } from './types';

export const CONVERSATION_PROMPTS: Record<AssessmentStage, (data?: any) => ConversationResponse> = {
  welcome: () => ({
    message: "Hi! I'm Sarah, your export readiness consultant. To get started, could you share your business website or social media link? This will help me understand your business better.",
    actions: {
      type: 'input',
      placeholder: 'Enter your website or social media URL'
    },
    nextStage: 'website_analysis'
  }),

  website_analysis: (data?: { url: string }) => ({
    message: data?.url 
      ? `Great! I've taken a look at your website. To help assess your export potential, could you tell me your current monthly production volume?`
      : `No problem! Could you tell me about your main products and your current monthly production volume?`,
    actions: {
      type: 'input',
      placeholder: 'Enter your monthly production volume'
    },
    nextStage: 'production_capacity'
  }),

  production_capacity: (data?: { volume: number }) => ({
    message: `Based on your production volume of ${data?.volume} units per month, I can help identify suitable markets. Would you like to see specific market requirements?`,
    actions: {
      type: 'button',
      options: ['Yes, show me market requirements', 'Not yet, tell me more first']
    },
    nextStage: 'market_interest'
  }),

  market_interest: (data?: { markets: Array<{ targetMarket: string; growthRate: number }> }) => ({
    message: `Based on your product category, I've identified these markets with strong growth potential:\n${
      data?.markets.map(m => `- ${m.targetMarket} (${m.growthRate}% growth)`).join('\n')
    }\nWhich market interests you most?`,
    actions: {
      type: 'multiChoice',
      options: data?.markets.map(m => m.targetMarket) || []
    },
    nextStage: 'capability_assessment'
  }),

  capability_assessment: (data?: { market: string; requirements: { minOrderSize: number } }) => ({
    message: `For ${data?.market}, typical minimum orders are around ${data?.requirements?.minOrderSize} units. Could you scale your production to meet this demand?`,
    actions: {
      type: 'button',
      options: ['Yes, definitely', 'Maybe with some adjustments', 'No, that would be difficult']
    },
    nextStage: 'quality_standards'
  }),

  quality_standards: (data?: { market: string; requirements: { certifications: string[] } }) => ({
    message: `${data?.market} requires these certifications: ${data?.requirements?.certifications.join(', ')}. Do you have any of these certifications?`,
    actions: {
      type: 'multiChoice',
      options: [...(data?.requirements?.certifications || []), 'None of these yet']
    },
    nextStage: 'financial_readiness'
  }),

  financial_readiness: (data?: { market: string; requirements: { workingCapital: number; paymentTerms: string } }) => ({
    message: `Exporting to ${data?.market} typically requires:\n- Working capital: $${data?.requirements?.workingCapital}\n- Payment terms: ${data?.requirements?.paymentTerms}\nHow comfortable are you with these financial requirements?`,
    actions: {
      type: 'button',
      options: ['Very comfortable', 'Somewhat comfortable', 'Need more information']
    },
    nextStage: 'operational_assessment'
  }),

  operational_assessment: () => ({
    message: "Let's look at your operational readiness. Which aspect would you like to explore first?",
    actions: {
      type: 'multiChoice',
      options: [
        'Logistics and shipping',
        'Documentation and compliance',
        'Marketing and distribution',
        'After-sales support'
      ]
    }
  })
}; 