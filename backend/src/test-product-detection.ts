/**
 * Test script for product detection functionality
 * 
 * This script can be run to verify that the product detection services work correctly.
 * Run with: npm run build && node dist/test-product-detection.js
 */

import { WebScraperService } from './services/web-scraper.service';
import { DomProductDetectorService } from './services/dom-product-detector.service';
import { HybridProductDetectorService } from './services/hybrid-product-detector.service';

// Test websites
const TEST_URLS = [
  'https://www.woolworths.co.za/cat/Food/Bakery/Bread/_/N-1z13sk4',
  'https://www.takealot.com/all?_sb=1&_r=1&_si=a4c8d0a382c04417d1e279be09b7247a&qsearch=coffee&userinput=coffee',
  'https://www.game.co.za/game-za/en/All-Game-Categories/Appliances/Kitchen-Appliances/Coffee-Machines/c/G010301'
];

/**
 * Main test function
 */
async function runTests() {
  console.log('====================================');
  console.log('Product Detection Test');
  console.log('====================================\n');
  
  const webScraper = new WebScraperService();
  const domDetector = new DomProductDetectorService();
  const hybridDetector = new HybridProductDetectorService();
  
  for (const url of TEST_URLS) {
    console.log(`\n----- Testing URL: ${url} -----\n`);
    
    try {
      // 1. Web Scraper Test
      console.log('1. Testing WebScraperService...');
      const startScrape = Date.now();
      const websiteData = await webScraper.scrapeWebsite(url);
      const scrapeDuration = Date.now() - startScrape;
      
      console.log(`✅ Scraping completed in ${scrapeDuration}ms`);
      console.log(`   Title: ${websiteData.title}`);
      console.log(`   Description: ${websiteData.description ? websiteData.description.substring(0, 100) + '...' : 'N/A'}`);
      console.log(`   Links: ${websiteData.links?.length || 0}`);
      console.log(`   Images: ${websiteData.images?.length || 0}`);
      
      // Extract product information directly with WebScraperService
      console.log('\n2. Testing WebScraperService.scrapeProducts()...');
      const startProductScrape = Date.now();
      const scrapedProducts = await webScraper.scrapeProducts(url);
      const productScrapeDuration = Date.now() - startProductScrape;
      
      console.log(`✅ Product scraping completed in ${productScrapeDuration}ms`);
      console.log(`   Products found: ${scrapedProducts.length}`);
      
      if (scrapedProducts.length > 0) {
        console.log('\n   Sample Products:');
        scrapedProducts.slice(0, 3).forEach((product, index) => {
          console.log(`   Product ${index + 1}:`);
          console.log(`     Name: ${product.name}`);
          console.log(`     Price: ${product.price || 'N/A'}`);
          console.log(`     Description: ${product.description ? product.description.substring(0, 100) + (product.description.length > 100 ? '...' : '') : 'N/A'}`);
        });
      }
      
      // 3. DOM-based Product Detector Test
      console.log('\n3. Testing DomProductDetectorService...');
      
      // Simulate HTML content from the fetched data
      const html = `
        <html>
          <head>
            <title>${websiteData.title}</title>
            <meta name="description" content="${websiteData.description || ''}">
            ${Object.entries(websiteData.metadata || {}).map(([name, content]) => 
              `<meta name="${name}" content="${content}">`
            ).join('\n')}
          </head>
          <body>
            ${websiteData.content}
          </body>
        </html>
      `;
      
      const startDomDetect = Date.now();
      const domResult = domDetector.detectProducts(html);
      const domDetectDuration = Date.now() - startDomDetect;
      
      console.log(`✅ DOM detection completed in ${domDetectDuration}ms`);
      console.log(`   Products found: ${domResult.products.length}`);
      console.log(`   Confidence: ${domResult.confidence.toFixed(2)}`);
      console.log(`   Method: ${domResult.method}`);
      
      if (domResult.products.length > 0) {
        console.log('\n   Sample Products:');
        domResult.products.slice(0, 3).forEach((product, index) => {
          console.log(`   Product ${index + 1}:`);
          console.log(`     Name: ${product.name}`);
          console.log(`     Price: ${product.price || 'N/A'}`);
          console.log(`     Description: ${product.description ? product.description.substring(0, 100) + (product.description.length > 100 ? '...' : '') : 'N/A'}`);
        });
      }
      
      // 4. Hybrid Product Detector Test
      console.log('\n4. Testing HybridProductDetectorService...');
      const startHybridDetect = Date.now();
      const hybridResult = await hybridDetector.detectProducts(url, {
        useLlm: false, // LLM integration will be in Phase 2
        forceFresh: true
      });
      const hybridDetectDuration = Date.now() - startHybridDetect;
      
      console.log(`✅ Hybrid detection completed in ${hybridDetectDuration}ms`);
      console.log(`   Products found: ${hybridResult.products.length}`);
      console.log(`   Confidence: ${hybridResult.confidence.toFixed(2)}`);
      console.log(`   Method: ${hybridResult.method}`);
      console.log(`   Used LLM: ${hybridResult.metrics.usedLlm}`);
      
      if (hybridResult.products.length > 0) {
        console.log('\n   Sample Products:');
        hybridResult.products.slice(0, 3).forEach((product, index) => {
          console.log(`   Product ${index + 1}:`);
          console.log(`     Name: ${product.name}`);
          console.log(`     Price: ${product.price || 'N/A'}`);
          console.log(`     Description: ${product.description ? product.description.substring(0, 100) + (product.description.length > 100 ? '...' : '') : 'N/A'}`);
        });
      }
      
    } catch (error: any) {
      console.error(`❌ Error testing ${url}:`, error.message);
    }
    
    console.log('\n----- Test completed -----\n');
  }
  
  console.log('====================================');
  console.log('All tests completed');
  console.log('====================================');
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error during test execution:', error);
  process.exit(1);
});
