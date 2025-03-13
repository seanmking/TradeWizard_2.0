/**
 * Type definitions for AI service components
 */

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