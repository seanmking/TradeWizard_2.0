import ComplianceMCPService from '../src/services/compliance-mcp.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Compliance MCP Service', () => {
  let complianceMCP: ComplianceMCPService;

  beforeEach(() => {
    complianceMCP = new ComplianceMCPService();
  });

  const testProducts = [
    {
      name: 'Organic Rooibos Tea',
      hsCode: '0902',
      industrySector: 'Beverages',
      potentialMarkets: ['UAE', 'UK']
    },
    {
      name: 'Handcrafted Leather Weekender Bag',
      industrySector: 'Accessories',
      potentialMarkets: ['USA', 'EU']
    }
  ];

  testProducts.forEach(product => {
    it(`should fetch compliance requirements for ${product.name}`, async () => {
      // Mock WITS API response
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('wits')) {
          return Promise.resolve({
            data: {
              certifications: ['Export Certificate'],
              tariffs: ['5% Import Duty'],
              restrictions: [],
              documentRequirements: ['Certificate of Origin']
            }
          });
        }
        // Mock ITAC API response
        return Promise.resolve({
          data: {
            certifications: ['SABS Approval'],
            tariffs: [],
            restrictions: ['Packaging Regulations'],
            documentRequirements: ['Export Permit']
          }
        });
      });

      const complianceRequirements = await complianceMCP.getComplianceRequirements(product);

      // Validation checks
      expect(complianceRequirements).toBeDefined();
      expect(complianceRequirements.certifications).toBeInstanceOf(Array);
      expect(complianceRequirements.tariffs).toBeInstanceOf(Array);
      expect(complianceRequirements.restrictions).toBeInstanceOf(Array);
      expect(complianceRequirements.documentRequirements).toBeInstanceOf(Array);
    });
  });

  it('should derive HS Code for products without explicit code', async () => {
    const productWithoutHSCode = {
      name: 'Premium Coffee Beans',
      industrySector: 'Beverages'
    };

    // Mock API responses
    mockedAxios.get.mockResolvedValue({
      data: {
        certifications: ['Quality Certificate'],
        tariffs: ['10% Import Duty'],
        restrictions: [],
        documentRequirements: ['Phytosanitary Certificate']
      }
    });

    const complianceRequirements = await complianceMCP.getComplianceRequirements(productWithoutHSCode);

    expect(complianceRequirements).toBeDefined();
  });

  it('should manage compliance cache', async () => {
    // Clear cache
    const clearedItems = await complianceMCP.clearComplianceCache();
    expect(clearedItems).toBeDefined();

    // Get cache stats
    const stats = await complianceMCP.getComplianceCacheStats();
    expect(stats).toHaveProperty('totalCachedItems');
    expect(stats).toHaveProperty('cacheSize');
  });
});
