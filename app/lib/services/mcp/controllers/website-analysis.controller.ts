// Add server-only directive at the top of the file
'use server';

/**
 * Website Analysis Controller
 * 
 * Controls website analysis using either the internal scraper or 
 * the external scraper microservice
 */

import { analyzeWebsiteWithScraperService, isScraperServiceAvailable } from '../services/website-analysis.service';
import { EnhancedWebsiteAnalysisResult } from '../models/website-data.model';

/**
 * Analyzes a website and returns structured data for the AI
 */
export class WebsiteAnalysisController {
  
  /**
   * Analyze a website and return structured data
   */
  async analyzeWebsite(url: string): Promise<EnhancedWebsiteAnalysisResult> {
    try {
      console.log(`Starting website analysis for ${url}`);
      
      // Check if the scraper service is available
      const scraperAvailable = await isScraperServiceAvailable();
      
      let analysisResult;
      
      if (scraperAvailable) {
        // Use the external scraper service
        console.log('Using external scraper microservice');
        analysisResult = await analyzeWebsiteWithScraperService(url);
      } else {
        // Fall back to mock data with a warning
        console.warn('Scraper service unavailable, using mock data');
        analysisResult = this.getMockAnalysisData(url);
      }
      
      console.log(`Completed website analysis for ${url}`);
      return analysisResult;
      
    } catch (error: any) {
      console.error(`Error analyzing website ${url}:`, error);
      throw new Error(`Failed to analyze website: ${error.message}`);
    }
  }
  
  /**
   * Generate mock data when the scraper is unavailable
   */
  private getMockAnalysisData(url: string): EnhancedWebsiteAnalysisResult {
    return {
      // Basic information
      businessName: 'Sample Business',
      description: 'Sample business description derived from URL: ' + url,
      
      // Required fields from original interface
      productCategories: ['Sample Product Category'],
      certifications: ['ISO 9001', 'HACCP'],
      geographicPresence: ['South Africa'],
      businessSize: 'medium',
      customerSegments: ['B2B', 'Retailers'],
      exportReadiness: 45,
      
      // Enhanced fields
      productDetails: [
        { name: 'Sample Product', description: 'A sample product description' }
      ],
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
      }
    };
  }
}

// Export singleton instance
export const websiteAnalysisController = new WebsiteAnalysisController();
export default websiteAnalysisController; 