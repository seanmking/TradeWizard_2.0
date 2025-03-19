/**
 * Scraper with Database Adapter Integration
 * Shows how to use the database adapter with the scraper service
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const dbAdapter = require('./db-adapter');
const logger = require('./logger');

// Mock scraper function (replace with actual scraper import)
async function mockScrapeWebsite(url) {
  logger.info(`Scraping website: ${url}`);
  
  // Simulate scraping delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return mock scraped data
  return {
    businessName: `Business at ${url}`,
    businessSize: "small",
    description: "This is data from our scraper",
    foundedYear: 2021,
    employeeCount: 25,
    productCategories: ["software"],
    productDetails: [
      { name: "Main Product", description: "Our flagship product", category: "software" }
    ],
    customerSegments: ["enterprise"],
    exportReadiness: 70,
    strengths: ["Technical expertise"],
    weaknesses: ["Limited market presence"],
    recommendations: ["Expand marketing efforts"],
    scrapedAt: new Date().toISOString()
  };
}

/**
 * Main function to scrape a website and save data using the adapter
 */
async function scrapeAndSaveWebsite(url) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logger.error('Missing Supabase credentials');
      return { success: false, error: 'Missing credentials' };
    }
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    logger.info('Supabase client initialized');
    
    // First check if we already have data for this URL
    const existingData = await dbAdapter.getScrapedData(supabase, url);
    
    if (existingData) {
      logger.info(`Found existing data for ${url}, last updated: ${existingData.lastUpdated}`);
      
      // Return cached data if recently scraped (within the last hour)
      const lastUpdated = new Date(existingData.lastUpdated);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (lastUpdated > oneHourAgo) {
        logger.info(`Using cached data for ${url} (less than 1 hour old)`);
        return { success: true, data: existingData, cached: true };
      }
      
      logger.info(`Cached data for ${url} is too old, re-scraping`);
    } else {
      logger.info(`No existing data found for ${url}, performing initial scrape`);
    }
    
    // Perform the scraping operation
    const scrapedData = await mockScrapeWebsite(url);
    
    // Save the scraped data using our adapter
    const savedRecord = await dbAdapter.saveScrapedData(supabase, url, scrapedData);
    
    if (!savedRecord) {
      logger.error(`Failed to save scraped data for ${url}`);
      return { success: false, error: 'Failed to save data' };
    }
    
    logger.info(`Successfully scraped and saved data for ${url}`);
    
    // Get the adapted model back from the database
    const adaptedModel = await dbAdapter.getScrapedData(supabase, url);
    
    return { 
      success: true, 
      data: adaptedModel,
      cached: false
    };
  } catch (error) {
    logger.error(`Error in scrapeAndSaveWebsite for ${url}`, { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Example usage
 */
async function runExample() {
  const exampleUrl = 'example.tradewizard.com';
  console.log(`\nScraping and saving data for ${exampleUrl}...\n`);
  
  const result = await scrapeAndSaveWebsite(exampleUrl);
  
  if (result.success) {
    console.log('Operation successful!');
    console.log(`Data source: ${result.cached ? 'Cache' : 'Fresh scrape'}`);
    console.log('Business name:', result.data.businessName);
    console.log('Export readiness score:', result.data.exportReadiness);
    console.log('Data ID:', result.data.id);
    console.log('Last updated:', result.data.lastUpdated);
  } else {
    console.error('Operation failed:', result.error);
  }
  
  // Run again to demonstrate caching
  console.log('\nRunning again to demonstrate caching...\n');
  const secondResult = await scrapeAndSaveWebsite(exampleUrl);
  
  if (secondResult.success) {
    console.log('Second operation successful!');
    console.log(`Data source: ${secondResult.cached ? 'Cache' : 'Fresh scrape'}`);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  runExample()
    .catch(error => {
      console.error('Error in example:', error);
    });
}

// Export for use in other modules
module.exports = { scrapeAndSaveWebsite }; 