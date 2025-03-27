export const mcpService = {
  getMarketRequirements: jest.fn().mockResolvedValue({
    requirements: ['Requirement 1', 'Requirement 2'],
    certifications: ['Cert 1', 'Cert 2']
  }),
  getMarketOpportunities: jest.fn().mockResolvedValue({
    opportunities: ['Opportunity 1', 'Opportunity 2'],
    marketSize: 1000000
  })
}; 