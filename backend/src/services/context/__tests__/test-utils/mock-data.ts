import {
  RawWebsiteData,
  RawProductData,
  RawComplianceData,
  RawMarketData
} from '../../../../types/context-builder.types';
import { 
  WebsiteAnalysisResult,
  WebsiteData 
} from '../../../../types/ai-orchestrator.types';

// For AI Orchestrator tests
export const TEST_WEBSITE_DATA: WebsiteData = {
  url: 'https://test-example.com',
  title: '[TEST] Example Test Company',
  description: '[TEST] Leading test manufacturer',
  content: '[TEST] Sample content for testing',
  metadata: {
    'og:title': '[TEST] Example Test Company',
    'og:description': '[TEST] Leading manufacturer'
  },
  links: ['test-products', 'test-about'],
  images: ['test-logo.png']
};

// For Context Builder tests
export const TEST_RAW_WEBSITE_DATA: RawWebsiteData = {
  url: 'https://test-example.com',
  content: '[TEST] Sample content for testing',
  metadata: {
    'og:title': '[TEST] Example Test Company',
    'og:description': '[TEST] Leading manufacturer'
  },
  links: ['test-products', 'test-about'],
  images: ['test-logo.png']
};

export const TEST_PRODUCTS: RawProductData[] = [
  {
    name: '[TEST] Product 1',
    description: '[TEST] Description 1',
    category: '[TEST] Category 1',
    price: '$100',
    images: ['test-product1.jpg'],
    specifications: {
      'test-spec-1': 'test-value-1'
    }
  },
  {
    name: '[TEST] Product 2',
    description: '[TEST] Description 2',
    category: '[TEST] Category 2',
    price: '$200',
    images: ['test-product2.jpg'],
    specifications: {
      'test-spec-2': 'test-value-2'
    }
  }
];

export const TEST_COMPLIANCE_DATA: RawComplianceData[] = [
  {
    market: '[TEST] US',
    productType: '[TEST] Category 1',
    requirements: [
      {
        type: '[TEST] certification',
        details: '[TEST] Required certification for testing'
      }
    ]
  }
];

export const TEST_MARKET_DATA: RawMarketData[] = [
  {
    market: '[TEST] US',
    productType: '[TEST] Category 1',
    data: [
      {
        type: 'marketSize',
        value: 1000000 // Test value
      },
      {
        type: 'growthRate',
        value: 5.5 // Test value
      }
    ]
  }
];

export const TEST_WEBSITE_ANALYSIS: WebsiteAnalysisResult = {
  businessName: '[TEST] Example Test Company',
  businessDescription: '[TEST] Leading test manufacturer',
  industry: '[TEST] Manufacturing',
  subindustry: '[TEST] Electronics',
  products: [
    {
      name: '[TEST] Product 1',
      description: '[TEST] Description 1',
      category: '[TEST] Category 1'
    }
  ],
  contactInfo: {
    emails: ['test@example.com'],
    phones: ['+1-555-TEST']
  },
  socialMedia: ['twitter.com/test-example'],
  exportReadinessIndicators: {
    hasInternationalFocus: true,
    mentionsExports: true,
    hasCertifications: ['[TEST] ISO9001'],
    hasMultipleLanguages: true
  }
};

export const TEST_ENHANCEMENT_RESPONSE = {
  products: [
    {
      name: '[TEST] Product 1',
      hsCode: '9999.99', // Test HS code
      industrySector: '[TEST] Electronics',
      industrySubsector: '[TEST] Computer Peripherals',
      exportPotential: 'High',
      complianceRequirements: ['[TEST] FCC', '[TEST] CE'],
      potentialMarkets: ['[TEST] US', '[TEST] EU', '[TEST] JP']
    }
  ]
};

export const TEST_ANALYSIS_RESPONSE = {
  strengths: ['[TEST] Strong test portfolio', '[TEST] Established test presence'],
  weaknesses: ['[TEST] Limited test experience'],
  opportunities: ['[TEST] Growing test market'],
  threats: ['[TEST] Test competition'],
  recommendations: [
    {
      type: '[TEST] market_entry',
      description: '[TEST] Consider test market entry',
      priority: 'High'
    }
  ]
}; 