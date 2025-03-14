/**
 * Model Selector Service
 * 
 * This service determines which AI model to use based on the task type,
 * the complexity of the query, and whether structured data is available.
 */

import { TaskType, TaskComplexity } from './types';
import { ModelSelectionConfig, defaultModelConfig } from './config/model-config';

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
   */
  getConfig(): ModelSelectionConfig {
    return { ...this.config };
  }

  /**
   * Detect the complexity of a query based on multiple factors
   * Simplified to favor lower complexity assessments unless clear indicators of high complexity
   * @param queryContent - The content of the user's query
   * @param taskType - The type of task being performed
   * @returns The complexity level of the query
   */
  detectComplexity(
    queryContent: string,
    taskType: TaskType
  ): TaskComplexity {
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
    
    // For other tasks, use a simplified scoring system
    // that defaults to lower complexity unless clear indicators exist
    
    // Score based on query length (main factor)
    const queryLength = queryContent.length;
    if (queryLength >= this.config.complexityThresholds.queryLength.high) {
      return 'high';
    }
    
    // Count industry and technical terms
    const industryTermCount = this.countTermsInQuery(
      queryContent, 
      this.config.industryTerms
    );
    
    const technicalTermCount = this.countTermsInQuery(
      queryContent, 
      this.config.technicalTerms
    );
    
    // Only consider high complexity if both term thresholds are met
    if (
      industryTermCount >= this.config.complexityThresholds.industryTermCount.high &&
      technicalTermCount >= this.config.complexityThresholds.technicalTermCount.high
    ) {
      return 'high';
    }
    
    // Default to medium complexity for queries with moderate length or some technical terms
    if (
      queryLength >= this.config.complexityThresholds.queryLength.medium ||
      industryTermCount >= this.config.complexityThresholds.industryTermCount.medium ||
      technicalTermCount >= this.config.complexityThresholds.technicalTermCount.medium
    ) {
      return 'medium';
    }
    
    // Default to low complexity for all other cases
    return 'low';
  }

  /**
   * Helper method to efficiently count terms in a query
   * Optimized for performance with long queries
   */
  private countTermsInQuery(query: string, terms: string[]): number {
    const lowerQuery = query.toLowerCase();
    let count = 0;
    
    // Create a set of words from the query for more efficient matching
    const queryWords = new Set(
      lowerQuery
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ') // Replace punctuation with spaces
        .split(/\s+/) // Split by whitespace
        .filter(word => word.length > 0) // Remove empty strings
    );
    
    // Count terms that appear as whole words
    for (const term of terms) {
      // For multi-word terms
      if (term.includes(' ')) {
        if (lowerQuery.includes(term.toLowerCase())) {
          count++;
        }
      } 
      // For single-word terms
      else if (queryWords.has(term.toLowerCase())) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Select the appropriate model based on task type, query complexity, and data availability
   * Simplified to favor GPT-3.5 for most scenarios
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
    
    // 2. If structured data is available, always use GPT-3.5
    if (hasStructuredData) {
      return this.config.modelMapping.low;
    }
    
    // 3. For regular cases, detect complexity and select model accordingly
    const complexity = this.detectComplexity(queryContent, taskType);
    return this.config.modelMapping[complexity];
  }
}

// Create singleton instance
const modelSelector = new ModelSelector();

// Export the instance as default
export default modelSelector;

// Also export a standalone function for convenience
export const selectModelForTask = (
  taskType: TaskType,
  queryContent: string = '',
  hasStructuredData: boolean = false
): string => {
  return modelSelector.selectModelForTask(taskType, queryContent, hasStructuredData);
}; 