'use server';

/**
 * Website Analysis Service
 * 
 * Connects to the standalone scraper microservice for website analysis
 */

import axios from 'axios';
import { WebsiteAnalysisResult } from '../models/website-data.model';

// Scraper service URL (should be set in environment variables)
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'http://localhost:3001';
const REQUEST_TIMEOUT = 45000; // 45 seconds

/**
 * Analyze a website for business information using the standalone scraper service
 */
export async function analyzeWebsiteWithScraperService(websiteUrl: string): Promise<WebsiteAnalysisResult> {
  try {
    console.log(`Requesting website analysis for: ${websiteUrl}`);
    
    const response = await axios.get(`${SCRAPER_SERVICE_URL}/analyze`, {
      params: { url: websiteUrl },
      timeout: REQUEST_TIMEOUT
    });
    
    return response.data;
  } catch (error: any) {
    console.error(`Website analysis failed: ${error.message}`);
    
    // Provide a clear error message
    throw new Error('We are currently unable to analyze this website. Please try again later or provide the information manually.');
  }
}

/**
 * Check if the scraper service is available
 */
export async function isScraperServiceAvailable(): Promise<boolean> {
  try {
    const response = await axios.get(`${SCRAPER_SERVICE_URL}/health`, {
      timeout: 5000 // Short timeout for health check
    });
    
    return response.data.status === 'OK';
  } catch (error) {
    console.error('Scraper service health check failed:', error);
    return false;
  }
} 