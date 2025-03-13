/**
 * Model Selector Service
 * 
 * This service determines which AI model to use based on the task type,
 * the complexity of the query, and whether structured data is available.
 */

import { ModelSelectionConfig, defaultModelConfig } from '../config/model-config';

/**
 * Defines the types of tasks that can be performed by the AI service
 */
export type TaskType = 
  'initial_assessment' | 
  'website_analysis' | 
  'export_experience' | 
  'export_motivation' | 
  'target_markets' | 
  'summary' | 
  'follow_up' | 
  'clarification' | 
  'faq';

/**
 * Defines the levels of complexity for tasks
 */
export type TaskComplexity = 'high' | 'medium' | 'low';

/**
 * Model selector service that contains functions for determining
 * which model to use for a given task
 */
class ModelSelector {
  private config: ModelSelectionConfig;

  /**
   * Initialize with default configuration
   */
  constructor(config: ModelSelectionConfig = defaultModelConfig) {
    this.config = { ...config };
  }

  /**
   * Update the configuration
   * @param newConfig - Partial configuration to update
   */
  updateConfig(newConfig: Partial<ModelSelectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get the current configuration
   * @returns Current configuration
   */
  getConfig(): ModelSelectionConfig {
    return { ...this.config };
  }

  /**
   * Detect the complexity of a query based on multiple factors
   * @param queryContent - The text of the query
   * @param taskType - The type of task being performed
   * @returns The detected complexity level
   */
  detectComplexity(
    queryContent: string,
    taskType: TaskType
  ): TaskComplexity {
    // Task type-based complexity rules
    
    // Always treat certain task types as high complexity
    if (
      taskType === 'website_analysis' || 
      taskType === 'summary'
    ) {
      return 'high';
    }
    
    // Always treat certain task types as low complexity
    if (
      taskType === 'clarification' || 
      taskType === 'faq' ||
      taskType === 'follow_up'
    ) {
      return 'low';
    }
    
    // For other tasks, calculate complexity based on query content
    let complexityScore = 0;
    
    // 1. Score based on query length
    const queryLength = queryContent.length;
    
    if (queryLength >= this.config.complexityThresholds.queryLength.high) {
      complexityScore += 2;
    } else if (queryLength >= this.config.complexityThresholds.queryLength.medium) {
      complexityScore += 1;
    }
    
    // 2. Score based on industry terminology
    let industryTermCount = 0;
    this.config.industryTerms.forEach(term => {
      // Use word boundaries for more accurate matching
      const regex = new RegExp(`\\b${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(queryContent)) {
        industryTermCount++;
      }
    });
    
    if (industryTermCount >= this.config.complexityThresholds.industryTermCount.high) {
      complexityScore += 2;
    } else if (industryTermCount >= this.config.complexityThresholds.industryTermCount.medium) {
      complexityScore += 1;
    }
    
    // 3. Score based on technical terminology
    let technicalTermCount = 0;
    this.config.technicalTerms.forEach(term => {
      const regex = new RegExp(`\\b${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(queryContent)) {
        technicalTermCount++;
      }
    });
    
    if (technicalTermCount >= this.config.complexityThresholds.technicalTermCount.high) {
      complexityScore += 2;
    } else if (technicalTermCount >= this.config.complexityThresholds.technicalTermCount.medium) {
      complexityScore += 1;
    }
    
    // Convert final score to complexity level
    if (complexityScore >= 4) {
      return 'high';
    } else if (complexityScore >= 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Select the appropriate model based on task type, query complexity, and data availability
   * @param taskType - The type of task being performed
   * @param queryContent - The content of the user's query
   * @param hasStructuredData - Whether structured data is available for this task
   * @returns The name of the model to use
   */
  selectModelForTask(
    taskType: TaskType,
    queryContent: string = '',
    hasStructuredData: boolean = false
  ): string {
    // 1. Check for task type overrides first
    if (this.config.taskTypeOverrides[taskType]) {
      return this.config.taskTypeOverrides[taskType]!;
    }
    
    // 2. If structured data is available, we can often use a less powerful model
    if (hasStructuredData) {
      // Even with structured data, some tasks still need GPT-4
      if (taskType === 'summary' || taskType === 'website_analysis') {
        return this.config.modelMapping.high;
      }
      
      // Most other tasks can use GPT-3.5 when structured data is available
      return this.config.modelMapping.low;
    }
    
    // 3. For regular cases, detect complexity and select model accordingly
    const complexity = this.detectComplexity(queryContent, taskType);
    return this.config.modelMapping[complexity];
  }
}

// Create a singleton instance
const modelSelector = new ModelSelector();

/**
 * Selects the appropriate AI model based on task type, query content, and data availability
 * @param taskType - Type of task being performed (e.g., 'follow_up', 'website_analysis')
 * @param queryContent - The user's query text
 * @param hasStructuredData - Whether structured data is available for this task
 * @returns The name of the model to use ('gpt-3.5-turbo' or 'gpt-4')
 */
export const selectModelForTask = (
  taskType: TaskType,
  queryContent: string = '',
  hasStructuredData: boolean = false
): string => {
  return modelSelector.selectModelForTask(taskType, queryContent, hasStructuredData);
};

// Export the full service for more advanced usage
export default modelSelector; 