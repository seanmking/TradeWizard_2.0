'use server';

/**
 * Server actions for MCP service
 * These functions are meant to be called from client components
 */

import type { WebsiteAnalysisResult } from './index';
import { websiteAnalysisController } from './controllers/website-analysis.controller';

/**
 * Analyze a website and return structured data
 * This is a server action that can be called from client components
 */
export async function analyzeWebsite(url: string): Promise<WebsiteAnalysisResult> {
  try {
    console.log(`MCP analyzing website: ${url}`);
    
    // Use the website analysis controller
    const enhancedResult = await websiteAnalysisController.analyzeWebsite(url);
    
    // Convert to the expected result format
    return {
      productCategories: enhancedResult.productCategories || [],
      certifications: enhancedResult.certifications || [],
      geographicPresence: enhancedResult.geographicPresence || [],
      businessSize: enhancedResult.businessSize || 'small',
      customerSegments: enhancedResult.customerSegments || [],
      exportReadiness: enhancedResult.exportReadiness || 50
    };
  } catch (error: any) {
    console.error('Error analyzing website:', error);
    // Return a fallback result
    return {
      productCategories: [],
      certifications: [],
      geographicPresence: [],
      businessSize: 'small',
      customerSegments: [],
      exportReadiness: 0
    };
  }
} 