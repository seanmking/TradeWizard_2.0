// Simple script to run a conversation with Sarah
const dotenv = require('dotenv');
const OpenAI = require('openai');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Check if OpenAI API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in .env.local file');
  process.exit(1);
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-mock-api-key-for-testing-purposes',
});

// Define conversation stages
const STAGES = {
  INTRODUCTION: 'introduction',
  WEBSITE_ANALYSIS: 'website_analysis',
  EXPORT_EXPERIENCE: 'export_experience',
  MOTIVATION: 'motivation',
  TARGET_MARKETS: 'target_markets',
  SUMMARY: 'summary'
};

// Define the messages for the conversation
const messages = [
  {
    role: 'system',
    content: `
You are Sarah, an export readiness advisor for TradeWizard. Your role is to guide small and medium enterprises (SMEs) through the process of assessing their export readiness and helping them expand to international markets.

Be friendly, professional, and encouraging. Your goal is to gather information to assess the SME's export readiness while making them feel confident about their export journey.

When responding to users:
1. Maintain a friendly, professional tone
2. Ask clear follow-up questions to gather required information
3. Provide encouraging feedback
4. Remember details the user has shared previously

You'll be following a carefully designed 5-question assessment process to gather critical information:
1. Initial introduction - building rapport and understanding the user's position in the organization
2. Website analysis - gathering extensive business intelligence through their web presence
3. Previous export experience - determining their current capabilities and starting point
4. Export motivation - understanding their strategic objectives
5. Target markets - identifying priority regions

CURRENT CONTEXT:
You're starting a new export readiness assessment. Ask for the user's name, role, and business name.
This helps you understand whether the user is an insider (employee) or outsider (consultant), and their level of seniority.
`
  }
];

// Function to get response from OpenAI
async function getAIResponse() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: messages,
      temperature: 0.8,
      max_tokens: 1500,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return "Sorry, I encountered an error processing your request.";
  }
}

// Simulate a conversation
async function simulateConversation() {
  console.log('=== SIMULATING CONVERSATION WITH SARAH ===');
  
  // Introduction
  console.log('\n=== STAGE 1: INTRODUCTION ===');
  let aiResponse = await getAIResponse();
  console.log('Sarah: ' + aiResponse);
  
  // User response to introduction
  const userResponse1 = "Hi Sarah, my name is John Smith and I'm the CEO of Global Foods Ltd.";
  console.log('User: ' + userResponse1);
  messages.push({ role: 'assistant', content: aiResponse });
  messages.push({ role: 'user', content: userResponse1 });
  
  // Update context for website question
  messages.push({
    role: 'system',
    content: `
The user has introduced themselves as John Smith, CEO of Global Foods Ltd.
Now ask for their website URL. This is critical as it allows our system to gather business intelligence.
    `
  });
  
  // Website question
  console.log('\n=== STAGE 2: WEBSITE ANALYSIS ===');
  aiResponse = await getAIResponse();
  console.log('Sarah: ' + aiResponse);
  
  // User response with website
  const userResponse2 = "Yes, our website is https://example.com/globalfoods";
  console.log('User: ' + userResponse2);
  messages.push({ role: 'assistant', content: aiResponse });
  messages.push({ role: 'user', content: userResponse2 });
  
  // Add website analysis context
  messages.push({
    role: 'system',
    content: `
Website analysis results:
- Products: Sample Product 1, Sample Product 2
- Certifications: ISO 9001, HACCP
- Geographic presence: South Africa, Local only
- Business size: medium
- Customer segments: B2B, Local retailers
- Export readiness score: 45/100

Now ask about their previous export activities. Be encouraging regardless of their level of experience.
    `
  });
  
  // Export experience question
  console.log('\n=== STAGE 3: EXPORT EXPERIENCE ===');
  aiResponse = await getAIResponse();
  console.log('Sarah: ' + aiResponse);
  
  // User response about export experience
  const userResponse3 = "We've done some limited exporting to neighboring countries in Africa, but nothing major or formal yet. We've had some inquiries from European retailers but weren't sure how to proceed.";
  console.log('User: ' + userResponse3);
  messages.push({ role: 'assistant', content: aiResponse });
  messages.push({ role: 'user', content: userResponse3 });
  
  // Update context for motivation question
  messages.push({
    role: 'system',
    content: `
The user has limited export experience, only to neighboring African countries. They've received inquiries from European retailers but weren't sure how to proceed.

Now ask about their primary motivation for exploring export opportunities. This helps understand their strategic objectives.
    `
  });
  
  // Motivation question
  console.log('\n=== STAGE 4: MOTIVATION ===');
  aiResponse = await getAIResponse();
  console.log('Sarah: ' + aiResponse);
  
  // User response about motivation
  const userResponse4 = "We're looking to expand our market reach and increase revenue. Our local market is becoming saturated, and we believe our high-quality food products would be well-received internationally. We've also seen our competitors starting to export successfully.";
  console.log('User: ' + userResponse4);
  messages.push({ role: 'assistant', content: aiResponse });
  messages.push({ role: 'user', content: userResponse4 });
  
  // Update context for target markets
  messages.push({
    role: 'system',
    content: `
The user's motivation is market expansion and revenue growth due to local market saturation. They believe their products would be well-received internationally and see competitors succeeding in exports.

Now ask about markets of particular interest to them. Note that TradeWizard currently specializes in UAE, USA, and UK markets.
    `
  });
  
  // Target markets question
  console.log('\n=== STAGE 5: TARGET MARKETS ===');
  aiResponse = await getAIResponse();
  console.log('Sarah: ' + aiResponse);
  
  // User response about target markets
  const userResponse5 = "We're primarily interested in the UAE and UK markets. We've heard there's strong demand for our type of products in Dubai, and we have some connections in London who might help us get started.";
  console.log('User: ' + userResponse5);
  messages.push({ role: 'assistant', content: aiResponse });
  messages.push({ role: 'user', content: userResponse5 });
  
  // Update context for summary
  messages.push({
    role: 'system',
    content: `
The user is interested in UAE and UK markets, which are both supported by TradeWizard. They have some connections in London.

Provide a comprehensive summary of what you've learned about Global Foods Ltd and their export readiness. 

Include:
1. Business Profile:
   - Core products/services: Processed foods, Specialty sauces, Organic ingredients
   - Current business size: Medium (50-100 employees)
   - Geographic presence: South Africa, Limited presence in neighboring African countries
   - Certifications: ISO 9001, HACCP

2. Export Experience:
   - Previous activities: Limited exporting to neighboring countries in Africa, with some inquiries from European retailers.

3. Export Motivation:
   - Primary driver: Market expansion and revenue growth due to local market saturation.

4. Target Markets:
   - Markets of interest: UAE, UK
   - Supported markets mentioned: UAE, UK (Both are currently supported by TradeWizard)

5. Export Readiness Assessment:
   - Initial export readiness score: 45/100
   - Key strengths: [Identify 2-3 key strengths based on the above information]
   - Development areas: [Identify 2-3 key development areas]

6. Next Steps:
   - Explain that you'll now prepare their detailed export readiness assessment
   - Recommend they explore TradeWizard's market intelligence for the UAE and UK food sectors
   - Suggest they review compliance requirements for their specific products

Be encouraging and positive, emphasizing that TradeWizard will guide them through their export journey regardless of their current readiness level.
    `
  });
  
  // Summary
  console.log('\n=== STAGE 6: SUMMARY ===');
  aiResponse = await getAIResponse();
  console.log('Sarah: ' + aiResponse);
  
  // Save the summary response to a file for better inspection
  fs.writeFileSync('summary-response.txt', aiResponse, 'utf8');
  console.log('\nSummary response saved to summary-response.txt');

  console.log('\n=== CONVERSATION SIMULATION COMPLETE ===');
}

// Run the conversation
simulateConversation()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err)); 