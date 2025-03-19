'use server';

import { websiteAnalysisController } from './controllers/website-analysis.controller';
import { EnhancedWebsiteAnalysisResult } from './models/website-data.model';

export interface WebsiteAnalysisResult {
  productCategories: string[];
  certifications: string[];
  geographicPresence: string[];
  businessSize: 'small' | 'medium' | 'large';
  customerSegments: string[];
  exportReadiness: number; // 0-100 score
}

class MCPService {
  /**
   * Analyze a website and extract business information
   * Uses the web scraper for detailed analysis instead of sending entire website to AI
   */
  async analyzeWebsite(url: string): Promise<WebsiteAnalysisResult> {
    try {
      console.log(`MCP analyzing website: ${url}`);
      
      // Use the enhanced website analysis controller
      const enhancedAnalysis = await websiteAnalysisController.analyzeWebsite(url);
      
      // Convert to the expected result format
      return this.convertToWebsiteAnalysisResult(enhancedAnalysis);
      
    } catch (error: any) {
      console.error(`Error in MCP website analysis: ${error.message}`);
      
      // Fallback to error messages instead of mock data
      return {
        productCategories: ['Error - Information not found at this time'],
        certifications: ['Error - Information not found at this time'],
        geographicPresence: ['Error - Information not found at this time'],
        businessSize: 'small', // Using valid enum value, but will be displayed as error
        customerSegments: ['Error - Information not found at this time'],
        exportReadiness: 0 // Error indicator
      };
    }
  }
  
  /**
   * Convert enhanced analysis to the original format for backward compatibility
   */
  private convertToWebsiteAnalysisResult(
    enhanced: EnhancedWebsiteAnalysisResult
  ): WebsiteAnalysisResult {
    return {
      productCategories: enhanced.productCategories,
      certifications: enhanced.certifications,
      geographicPresence: enhanced.geographicPresence.filter(loc => !!loc) as string[], // Filter undefined
      businessSize: enhanced.businessSize,
      customerSegments: enhanced.customerSegments,
      exportReadiness: enhanced.exportReadiness
    };
  }
  
  // Placeholder for regulatory compliance check
  async checkCompliance(product: string, targetMarket: string): Promise<any> {
    console.log(`Checking compliance for ${product} in ${targetMarket}`);
    return {
      requiredCertifications: ['Example Cert 1', 'Example Cert 2'],
      importDuties: '5%',
      restrictions: 'None'
    };
  }
  
  // Placeholder for market analysis
  async analyzeMarket(product: string, targetMarket: string): Promise<any> {
    console.log(`Analyzing market for ${product} in ${targetMarket}`);
    return {
      marketSize: '$100M',
      growth: '5% annually',
      competitors: ['Competitor 1', 'Competitor 2'],
      entryBarriers: 'Medium'
    };
  }
}

export const mcpService = new MCPService();
export default mcpService; 