/**
 * Test Script for Hybrid AI Model Selection
 * 
 * This script demonstrates the model selection functionality by simulating different types of queries
 * and showing which model would be selected in each case.
 */

import openAIService, { TaskType } from './openai-service';

// Test function to simulate model selection
function testModelSelection(
  taskType: TaskType, 
  userQuery: string, 
  hasStructuredData: boolean = false
): void {
  // Detect the complexity
  const complexity = openAIService.detectComplexity(userQuery, taskType);
  
  // Get the selected model
  const model = openAIService.selectModelForTask(taskType, userQuery, hasStructuredData);
  
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

// Usage examples showing different complexity levels
console.log("============ HYBRID MODEL SELECTION TEST ============");

// Simple queries - should mostly use GPT-3.5-Turbo
testModelSelection('initial_assessment', 'Hi, my name is John.', false);
testModelSelection('follow_up', 'Can you explain that again?', false);
testModelSelection('clarification', 'What do you mean by export readiness?', false);

// Medium complexity queries - mix of models
testModelSelection('export_experience', 'We have been exporting to the UAE for about 2 years now, but we\'re facing some challenges with customs regulations and distributor relationships.', false);
testModelSelection('target_markets', 'We are considering the USA, UAE, and UK markets for our manufacturing products. We need to understand tariff implications.', false);

// High complexity queries - should use GPT-4-Turbo
testModelSelection('website_analysis', 'https://example.com', false); // Always high complexity due to task type
testModelSelection('summary', 'Please summarize our export readiness assessment.', false); // Always high complexity due to task type
testModelSelection('export_motivation', 'Our primary motivation for expanding internationally is to diversify our revenue streams in response to domestic market saturation. We are also concerned about economic volatility in South Africa and want to establish a more resilient business model by operating across multiple regulatory environments. Additionally, we have noticed increasing demand for our specialized manufacturing solutions in Middle Eastern markets, particularly from sustainable construction projects in the UAE.', false);

// With structured data - should mostly downgrade to GPT-3.5-Turbo
console.log("\n============ WITH STRUCTURED DATA ============");
testModelSelection('website_analysis', 'https://example.com', true);
testModelSelection('initial_assessment', 'Tell me about my export readiness', true);
testModelSelection('export_experience', 'We have been exporting to the UAE for about 2 years now.', true);

// But summary should remain on GPT-4 even with structured data
testModelSelection('summary', 'Please summarize our export readiness assessment.', true);

console.log("\n============ CUSTOMIZED THRESHOLDS ============");
// Demonstrate configurability
const originalConfig = openAIService.getConfig();

// Update config to be more aggressive about using the cheaper model
openAIService.updateConfig({
  complexityThresholds: {
    queryLength: {
      medium: 200, // Higher threshold means fewer medium complexity assessments
      high: 500    // Higher threshold means fewer high complexity assessments
    },
    industryTermCount: {
      medium: 4,   // More industry terms needed for medium complexity
      high: 8      // More industry terms needed for high complexity
    },
    crossReferenceThreshold: 4 // More cross-reference terms needed for high complexity
  }
});

// Test with the same queries but using the updated thresholds
testModelSelection('export_motivation', 'Our primary motivation for expanding internationally is to diversify our revenue streams in response to domestic market saturation.', false);

// Reset the configuration
openAIService.updateConfig(originalConfig);
console.log("Configuration reset to original values"); 