/**
 * Advanced Scraper Integration
 * Demonstrates how to use the advanced database adapter with the scraper service
 */

require('dotenv').config();
const { createAdapter } = require('./advanced-db-adapter');
const logger = require('./logger');

// Simple mock scraper (in production, you would import your real scraper)
async function mockScrapeWebsite(url, options = {}) {
  logger.info(`Scraping website: ${url} with options:`, options);
  
  // Simulate scraping delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return mock scraped data
  return {
    businessName: `Business at ${url}`,
    businessSize: options.assumeSize || "medium",
    description: "Data from advanced scraper integration",
    foundedYear: 2022,
    employeeCount: 75,
    productCategories: ["software", "services"],
    productDetails: [
      { 
        name: "Enterprise Solution", 
        description: "Comprehensive solution for businesses", 
        category: "software",
        pricing: options.includePricing ? "$499/month" : "Contact for pricing" 
      },
      { 
        name: "Consulting Services", 
        description: "Expert guidance for your business", 
        category: "services" 
      }
    ],
    customerSegments: ["enterprise", "government"],
    exportReadiness: options.exportFocus ? 95 : 65,
    strengths: ["Technical innovation", "Customer service"],
    weaknesses: ["Market presence", "Brand recognition"],
    recommendations: [
      "Expand marketing efforts",
      "Focus on specific industries",
      options.exportFocus ? "Target international markets" : "Strengthen domestic presence"
    ],
    scrapedAt: new Date().toISOString()
  };
}

/**
 * Main scraper function with adapter integration
 */
async function scrapeWebsiteWithAdapter(url, options = {}) {
  try {
    // Create and initialize the database adapter
    const dbAdapter = createAdapter();
    logger.info(`Starting scrape process for ${url}`);
    
    // Check for caching options
    const useCaching = options.useCaching !== false;
    const cacheMaxAge = options.cacheMaxAge || 60 * 60 * 1000; // 1 hour default
    
    // Check if we have recent data we can use
    if (useCaching) {
      logger.info(`Checking for cached data for ${url}`);
      const cachedResult = await dbAdapter.getScrapedData(url);
      
      if (cachedResult.success) {
        const cachedAt = new Date(cachedResult.metadata.scraped_at);
        const cacheExpiryTime = new Date(Date.now() - cacheMaxAge);
        
        if (cachedAt > cacheExpiryTime) {
          logger.info(`Using cached data for ${url} from ${cachedAt.toISOString()}`);
          return {
            success: true,
            data: cachedResult.data,
            metadata: cachedResult.metadata,
            source: 'cache'
          };
        }
        
        logger.info(`Cached data for ${url} is too old (from ${cachedAt.toISOString()})`);
      } else {
        logger.info(`No cached data found for ${url}`);
      }
    }
    
    // Create a pending record to show we're working on it
    await dbAdapter.saveScrapedData(url, { 
      status: 'scraping started',
      options,
      timestamp: new Date().toISOString()
    }, 'pending');
    
    logger.info(`Created pending record for ${url}`);
    
    // Perform the actual scraping
    let scrapedData;
    try {
      scrapedData = await mockScrapeWebsite(url, options);
      logger.info(`Successfully scraped data for ${url}`);
    } catch (scrapeError) {
      logger.error(`Error scraping ${url}:`, scrapeError.message);
      
      // Update status to failed
      await dbAdapter.updateStatus(url, 'failed');
      
      return {
        success: false,
        error: `Scraping failed: ${scrapeError.message}`
      };
    }
    
    // Save the scraped data
    const saveResult = await dbAdapter.saveScrapedData(url, scrapedData);
    
    if (!saveResult.success) {
      logger.error(`Failed to save scraped data for ${url}:`, saveResult.error);
      return {
        success: false,
        error: `Failed to save data: ${saveResult.error}`
      };
    }
    
    // Get full data with metadata
    const result = await dbAdapter.getScrapedData(url);
    
    return {
      success: true,
      data: result.data,
      metadata: result.metadata,
      source: 'fresh'
    };
  } catch (error) {
    logger.error(`Error in scrapeWebsiteWithAdapter for ${url}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run example with multiple URLs and options
 */
async function runExample() {
  console.log('\n=============================================');
  console.log('Advanced Scraper Integration Example');
  console.log('=============================================\n');
  
  // Example 1: Basic scraping
  console.log('=== Example 1: Basic Scraping ===');
  const basicResult = await scrapeWebsiteWithAdapter('example-advanced.tradewizard.com');
  console.log(`Success: ${basicResult.success}`);
  if (basicResult.success) {
    console.log(`Source: ${basicResult.source}`);
    console.log(`Business Name: ${basicResult.data.businessName}`);
    console.log(`Status: ${basicResult.metadata.status}`);
    console.log(`Products: ${basicResult.data.productDetails.length}`);
  } else {
    console.error(`Error: ${basicResult.error}`);
  }
  
  // Example 2: With specific options
  console.log('\n=== Example 2: Scraping with Options ===');
  const optionsResult = await scrapeWebsiteWithAdapter('example-advanced-options.tradewizard.com', {
    exportFocus: true,
    includePricing: true,
    assumeSize: 'large'
  });
  
  if (optionsResult.success) {
    console.log(`Source: ${optionsResult.source}`);
    console.log(`Business Name: ${optionsResult.data.businessName}`);
    console.log(`Export Readiness: ${optionsResult.data.exportReadiness}`);
    console.log(`First Product Pricing: ${optionsResult.data.productDetails[0].pricing}`);
    console.log(`Business Size: ${optionsResult.data.businessSize}`);
    console.log(`Recommendations: ${optionsResult.data.recommendations.length}`);
  }
  
  // Example 3: Demonstrate caching by running the same request again
  console.log('\n=== Example 3: Demonstrating Caching ===');
  console.log('Running same request again to show caching:');
  const cachedResult = await scrapeWebsiteWithAdapter('example-advanced.tradewizard.com');
  
  if (cachedResult.success) {
    console.log(`Source: ${cachedResult.source}`);
    console.log(`From Cache: ${cachedResult.source === 'cache'}`);
    console.log(`Last Updated: ${cachedResult.metadata.scraped_at}`);
  }
  
  // Example 4: Force fresh data
  console.log('\n=== Example 4: Force Fresh Data ===');
  const freshResult = await scrapeWebsiteWithAdapter('example-advanced.tradewizard.com', {
    useCaching: false
  });
  
  if (freshResult.success) {
    console.log(`Source: ${freshResult.source}`);
    console.log(`From Cache: ${freshResult.source === 'cache'}`);
    console.log(`Last Updated: ${freshResult.metadata.scraped_at}`);
  }
  
  // Example 5: List all scraped websites
  console.log('\n=== Example 5: List All Scraped Websites ===');
  const dbAdapter = createAdapter();
  const listResult = await dbAdapter.listScrapedWebsites();
  
  if (listResult.success) {
    console.log(`Found ${listResult.data.length} websites in the database:`);
    listResult.data.forEach((website, index) => {
      console.log(`${index + 1}. ${website.url} (${website.status})`);
      if (website.businessData && website.businessData.businessName) {
        console.log(`   Business: ${website.businessData.businessName}`);
      }
    });
  }
  
  console.log('\n=============================================');
  console.log('Advanced Scraper Integration Complete');
  console.log('=============================================\n');
}

// Run the example if this script is executed directly
if (require.main === module) {
  runExample().catch(error => {
    console.error('Error running example:', error);
  });
}

// Export for use in other modules
module.exports = { scrapeWebsiteWithAdapter }; 