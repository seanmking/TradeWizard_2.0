/**
 * Test file to simulate a conversation with Sarah
 */
import { aiAssessmentService, ASSESSMENT_STAGES } from './ai';
import openAIService from './ai/openai-service';

// Override the getCompletion method to track token usage
const originalGetCompletion = openAIService.getCompletion;
let totalTokensUsed = 0;

// Override with tracking function
openAIService.getCompletion = async function(...args) {
  console.log(`Sending request with ${JSON.stringify(args[0]).length} characters`);
  const result = await originalGetCompletion.apply(this, args);
  // Estimate token usage (approximation)
  const approxTokens = Math.ceil(JSON.stringify(args[0]).length / 4);
  totalTokensUsed += approxTokens;
  console.log(`~${approxTokens} tokens used for this request (approximate)`);
  return result;
};

async function simulateConversation() {
  console.log('=== SIMULATING CONVERSATION WITH SARAH ===');
  totalTokensUsed = 0;
  
  // Create a unique user ID for this test
  const userId = 'test-user-' + Date.now();
  
  // Introduction Stage
  console.log('\n=== STAGE 1: INTRODUCTION ===');
  const intro = await aiAssessmentService.processUserMessage(
    userId,
    "Hi Sarah, my name is John Smith and I'm the CEO of Global Foods Ltd.",
    ASSESSMENT_STAGES.INTRODUCTION
  );
  console.log('Sarah: ' + intro.response);
  
  // Website Analysis Stage
  console.log('\n=== STAGE 2: WEBSITE ANALYSIS ===');
  const website = await aiAssessmentService.processUserMessage(
    userId,
    "Yes, our website is https://example.com/globalfoods",
    intro.nextStage
  );
  console.log('Sarah: ' + website.response);
  console.log('Website Analysis:', website.websiteAnalysis);
  
  // Export Experience Stage
  console.log('\n=== STAGE 3: EXPORT EXPERIENCE ===');
  const experience = await aiAssessmentService.processUserMessage(
    userId,
    "We've done some limited exporting to neighboring countries in Africa, but nothing major or formal yet. We've had some inquiries from European retailers but weren't sure how to proceed.",
    website.nextStage
  );
  console.log('Sarah: ' + experience.response);
  
  // Motivation Stage
  console.log('\n=== STAGE 4: MOTIVATION ===');
  const motivation = await aiAssessmentService.processUserMessage(
    userId,
    "We're looking to expand our market reach and increase revenue. Our local market is becoming saturated, and we believe our high-quality food products would be well-received internationally. We've also seen our competitors starting to export successfully.",
    experience.nextStage
  );
  console.log('Sarah: ' + motivation.response);
  
  // Target Markets Stage
  console.log('\n=== STAGE 5: TARGET MARKETS ===');
  const markets = await aiAssessmentService.processUserMessage(
    userId,
    "We're primarily interested in the UAE and UK markets. We've heard there's strong demand for our type of products in Dubai, and we have some connections in London who might help us get started.",
    motivation.nextStage
  );
  console.log('Sarah: ' + markets.response);
  
  // Summary Stage
  console.log('\n=== STAGE 6: SUMMARY ===');
  const summary = await aiAssessmentService.processUserMessage(
    userId,
    "That sounds good. I'm looking forward to seeing our assessment results.",
    markets.nextStage
  );
  console.log('Sarah: ' + summary.response);
  
  // Get the final conversation context
  const conversation = aiAssessmentService.conversationManager.getConversation(userId);
  const context = conversation.getContext();
  
  console.log('\n=== FINAL CONVERSATION CONTEXT ===');
  console.log(JSON.stringify(context, null, 2));
  
  // Report token usage
  console.log('\n=== TOKEN USAGE SUMMARY ===');
  console.log(`Total approximate tokens used: ${totalTokensUsed}`);
  console.log(`Estimated cost @ $0.01/1K tokens: $${(totalTokensUsed / 1000 * 0.01).toFixed(4)}`);
  
  // Clean up
  aiAssessmentService.conversationManager.deleteConversation(userId);
  
  console.log('\n=== CONVERSATION SIMULATION COMPLETE ===');
}

// Only run if this file is executed directly
if (require.main === module) {
  simulateConversation()
    .then(() => console.log('Test completed successfully'))
    .catch(err => console.error('Test failed:', err));
}

export default simulateConversation; 