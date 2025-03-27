import { openAIService } from '../../app/lib/services/ai/openai-service';
import { mcpService } from '../../app/lib/services/mcp';
import { processUserResponse } from '../../app/lib/services/assessmentService';

describe('Core System Integration Tests', () => {
  const sessionId = 'test-session-123';

  test('AI Service Integration', async () => {
    const response = await openAIService.getCompletion(
      [{ role: 'user', content: 'Test message' }],
      { model: 'gpt-3.5-turbo' },
      'initial_assessment'
    );
    expect(response).toBeTruthy();
  });

  test('MCP Service Integration', async () => {
    const requirements = await mcpService.checkCompliance(
      'Electronics',
      'UAE'
    );
    expect(requirements).toBeTruthy();
    expect(requirements.requiredCertifications).toBeDefined();
    expect(requirements.importDuties).toBeDefined();
  });

  test('Basic Assessment Flow', async () => {
    // Test introduction stage
    const introResult = await processUserResponse(
      "I'm John from Tech Exports",
      sessionId,
      'introduction',
      {}
    );
    expect(introResult.response).toBeTruthy();
    expect(introResult.nextStage).toBeDefined();

    // Test export experience stage
    const experienceResult = await processUserResponse(
      "We've been exporting for 2 years",
      sessionId,
      'export_experience',
      { first_name: 'John', business_name: 'Tech Exports' }
    );
    expect(experienceResult.response).toBeTruthy();
    expect(experienceResult.extractedData.export_experience).toBeDefined();
  });

  test('Market Analysis Integration', async () => {
    const opportunities = await mcpService.analyzeMarket(
      'Electronics',
      'UAE'
    );
    expect(opportunities).toBeTruthy();
    expect(opportunities.marketSize).toBeDefined();
    expect(opportunities.growth).toBeDefined();
  });
}); 