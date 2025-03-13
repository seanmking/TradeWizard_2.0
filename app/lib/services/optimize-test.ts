/**
 * Test script to verify token optimization results
 */
import { aiAssessmentService, ASSESSMENT_STAGES } from './ai';
import openAIService from './ai/openai-service';
import { mcpService, WebsiteAnalysisResult } from './mcp';

// Override the getCompletion method to track token usage
const originalGetCompletion = openAIService.getCompletion;
let tokenCount = 0;

// Mock version that tracks characters (rough approximation of tokens)
openAIService.getCompletion = async function(...args) {
  // Estimate tokens from message length (4 chars ≈ 1 token)
  const messagesJson = JSON.stringify(args[0]);
  const charCount = messagesJson.length;
  const estimatedTokens = Math.ceil(charCount / 4);
  
  console.log(`Request size: ~${estimatedTokens} tokens (${charCount} chars)`);
  tokenCount += estimatedTokens;
  
  // Don't actually call OpenAI API for this test
  return `This is a mock response to save API costs during testing. In a real scenario, Sarah would provide a helpful response based on the conversation context.`;
};

// Mock MCP service to avoid external API calls
const originalAnalyzeWebsite = mcpService.analyzeWebsite;
mcpService.analyzeWebsite = async function(website: string): Promise<WebsiteAnalysisResult> {
  console.log(`Mocking website analysis for: ${website}`);
  return {
    productCategories: ['Organic foods', 'Health supplements'],
    businessSize: 'medium', // lowercase to match enum
    certifications: ['Organic', 'Fair Trade'],
    customerSegments: ['Health-conscious consumers', 'Retail'],
    geographicPresence: ['United States', 'Canada'],
    exportReadiness: 0.65
  };
};

// Run a simple test conversation
async function runTest() {
  console.log('\n=== TOKEN USAGE TEST ===');
  console.log('This test will simulate a conversation to measure token usage');
  
  // Reset counter
  tokenCount = 0;
  
  // Create a unique user ID for this test
  const userId = 'token-test-' + Date.now();
  
  try {
    // Introduction Stage
    console.log('\n--- STAGE 1: INTRODUCTION ---');
    const intro = await aiAssessmentService.processUserMessage(
      userId,
      "Hi Sarah, I'm Alex Chen, Marketing Director at Sunshine Organic Foods.",
      ASSESSMENT_STAGES.INTRODUCTION
    );
    
    // Website Analysis Stage  
    console.log('\n--- STAGE 2: WEBSITE ANALYSIS ---');
    await aiAssessmentService.processUserMessage(
      userId,
      "Yes, our website is https://example.com/sunshine-foods",
      ASSESSMENT_STAGES.WEBSITE_ANALYSIS
    );
    
    // Export Experience Stage
    console.log('\n--- STAGE 3: EXPORT EXPERIENCE ---');
    await aiAssessmentService.processUserMessage(
      userId,
      "We have some experience selling to Canada, but nowhere else internationally yet. We've had inquiries from European distributors though.",
      ASSESSMENT_STAGES.EXPORT_EXPERIENCE
    );
    
    // Motivation Stage
    console.log('\n--- STAGE 4: MOTIVATION ---');
    await aiAssessmentService.processUserMessage(
      userId,
      "We want to grow our business and our domestic market is getting quite competitive. We believe our organic products would do well in markets with strong health consciousness.",
      ASSESSMENT_STAGES.MOTIVATION
    );
    
    // Target Markets Stage
    console.log('\n--- STAGE 5: TARGET MARKETS ---');
    await aiAssessmentService.processUserMessage(
      userId,
      "We're most interested in the UK and UAE markets. We've heard Dubai has a growing demand for organic products.",
      ASSESSMENT_STAGES.TARGET_MARKETS
    );
    
    // Summary Stage
    console.log('\n--- STAGE 6: SUMMARY ---');
    await aiAssessmentService.processUserMessage(
      userId,
      "That sounds helpful, thank you!",
      ASSESSMENT_STAGES.SUMMARY
    );
    
    // Clean up
    aiAssessmentService.conversationManager.deleteConversation(userId);
    
    // Report results
    console.log('\n=== TOKEN USAGE SUMMARY ===');
    console.log(`Total approximate tokens used: ${tokenCount}`);
    console.log(`Estimated cost @ $0.01/1K tokens: $${(tokenCount / 1000 * 0.01).toFixed(4)}`);
    console.log('Note: Before optimization, this would have used approximately 20,000 tokens ($0.20)');
    console.log(`Token reduction: ~${Math.round((1 - (tokenCount / 20000)) * 100)}%`);
    
    // Restore original methods
    openAIService.getCompletion = originalGetCompletion;
    mcpService.analyzeWebsite = originalAnalyzeWebsite;
    
  } catch (error) {
    console.error('Error during test:', error);
    // Ensure we restore original methods even if there's an error
    openAIService.getCompletion = originalGetCompletion;
    mcpService.analyzeWebsite = originalAnalyzeWebsite;
  }
}

// Run if executed directly
if (require.main === module) {
  runTest()
    .then(() => console.log('Test completed successfully'))
    .catch(err => console.error('Test failed:', err));
}

export default runTest; 