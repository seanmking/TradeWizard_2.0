import axios from 'axios';
import Redis from 'ioredis';

class ComplianceMCPService {
  private redisClient: Redis;
  private static COMPLIANCE_DATABASES = {
    'wits': 'https://api.wits.org/trade-compliance',
    'itac': 'https://api.itac.gov.za/compliance'
  };

  constructor() {
    this.redisClient = new Redis(process.env.REDIS_URL);
  }

  async getComplianceRequirements(productData: ProductComplianceQuery) {
    // Check cache first
    const cacheKey = this.generateCacheKey(productData);
    const cachedResult = await this.getCachedCompliance(cacheKey);
    if (cachedResult) return cachedResult;

    // Transform product data for compliance query
    const complianceQuery = this.transformProductData(productData);

    // Fetch compliance requirements from multiple sources
    const complianceResults = await Promise.all([
      this.fetchWITSCompliance(complianceQuery),
      this.fetchITACCompliance(complianceQuery)
    ]);

    // Merge and consolidate compliance requirements
    const mergedCompliance = this.consolidateComplianceRequirements(complianceResults);

    // Cache the result
    await this.cacheCompliance(cacheKey, mergedCompliance);

    return mergedCompliance;
  }

  private transformProductData(productData: ProductComplianceQuery) {
    return {
      hsCode: productData.hsCode || this.deriveHSCode(productData),
      productName: productData.name,
      sector: productData.industrySector,
      exportMarkets: productData.potentialMarkets || []
    };
  }

  private deriveHSCode(productData: ProductComplianceQuery): string {
    // Implement logic to derive HS Code based on product details
    // This could use machine learning, rule-based system, or external mapping
    const productNameLower = productData.name.toLowerCase();

    const hsCodeMappings: { [key: string]: string } = {
      'tea': '0902',
      'coffee': '0901',
      'leather': '4203',
      'bag': '4202',
      'textile': '5209',
      'clothing': '6203'
    };

    for (const [keyword, hsCode] of Object.entries(hsCodeMappings)) {
      if (productNameLower.includes(keyword)) return hsCode;
    }

    return 'Unknown'; // Fallback
  }

  private async fetchWITSCompliance(query: any) {
    try {
      const response = await axios.get(`${ComplianceMCPService.COMPLIANCE_DATABASES.wits}/requirements`, { 
        params: query 
      });
      return response.data;
    } catch (error) {
      console.warn('WITS Compliance Fetch Error:', error);
      return null;
    }
  }

  private async fetchITACCompliance(query: any) {
    try {
      const response = await axios.get(`${ComplianceMCPService.COMPLIANCE_DATABASES.itac}/requirements`, { 
        params: query 
      });
      return response.data;
    } catch (error) {
      console.warn('ITAC Compliance Fetch Error:', error);
      return null;
    }
  }

  private consolidateComplianceRequirements(results: any[]) {
    const consolidatedRequirements = {
      certifications: [],
      tariffs: [],
      restrictions: [],
      documentRequirements: []
    };

    results.forEach(result => {
      if (result) {
        consolidatedRequirements.certifications.push(...(result.certifications || []));
        consolidatedRequirements.tariffs.push(...(result.tariffs || []));
        consolidatedRequirements.restrictions.push(...(result.restrictions || []));
        consolidatedRequirements.documentRequirements.push(...(result.documentRequirements || []));
      }
    });

    return consolidatedRequirements;
  }

  private generateCacheKey(productData: ProductComplianceQuery): string {
    return `compliance:${productData.name}:${productData.hsCode || 'unknown'}`;
  }

  private async getCachedCompliance(key: string) {
    const cachedData = await this.redisClient.get(key);
    return cachedData ? JSON.parse(cachedData) : null;
  }

  private async cacheCompliance(key: string, data: any) {
    // Cache for 30 days
    await this.redisClient.set(key, JSON.stringify(data), 'EX', 30 * 24 * 60 * 60);
  }

  // Cache management methods
  async clearComplianceCache() {
    const keys = await this.redisClient.keys('compliance:*');
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
    return keys.length;
  }

  async getComplianceCacheStats() {
    const keys = await this.redisClient.keys('compliance:*');
    return {
      totalCachedItems: keys.length,
      cacheSize: await Promise.all(
        keys.map(key => this.redisClient.strlen(key))
      ).then(sizes => sizes.reduce((a, b) => a + b, 0))
    };
  }
}

interface ProductComplianceQuery {
  name: string;
  hsCode?: string;
  industrySector?: string;
  potentialMarkets?: string[];
}

export default ComplianceMCPService;
