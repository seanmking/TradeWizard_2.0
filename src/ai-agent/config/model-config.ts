/**
 * Configuration for the AI model selector
 * This file defines the thresholds and settings used to determine which
 * model to use for different types of tasks.
 */

import { TaskType } from '../services/model-selector';

/**
 * Configuration for model selection and complexity detection
 */
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
    technicalTermCount: {
      medium: number; // Threshold for medium complexity
      high: number;   // Threshold for high complexity
    };
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
  
  // Technical terms indicating higher complexity
  technicalTerms: string[];
}

/**
 * Default configuration for model selection
 */
export const defaultModelConfig: ModelSelectionConfig = {
  complexityThresholds: {
    queryLength: {
      medium: 100, // Queries longer than 100 chars are medium complexity
      high: 300    // Queries longer than 300 chars are high complexity
    },
    industryTermCount: {
      medium: 2,   // 2+ industry terms indicates medium complexity
      high: 5      // 5+ industry terms indicates high complexity
    },
    technicalTermCount: {
      medium: 1,   // 1+ technical terms indicates medium complexity
      high: 3      // 3+ technical terms indicates high complexity
    }
  },
  
  // Map complexity levels to specific models
  modelMapping: {
    high: 'gpt-4',          // Use GPT-4 for high complexity
    medium: 'gpt-3.5-turbo', // Use GPT-3.5 for medium complexity
    low: 'gpt-3.5-turbo'     // Use GPT-3.5 for low complexity
  },
  
  // Override settings for specific task types that always require a specific model
  taskTypeOverrides: {
    'website_analysis': 'gpt-4',  // Always use GPT-4 for website analysis
    'summary': 'gpt-4'            // Always use GPT-4 for summary generation
  },
  
  // Industry-specific terms that might indicate higher complexity
  industryTerms: [
    'export', 'import', 'tariff', 'customs', 'duty', 'compliance', 'regulation',
    'logistics', 'supply chain', 'distribution', 'shipping', 'freight',
    'trade agreement', 'certificate of origin', 'incoterms', 'letter of credit',
    'foreign exchange', 'market entry', 'international', 'global',
    'sanctions', 'quota', 'market access', 'trade barrier', 'customs clearance'
  ],
  
  // Technical terms indicating complexity
  technicalTerms: [
    'classification', 'harmonized system', 'hs code', 'risk assessment',
    'comparative advantage', 'market research', 'competitor analysis',
    'due diligence', 'regulatory compliance', 'intellectual property',
    'patent', 'trademark', 'copyright', 'licensing', 'market segmentation',
    'b2b', 'b2c', 'exchange rate', 'foreign direct investment', 'joint venture',
    'subsidiary', 'wholly-owned', 'market penetration', 'market development'
  ]
}; 