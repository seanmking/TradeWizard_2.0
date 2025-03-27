const { config } = require('dotenv');
config();

// Mock OpenAI service
jest.mock('app/lib/services/ai/openai-service', () => {
  const mockService = {
    getCompletion: jest.fn().mockResolvedValue('Mocked AI response'),
    selectModelForTask: jest.fn().mockReturnValue('gpt-3.5-turbo'),
    mapStageToTaskType: jest.fn().mockReturnValue('initial_assessment')
  };
  return {
    __esModule: true,
    default: mockService,
    openAIService: mockService
  };
});

// Mock MCP service
jest.mock('app/lib/services/mcp', () => ({
  mcpService: {
    getMarketRequirements: jest.fn().mockResolvedValue({
      requirements: ['Requirement 1', 'Requirement 2'],
      certifications: ['Cert 1', 'Cert 2']
    }),
    getMarketOpportunities: jest.fn().mockResolvedValue({
      opportunities: ['Opportunity 1', 'Opportunity 2'],
      marketSize: 1000000
    })
  }
}));

// Mock fetch for website analysis
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tech Exports Ltd - Electronics and Software</title>
        </head>
        <body>
          <div class="product-catalog">
            <div class="product">
              <h2>Advanced Electronics</h2>
              <p>High-quality electronic components for export</p>
            </div>
            <div class="product">
              <h2>Enterprise Software</h2>
              <p>Custom software solutions for businesses</p>
            </div>
          </div>
          <div class="certifications">
            <p>ISO 9001:2015 Certified</p>
            <p>CE Mark Approved</p>
          </div>
        </body>
      </html>
    `)
  })
);

// Mock Redis cache
jest.mock('app/lib/services/ai/utils/redis-cache', () => ({
  RedisCacheService: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    flush: jest.fn()
  }))
}));

beforeEach(() => {
  jest.clearAllMocks();
}); 