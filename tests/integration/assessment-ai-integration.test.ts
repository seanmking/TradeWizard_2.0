import { processUserResponse, type AssessmentData } from '../../app/lib/services/assessmentService';
import { openAIService } from '../../app/lib/services/ai/openai-service';
import { ASSESSMENT_STAGES } from '../../app/lib/services/ai';

describe('Assessment Service Integration Tests', () => {
  let sessionId: string;
  let currentData: Partial<AssessmentData>;

  beforeEach(() => {
    sessionId = 'test-session-123';
    currentData = {};
  });

  test('Introduction stage with AI integration', async () => {
    const userInput = "Hi, I'm John Smith, CEO of Tech Exports Ltd";
    const stage = ASSESSMENT_STAGES.INTRODUCTION;

    const result = await processUserResponse(userInput, sessionId, stage, currentData);

    expect(result.extractedData).toHaveProperty('first_name', 'John');
    expect(result.extractedData).toHaveProperty('last_name', 'Smith');
    expect(result.extractedData).toHaveProperty('business_name', 'Tech Exports Ltd');
    expect(result.response).toBeTruthy();
    expect(result.nextStage).toBe(ASSESSMENT_STAGES.WEBSITE_ANALYSIS);
  });

  test('Website analysis with AI integration', async () => {
    const userInput = "https://example-tech-exports.com";
    const stage = ASSESSMENT_STAGES.WEBSITE_ANALYSIS;
    currentData = {
      first_name: 'John',
      business_name: 'Tech Exports Ltd'
    };

    const result = await processUserResponse(userInput, sessionId, stage, currentData);

    expect(result.extractedData).toHaveProperty('website_url');
    expect(result.extractedData).toHaveProperty('productCategories');
    expect(result.response).toBeTruthy();
    expect(result.nextStage).toBe(ASSESSMENT_STAGES.EXPORT_EXPERIENCE);
  });

  test('Export experience with AI analysis', async () => {
    const userInput = "We've been exporting electronics to Europe for 2 years";
    const stage = ASSESSMENT_STAGES.EXPORT_EXPERIENCE;
    currentData = {
      first_name: 'John',
      business_name: 'Tech Exports Ltd',
      website_url: 'https://example-tech-exports.com'
    };

    const result = await processUserResponse(userInput, sessionId, stage, currentData);

    expect(result.extractedData).toHaveProperty('export_experience');
    expect(result.response).toBeTruthy();
    expect(result.nextStage).toBe(ASSESSMENT_STAGES.MOTIVATION);
  });

  test('Target markets with MCP integration', async () => {
    const userInput = "Yes, I'm interested in UAE and USA markets";
    const stage = ASSESSMENT_STAGES.TARGET_MARKETS;
    currentData = {
      first_name: 'John',
      business_name: 'Tech Exports Ltd',
      website_url: 'https://example-tech-exports.com',
      export_experience: "2 years in Europe",
      export_motivation: "Market expansion"
    };

    const result = await processUserResponse(userInput, sessionId, stage, currentData);

    expect(result.extractedData).toHaveProperty('target_markets');
    expect(result.response).toBeTruthy();
    expect(result.nextStage).toBe(ASSESSMENT_STAGES.SUMMARY);
  });

  test('Summary generation with AI and MCP data', async () => {
    const stage = ASSESSMENT_STAGES.SUMMARY;
    currentData = {
      first_name: 'John',
      last_name: 'Smith',
      business_name: 'Tech Exports Ltd',
      website_url: 'https://example-tech-exports.com',
      export_experience: "2 years in Europe",
      export_motivation: "Market expansion",
      target_markets: "UAE, USA",
      productCategories: ['Electronics', 'Software'],
      websiteExportReadiness: 0.8
    };

    const result = await processUserResponse("Ready for summary", sessionId, stage, currentData);

    expect(result.response).toBeTruthy();
    expect(result.response).toContain('Tech Exports Ltd');
    expect(result.isComplete).toBe(true);
  });
}); 