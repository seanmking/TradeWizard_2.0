/**
 * Test Script for Simplified AI Model Selection
 * 
 * This script demonstrates the updated model selection functionality that defaults to
 * GPT-3.5-Turbo for most tasks and only uses GPT-4 when absolutely necessary.
 */

import modelSelector, { selectModelForTask } from './model-selector';
import { TaskType } from './types';

// Test function to simulate model selection
function testModelSelection(
  taskType: TaskType, 
  userQuery: string, 
  hasStructuredData: boolean = false
): void {
  // Detect the complexity
  const complexity = modelSelector.detectComplexity(userQuery, taskType);
  
  // Get the selected model
  const model = selectModelForTask(taskType, userQuery, hasStructuredData);
  
  console.log(`
Test Case:
  Task Type: ${taskType}
  User Query: "${userQuery.substring(0, 40)}${userQuery.length > 40 ? '...' : ''}"
  Has Structured Data: ${hasStructuredData}
  
Result:
  Detected Complexity: ${complexity}
  Selected Model: ${model}
  `);
}

// Usage examples showing different scenarios
console.log("============ SIMPLIFIED MODEL SELECTION TEST ============");
console.log("Most tasks should now default to GPT-3.5-Turbo\n");

// Simple queries - should use GPT-3.5-Turbo
console.log("SIMPLE QUERIES - Should all use GPT-3.5-Turbo");
testModelSelection('initial_assessment', 'Hi, my name is John.', false);
testModelSelection('follow_up', 'Can you explain that again?', false);
testModelSelection('clarification', 'What do you mean by export readiness?', false);

// Medium complexity queries - should mostly use GPT-3.5-Turbo
console.log("\nMEDIUM COMPLEXITY QUERIES - Should mostly use GPT-3.5-Turbo");
testModelSelection('export_experience', 'We have been exporting to the UAE for about 2 years now, but we\'re facing some challenges with customs regulations and distributor relationships.', false);
testModelSelection('target_markets', 'We are considering the USA, UAE, and UK markets for our manufacturing products. We need to understand tariff implications.', false);

// High complexity queries - website_analysis and summary should use GPT-4
console.log("\nHIGH COMPLEXITY QUERIES - Only specific types should use GPT-4");
testModelSelection('website_analysis', 'https://example.com', false); // Should use GPT-4 due to task type
testModelSelection('summary', 'Please summarize our export readiness assessment.', false); // Should use GPT-4 due to task type

// Very complex query but not in override list - should detect high complexity
console.log("\nVERY COMPLEX QUERY - Should detect high complexity and use GPT-4");
testModelSelection('export_motivation', 'Our primary motivation for expanding internationally is to diversify our revenue streams in response to domestic market saturation. We are also concerned about economic volatility in South Africa and want to establish a more resilient business model by operating across multiple regulatory environments. Additionally, we have noticed increasing demand for our specialized manufacturing solutions in Middle Eastern markets, particularly from sustainable construction projects in the UAE. We need to understand harmonized system classifications, certificate of origin requirements, trade barriers, and customs clearance procedures for these target markets.', false);

// With structured data - should always use GPT-3.5-Turbo
console.log("\n============ WITH STRUCTURED DATA ============");
console.log("All queries with structured data should use GPT-3.5-Turbo");
testModelSelection('website_analysis', 'https://example.com', true); // Should now use GPT-3.5 with structured data
testModelSelection('summary', 'Please summarize our export readiness assessment.', true); // Should now use GPT-3.5 with structured data
testModelSelection('export_experience', 'We have been exporting to the UAE for about 2 years now.', true);

console.log("\n============ TEST COMPLETE ============");
console.log("The updated model selection logic now favors GPT-3.5-Turbo for most tasks,");
console.log("using GPT-4 only for the most complex tasks or specific task types."); 