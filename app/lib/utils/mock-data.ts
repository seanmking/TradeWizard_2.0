import { EnhancedProduct, EnhancedWebsiteAnalysisResult } from '../services/mcp/models/website-data.model';

/**
 * Generate mock data when the scraper is unavailable
 */
export function getMockAnalysisData(url: string): EnhancedWebsiteAnalysisResult {
  const mockProducts: EnhancedProduct[] = [
    {
      name: 'Premium Organic Coffee Beans',
      description: 'Our signature organic coffee beans sourced from sustainable farms',
      price: null,
      category: 'Beverages',
      images: [],
      attributes: {}
    },
    {
      name: 'Specialty Tea Collection',
      description: 'Hand-picked tea varieties from around the world',
      price: null,
      category: 'Beverages',
      images: [],
      attributes: {}
    }
  ];

  return {
    // Basic information
    businessName: 'Sample Business',
    description: 'Sample business description derived from URL: ' + url,
    
    // Required fields from original interface
    productCategories: ['Beverages'],
    certifications: ['ISO 9001', 'HACCP'],
    geographicPresence: ['South Africa'],
    businessSize: 'medium',
    customerSegments: ['B2B', 'Retailers'],
    exportReadiness: 45,
    
    // Enhanced fields
    productDetails: mockProducts.map(p => ({
      name: p.name,
      description: p.description
    })),
    exportMentions: ['Sample export statement'],
    contactInfo: {
      email: 'contact@example.com',
      phone: '+27 12 345 6789'
    },
    locations: ['Johannesburg'],
    lastUpdated: new Date(),
    
    // Website quality indicators
    websiteQuality: {
      hasSsl: url.startsWith('https://'),
      hasMobileCompatibility: true,
      hasRecentUpdates: true,
      hasMultiplePages: true
    },

    // Required EnhancedWebsiteAnalysisResult fields
    analysisType: 'enhanced' as const,
    url,
    products: mockProducts,
    categories: ['Beverages'],
    confidence: 0.75,
    analysisTime: 0,
    costIncurred: 0,
    detectionMethod: 'mock'
  };
} 