/**
 * Test script for the enhanced scraper service
 * 
 * Usage: node test-scraper.js <url> [options]
 * Options:
 *   --full: Run a full test including saving to Supabase
 *   --nocache: Force a fresh scrape instead of using cached data
 */

require('dotenv').config();
const axios = require('axios');
const { crawlWebsite } = require('./crawler');
const { extractPageData } = require('./page-extractor');
const { detectProducts } = require('./hybrid-product-detector');
const { extractBusinessInfo, analyzeExportReadiness } = require('./enhanced-llm-analyzer');
const supabaseService = require('./supabase-service');
const logger = require('./logger');

// Parse command line arguments
const args = process.argv.slice(2);
const url = args[0];
const options = {
  full: args.includes('--full'),
  noCache: args.includes('--nocache'),
  maxPages: 10,
  maxDepth: 3
};

if (!url) {
  console.error('Please provide a URL to test');
  console.error('Usage: node test-scraper.js <url> [--full] [--nocache]');
  process.exit(1);
}

/**
 * Test the crawler
 */
async function testCrawler(url) {
  console.log(`\n=== Testing Crawler ===`);
  console.log(`URL: ${url}`);
  console.log(`Max Pages: ${options.maxPages}`);
  console.log(`Max Depth: ${options.maxDepth}`);
  console.time('Crawl Time');
  
  try {
    const crawlResult = await crawlWebsite(url, {
      maxPages: options.maxPages,
      maxDepth: options.maxDepth
    });
    
    console.timeEnd('Crawl Time');
    
    if (!crawlResult || !crawlResult.pages) {
      console.error('No pages were crawled or invalid crawl result');
      return null;
    }
    
    console.log(`Pages visited: ${crawlResult.pages.length}`);
    console.log(`Pages by type:`);
    
    // Count pages by type
    const typeCount = {};
    crawlResult.pages.forEach(page => {
      if (page.types && Array.isArray(page.types)) {
        page.types.forEach(type => {
          typeCount[type] = (typeCount[type] || 0) + 1;
        });
      }
    });
    
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
    
    return crawlResult;
  } catch (error) {
    console.error('Crawler Error:', error.message);
    return null;
  }
}

/**
 * Test the page extractor
 */
async function testPageExtractor(crawlResult) {
  console.log(`\n=== Testing Page Extractor ===`);
  
  if (!crawlResult || !crawlResult.pages || crawlResult.pages.length === 0) {
    console.error('No pages to extract data from');
    return null;
  }
  
  console.time('Extraction Time');
  
  try {
    const extractedData = {};
    
    for (const page of crawlResult.pages) {
      // Make sure page.types is an array
      const types = Array.isArray(page.types) ? page.types : [page.types].filter(Boolean);
      
      if (types.length === 0) {
        console.warn(`Page ${page.url} has no type classification, skipping extraction`);
        continue;
      }
      
      const pageData = extractPageData(page);
      
      if (pageData) {
        // Consolidate data by page type
        for (const type of types) {
          if (!type) continue;
          extractedData[type] = extractedData[type] || [];
          extractedData[type].push(pageData);
        }
      }
    }
    
    console.timeEnd('Extraction Time');
    console.log('Extracted data from page types:');
    Object.keys(extractedData).forEach(type => {
      console.log(`  - ${type}: ${extractedData[type].length} pages`);
    });
    
    return extractedData;
  } catch (error) {
    console.error('Page Extractor Error:', error.message);
    return null;
  }
}

/**
 * Test the product detector
 */
async function testProductDetector(crawlResult) {
  console.log(`\n=== Testing Hybrid Product Detector ===`);
  
  if (!crawlResult || !crawlResult.pages || crawlResult.pages.length === 0) {
    console.error('No pages to detect products from');
    return [];
  }
  
  console.time('Product Detection Time');
  
  try {
    const productsResult = await detectProducts(crawlResult.pages);
    
    console.timeEnd('Product Detection Time');
    console.log(`Detected ${productsResult.products.length} products`);
    console.log(`DOM-based detection: ${productsResult.domProducts.length} products`);
    console.log(`LLM-based detection: ${productsResult.llmProducts.length} products`);
    
    // Print the first 3 products (if available)
    if (productsResult.products.length > 0) {
      console.log('\nSample products:');
      productsResult.products.slice(0, 3).forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name || 'Unnamed Product'}`);
        console.log(`   Description: ${product.description?.substring(0, 50)}...`);
        console.log(`   Confidence: ${product.confidence}`);
      });
    }
    
    return productsResult.products;
  } catch (error) {
    console.error('Product Detector Error:', error.message);
    return [];
  }
}

/**
 * Test the enhanced LLM analyzer
 */
async function testLlmAnalyzer(crawlResult, extractedData) {
  console.log(`\n=== Testing Enhanced LLM Analyzer ===`);
  
  if (!crawlResult || !crawlResult.pages || crawlResult.pages.length === 0) {
    console.error('No pages to analyze');
    return null;
  }
  
  try {
    console.log('Extracting business information...');
    console.time('Business Info Extraction Time');
    
    const businessInfo = await extractBusinessInfo({
      pages: crawlResult.pages,
      extractedData: extractedData
    });
    
    console.timeEnd('Business Info Extraction Time');
    console.log('\nBusiness Information:');
    console.log(`  Name: ${businessInfo.businessName || 'Unknown'}`);
    console.log(`  Size: ${businessInfo.businessSize || 'Unknown'}`);
    console.log(`  Description: ${businessInfo.description?.substring(0, 100)}...`);
    console.log(`  Customer Segments: ${businessInfo.customerSegments?.join(', ') || 'None identified'}`);
    console.log(`  Geographic Presence: ${businessInfo.geographicPresence?.join(', ') || 'None identified'}`);
    
    console.log('\nAnalyzing export readiness...');
    console.time('Export Readiness Analysis Time');
    
    const exportReadiness = await analyzeExportReadiness({
      pages: crawlResult.pages
    }, businessInfo);
    
    console.timeEnd('Export Readiness Analysis Time');
    console.log(`\nExport Readiness Score: ${exportReadiness.score}/100`);
    
    if (exportReadiness.strengths && exportReadiness.strengths.length > 0) {
      console.log('\nStrengths:');
      exportReadiness.strengths.slice(0, 3).forEach(strength => {
        console.log(`  - ${strength}`);
      });
    }
    
    if (exportReadiness.weaknesses && exportReadiness.weaknesses.length > 0) {
      console.log('\nWeaknesses:');
      exportReadiness.weaknesses.slice(0, 3).forEach(weakness => {
        console.log(`  - ${weakness}`);
      });
    }
    
    return {
      businessInfo,
      exportReadiness
    };
  } catch (error) {
    console.error('LLM Analyzer Error:', error.message);
    return null;
  }
}

/**
 * Test Supabase integration
 */
async function testSupabase(url, businessInfo, products, exportReadiness) {
  console.log(`\n=== Testing Supabase Integration ===`);
  
  if (!supabaseService.initSupabase()) {
    console.error('Failed to initialize Supabase client. Check credentials.');
    return false;
  }
  
  try {
    // Check for cached data
    console.log('Checking for cached data...');
    const cachedData = await supabaseService.getCachedData(url);
    
    if (cachedData) {
      console.log(`Found cached data from ${cachedData.last_scraped}`);
      console.log(`Business: ${cachedData.business_name}`);
      console.log(`Products: ${cachedData.products?.length || 0}`);
    } else {
      console.log('No cached data found');
    }
    
    // Only save new data if we have business info
    if (businessInfo) {
      console.log('\nSaving new data to Supabase...');
      
      const dataToSave = {
        ...businessInfo,
        ...exportReadiness,
        productDetails: products
      };
      
      const saveResult = await supabaseService.saveScrapedData(url, dataToSave);
      
      if (saveResult) {
        console.log('Successfully saved data to Supabase');
      } else {
        console.error('Failed to save data to Supabase');
      }
    }
    
    // Get database stats
    console.log('\nGetting database stats...');
    const stats = await supabaseService.getDatabaseStats();
    console.log(`Total websites: ${stats.websiteCount}`);
    console.log(`Total products: ${stats.productCount}`);
    
    if (stats.recentWebsites && stats.recentWebsites.length > 0) {
      console.log('\nRecent websites:');
      stats.recentWebsites.slice(0, 3).forEach(site => {
        console.log(`  - ${site.business_name || 'Unknown'} (${site.url})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Supabase Integration Error:', error.message);
    return false;
  }
}

/**
 * Run the full test
 */
async function runTest() {
  console.log(`\n========================================`);
  console.log(`Starting Enhanced Scraper Test for ${url}`);
  console.log(`Options: ${JSON.stringify(options)}`);
  console.log(`========================================\n`);
  
  try {
    // Test crawler
    const crawlResult = await testCrawler(url);
    if (!crawlResult) return;
    
    // Test page extractor
    const extractedData = await testPageExtractor(crawlResult);
    if (!extractedData) return;
    
    // Test product detector
    const products = await testProductDetector(crawlResult);
    
    // Test LLM analyzer
    const llmResult = await testLlmAnalyzer(crawlResult, extractedData);
    
    // Test Supabase integration if --full option is provided
    if (options.full && llmResult) {
      await testSupabase(url, llmResult.businessInfo, products, llmResult.exportReadiness);
    }
    
    console.log(`\n========================================`);
    console.log(`Enhanced Scraper Test Completed`);
    console.log(`========================================\n`);
  } catch (error) {
    console.error(`Test failed with error: ${error.message}`);
  }
}

// Run the test
runTest(); 