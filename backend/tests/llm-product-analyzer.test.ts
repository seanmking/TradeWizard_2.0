import LLMProductAnalyzerService from '../src/services/llm-product-analyzer.service';

describe('LLM Product Analyzer Service', () => {
  const llmAnalyzer = new LLMProductAnalyzerService();

  const testProducts = [
    {
      name: 'Organic Rooibos Tea',
      description: 'Premium South African herbal tea, sustainably sourced from local farms',
      website: 'https://example-tea-company.co.za',
      categories: ['Beverages', 'Herbal Tea']
    },
    {
      name: 'Leather Travel Bag',
      description: 'Handcrafted genuine leather weekender bag with multiple compartments',
      website: 'https://example-leather-goods.co.za',
      categories: ['Accessories', 'Travel Gear']
    }
  ];

  testProducts.forEach(product => {
    it(`should classify ${product.name} correctly`, async () => {
      const classification = await llmAnalyzer.classifyProduct(product);

      // Validation checks
      expect(classification).toBeDefined();
      expect(classification.hsCode).toBeTruthy();
      expect(classification.industrySector).toBeTruthy();
      expect(classification.industrySubsector).toBeTruthy();
      expect(['Low', 'Medium', 'High']).toContain(classification.exportPotential);
      expect(classification.potentialMarkets).toBeInstanceOf(Array);
      expect(classification.complianceRequirements).toBeInstanceOf(Array);
    });
  });
});
