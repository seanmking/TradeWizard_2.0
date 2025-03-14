/**
 * Dynamic Prompt Generation System
 * 
 * This system generates optimized prompts based on industry and query type
 * to reduce token usage and improve response quality.
 */

import { estimateTokenCount } from '../cost-monitoring';
import type { TaskType } from '../openai-service';

// Types of prompts we can generate
export type PromptType = 
  'market_analysis' | 
  'regulatory_info' | 
  'export_readiness' | 
  'product_analysis' | 
  'customer_profile' | 
  'logistics' | 
  'certification' | 
  'general';

// Industries we have specialized templates for
export type Industry = 
  'agriculture' | 
  'manufacturing' | 
  'mining' | 
  'technology' | 
  'textiles' | 
  'food_beverage' | 
  'automotive' | 
  'chemicals' | 
  'other';

// Prompt template configuration
export interface PromptTemplate {
  id: string;
  type: PromptType;
  industry: Industry | 'all';
  template: string;
  requiredVars: string[];
  optionalVars?: string[];
  tokenEstimate: number;
}

// Placeholder variable syntax in templates: {{variable_name}}
const VARIABLE_REGEX = /\{\{([a-zA-Z0-9_]+)\}\}/g;

// Industry-specific templates
const TEMPLATES: PromptTemplate[] = [
  // Agriculture industry templates
  {
    id: 'agriculture_market_analysis',
    type: 'market_analysis',
    industry: 'agriculture',
    template: `Analyze the {{product}} market in {{target_market}}. Focus on:
1. Import regulations specific to agricultural products
2. Seasonal demand patterns
3. Local production and competition
4. Phytosanitary requirements
5. Key distribution channels for agricultural products
Keep the analysis factual and concise.`,
    requiredVars: ['product', 'target_market'],
    tokenEstimate: 60
  },
  
  // Manufacturing industry templates
  {
    id: 'manufacturing_regulatory_info',
    type: 'regulatory_info',
    industry: 'manufacturing',
    template: `Provide key regulatory information for exporting {{product}} to {{target_market}}. Focus only on:
1. Required product certifications
2. Safety standards
3. Labeling requirements
4. Import duties and taxes
5. Restricted components or materials
Be specific and factual without unnecessary explanations.`,
    requiredVars: ['product', 'target_market'],
    tokenEstimate: 65
  },
  
  // Generic templates for all industries
  {
    id: 'generic_export_readiness',
    type: 'export_readiness',
    industry: 'all',
    template: `Assess export readiness for {{business_name}} based on:
1. Current business scale: {{business_size}}
2. Export experience: {{export_experience}}
3. Product types: {{product_types}}
4. Target markets: {{target_markets}}
Provide a concise assessment with actionable next steps.`,
    requiredVars: ['business_name', 'business_size', 'export_experience', 'product_types'],
    optionalVars: ['target_markets'],
    tokenEstimate: 70
  },
  
  // Technology industry templates
  {
    id: 'technology_certification',
    type: 'certification',
    industry: 'technology',
    template: `List only the essential certifications needed for {{product}} to be exported to {{target_market}}.
Focus on technology-specific requirements such as:
1. Electrical safety certifications
2. EMC requirements
3. Data security standards
4. Telecom regulations
Provide only the name and brief purpose of each certification.`,
    requiredVars: ['product', 'target_market'],
    tokenEstimate: 55
  }
];

/**
 * Dynamic prompt generator for creating optimized, industry-specific prompts
 */
export class PromptGenerator {
  private templates: PromptTemplate[] = TEMPLATES;
  private tokensBeforeOptimization: number = 0;
  private tokensAfterOptimization: number = 0;
  
  /**
   * Add a custom template to the system
   */
  addTemplate(template: PromptTemplate): void {
    this.templates.push(template);
  }
  
  /**
   * Get all available templates
   */
  getAllTemplates(): PromptTemplate[] {
    return [...this.templates];
  }
  
  /**
   * Get templates filtered by type and/or industry
   */
  getTemplates(type?: PromptType, industry?: Industry): PromptTemplate[] {
    return this.templates.filter(template => {
      const matchesType = !type || template.type === type;
      const matchesIndustry = !industry || template.industry === industry || template.industry === 'all';
      return matchesType && matchesIndustry;
    });
  }
  
  /**
   * Find the best template for a specific use case
   */
  findBestTemplate(
    type: PromptType,
    industry: Industry = 'other',
    requiredVars: string[]
  ): PromptTemplate | null {
    // First try to find an industry-specific template
    const industrySpecific = this.templates.find(template => 
      template.type === type && 
      template.industry === industry &&
      requiredVars.every(v => template.requiredVars.includes(v))
    );
    
    if (industrySpecific) {
      return industrySpecific;
    }
    
    // Fall back to a generic template
    return this.templates.find(template => 
      template.type === type && 
      template.industry === 'all' &&
      requiredVars.every(v => template.requiredVars.includes(v))
    ) || null;
  }
  
  /**
   * Generate a prompt using an appropriate template
   */
  generatePrompt(
    type: PromptType,
    industry: Industry = 'other',
    variables: Record<string, string>
  ): string {
    // Track original prompt size for comparison
    const originalPrompt = `Provide information about ${Object.values(variables).join(', ')}`;
    this.tokensBeforeOptimization = estimateTokenCount(originalPrompt);
    
    // Find appropriate template
    const requiredVars = Object.keys(variables);
    const template = this.findBestTemplate(type, industry, requiredVars);
    
    if (!template) {
      console.log(`No template found for ${type}/${industry}, using generic prompt`);
      const fallbackPrompt = `Provide ${type.replace('_', ' ')} information about ${Object.values(variables).join(', ')}`;
      this.tokensAfterOptimization = estimateTokenCount(fallbackPrompt);
      return fallbackPrompt;
    }
    
    // Check that all required variables are provided
    const missingVars = template.requiredVars.filter(v => !(v in variables));
    if (missingVars.length > 0) {
      console.error(`Missing required variables for template ${template.id}: ${missingVars.join(', ')}`);
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }
    
    // Replace variables in template
    let prompt = template.template.replace(VARIABLE_REGEX, (match, varName) => {
      return variables[varName] || match;
    });
    
    // Track optimized prompt size
    this.tokensAfterOptimization = estimateTokenCount(prompt);
    
    console.log(`Prompt optimization: ${this.tokensBeforeOptimization} → ${this.tokensAfterOptimization} tokens (${this.getOptimizationPercentage()}% reduction)`);
    
    return prompt;
  }
  
  /**
   * Get token savings from the most recent prompt generation
   */
  getTokenSavings(): { before: number, after: number, saved: number, percentage: string } {
    const saved = this.tokensBeforeOptimization - this.tokensAfterOptimization;
    return {
      before: this.tokensBeforeOptimization,
      after: this.tokensAfterOptimization,
      saved: saved,
      percentage: this.getOptimizationPercentage()
    };
  }
  
  /**
   * Calculate optimization percentage
   */
  private getOptimizationPercentage(): string {
    if (this.tokensBeforeOptimization === 0) return '0';
    const percentage = ((this.tokensBeforeOptimization - this.tokensAfterOptimization) / this.tokensBeforeOptimization) * 100;
    return percentage.toFixed(1);
  }
  
  /**
   * Generate a system instruction based on the task type
   */
  generateSystemInstruction(taskType: TaskType): string {
    switch (taskType) {
      case 'website_analysis':
        return 'You are an export business analyst. Analyze the website data to identify export opportunities and challenges.';
      case 'export_experience':
        return 'You are an export advisor. Assess export readiness based on past experience.';
      case 'export_motivation':
        return 'You are an export strategist. Help clarify export motivation and align with business goals.';
      case 'target_markets':
        return 'You are a market research specialist. Provide focused information on target export markets.';
      case 'summary':
        return 'You are an export consultant. Summarize key findings and recommendations in a concise manner.';
      default:
        return 'You are an international trade assistant. Provide helpful and accurate information.';
    }
  }
}

// Create singleton instance
export const promptGenerator = new PromptGenerator();
export default promptGenerator; 