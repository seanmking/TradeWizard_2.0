/**
 * Tests for the Model Selector Service
 */

import modelSelector, { selectModelForTask, TaskType } from './model-selector';
import { defaultModelConfig } from '../config/model-config';

describe('Model Selector Service', () => {
  // Reset configuration before each test
  beforeEach(() => {
    modelSelector.updateConfig(defaultModelConfig);
  });

  describe('selectModelForTask function', () => {
    test('should use GPT-3.5 for simple queries', () => {
      const result = selectModelForTask(
        'initial_assessment' as TaskType, 
        'Tell me about export readiness',
        false
      );
      expect(result).toBe('gpt-3.5-turbo');
    });

    test('should use GPT-4 for complex queries with many industry terms', () => {
      const result = selectModelForTask(
        'export_experience' as TaskType, 
        'We need to understand the tariff implications for our electronics products in the EU market. We currently have certificates of origin for SADC but need guidance on regulatory compliance for CE marking and WEEE directives.',
        false
      );
      expect(result).toBe('gpt-4');
    });

    test('should use GPT-4 for website analysis regardless of query complexity', () => {
      const result = selectModelForTask(
        'website_analysis' as TaskType, 
        'Analyze this website',
        false
      );
      expect(result).toBe('gpt-4');
    });

    test('should use GPT-4 for summary regardless of query complexity', () => {
      const result = selectModelForTask(
        'summary' as TaskType, 
        'Give me a brief summary',
        false
      );
      expect(result).toBe('gpt-4');
    });

    test('should use GPT-3.5 for follow-up questions', () => {
      const result = selectModelForTask(
        'follow_up' as TaskType, 
        'Can you explain that in more detail?',
        false
      );
      expect(result).toBe('gpt-3.5-turbo');
    });
  });

  describe('task complexity detection', () => {
    test('should detect low complexity for short, simple queries', () => {
      const complexity = modelSelector.detectComplexity(
        'What is export readiness?',
        'faq' as TaskType
      );
      expect(complexity).toBe('low');
    });

    test('should detect medium complexity for queries with some industry terms', () => {
      const complexity = modelSelector.detectComplexity(
        'What documents do I need for customs clearance?',
        'initial_assessment' as TaskType
      );
      expect(complexity).toBe('medium');
    });

    test('should detect high complexity for queries with technical content', () => {
      const complexity = modelSelector.detectComplexity(
        'We are looking at comparative advantage analysis for our manufacturing sector with a focus on intellectual property protection in Asian markets and regulatory compliance frameworks.',
        'export_motivation' as TaskType
      );
      expect(complexity).toBe('high');
    });

    test('should always detect high complexity for website analysis', () => {
      const complexity = modelSelector.detectComplexity(
        'Check my website',
        'website_analysis' as TaskType
      );
      expect(complexity).toBe('high');
    });
  });

  describe('structured data handling', () => {
    test('should downgrade to GPT-3.5 for initial assessment with structured data', () => {
      const result = selectModelForTask(
        'initial_assessment' as TaskType,
        'Tell me about my export readiness',
        true // has structured data
      );
      expect(result).toBe('gpt-3.5-turbo');
    });

    test('should still use GPT-4 for summary even with structured data', () => {
      const result = selectModelForTask(
        'summary' as TaskType,
        'Summarize my assessment results',
        true // has structured data
      );
      expect(result).toBe('gpt-4');
    });

    test('should downgrade complex export experience query when structured data is available', () => {
      const complexQuery = 'We need detailed analysis of our export experience in relation to regulatory compliance and market access barriers across multiple jurisdictions.';
      
      // Without structured data should use GPT-4
      const withoutStructuredData = selectModelForTask(
        'export_experience' as TaskType,
        complexQuery,
        false
      );
      expect(withoutStructuredData).toBe('gpt-4');
      
      // With structured data should use GPT-3.5
      const withStructuredData = selectModelForTask(
        'export_experience' as TaskType,
        complexQuery,
        true
      );
      expect(withStructuredData).toBe('gpt-3.5-turbo');
    });
  });

  describe('configuration updates', () => {
    test('should allow updating complexity thresholds', () => {
      // Start with default config
      const originalResult = selectModelForTask(
        'export_motivation' as TaskType,
        'We want to expand to international markets.',
        false
      );
      expect(originalResult).toBe('gpt-3.5-turbo'); // Should be low complexity
      
      // Update to more aggressive thresholds
      modelSelector.updateConfig({
        complexityThresholds: {
          ...defaultModelConfig.complexityThresholds,
          queryLength: {
            medium: 200,  // Higher threshold
            high: 500     // Higher threshold
          }
        }
      });
      
      // Test with a medium-length complex query
      const updatedResult = selectModelForTask(
        'export_motivation' as TaskType,
        'We want to expand to international markets because we believe our product has global appeal. We want to understand tariff implications and market entry strategies.',
        false
      );
      
      // This would be medium complexity with default settings but should be low with updated settings
      expect(updatedResult).toBe('gpt-3.5-turbo');
    });

    test('should allow changing model mappings', () => {
      // Update model mapping to test model overrides
      modelSelector.updateConfig({
        modelMapping: {
          high: 'gpt-4',
          medium: 'gpt-4', // Change medium to use GPT-4 instead of GPT-3.5
          low: 'gpt-3.5-turbo'
        }
      });
      
      // Medium complexity query
      const result = selectModelForTask(
        'export_motivation' as TaskType,
        'We are looking to expand to European markets next year.',
        false
      );
      
      // Should use GPT-4 now because we changed medium complexity to use it
      expect(result).toBe('gpt-4');
    });

    test('should allow adding task type overrides', () => {
      // Add a task type override
      modelSelector.updateConfig({
        taskTypeOverrides: {
          ...defaultModelConfig.taskTypeOverrides,
          'export_motivation': 'gpt-4' // Always use GPT-4 for export motivation
        }
      });
      
      // Simple export motivation query that would normally use GPT-3.5
      const result = selectModelForTask(
        'export_motivation' as TaskType,
        'Why do we want to export?',
        false
      );
      
      // Should use GPT-4 due to the override
      expect(result).toBe('gpt-4');
    });
  });
}); 