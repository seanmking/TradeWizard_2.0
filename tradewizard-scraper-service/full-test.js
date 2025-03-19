/**
 * Full Scraper Test
 * Runs the scraper on a specified URL and verifies database saving
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const scraper = require('./scraper');
const logger = require('./logger');

// URL to scrape
const urlToScrape = process.argv[2] || 'https://ambassadorfoods.co.za';

async function runTest() {
  console.log(`\n========================================`);
  console.log(`Running Full Scraper Test for ${urlToScrape}`);
  console.log(`========================================\n`);
  
  // Initialize Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Database functionality will be unavailable.');
    process.exit(1);
  }
  
  console.log('Initializing Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Step 1: Check if website record exists before scraping
  console.log('\n=== Step 1: Checking for existing record ===');
  const normalizedUrl = urlToScrape.replace(/^https?:\/\//, '');
  const { data: existingData, error: existingError } = await supabase
    .from('scraped_websites')
    .select('id, business_name, last_scraped')
    .eq('url', normalizedUrl)
    .maybeSingle();
  
  if (existingError) {
    console.error('Error checking for existing record:', existingError);
  } else if (existingData) {
    console.log(`Found existing record for ${normalizedUrl}:`);
    console.log(`- ID: ${existingData.id}`);
    console.log(`- Business Name: ${existingData.business_name}`);
    console.log(`- Last Scraped: ${new Date(existingData.last_scraped).toLocaleString()}`);
  } else {
    console.log(`No existing record found for ${normalizedUrl}`);
  }
  
  // Step 2: Run the scraper
  console.log('\n=== Step 2: Running the scraper ===');
  const startTime = Date.now();
  
  try {
    const result = await scraper.scrapeWebsite(urlToScrape, {
      maxPages: 10,
      maxDepth: 3,
      useCache: false, // Force a fresh scrape
      forceFresh: true
    });
    
    const endTime = Date.now();
    console.log(`Scraping completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    
    // Display key information from scraping result
    console.log('\nScraping Result:');
    console.log(`- Business Name: ${result.businessName}`);
    console.log(`- Business Size: ${result.businessSize}`);
    console.log(`- Export Readiness: ${result.exportReadiness}/100`);
    console.log(`- Product Categories: ${result.productCategories.join(', ') || 'None detected'}`);
    console.log(`- Products: ${result.productDetails?.length || 0} detected`);
    console.log(`- Geographic Presence: ${result.geographicPresence.join(', ') || 'None detected'}`);
    console.log(`- Certifications: ${result.certifications.join(', ') || 'None detected'}`);
    
    // Step 3: Verify data was saved in the database
    console.log('\n=== Step 3: Verifying database record ===');
    setTimeout(async () => {
      const { data: savedData, error: savedError } = await supabase
        .from('scraped_websites')
        .select('id, business_name, last_scraped, export_readiness')
        .eq('url', normalizedUrl)
        .maybeSingle();
      
      if (savedError) {
        console.error('Error checking for saved record:', savedError);
      } else if (savedData) {
        console.log(`Found saved record for ${normalizedUrl}:`);
        console.log(`- ID: ${savedData.id}`);
        console.log(`- Business Name: ${savedData.business_name}`);
        console.log(`- Export Readiness: ${savedData.export_readiness}`);
        console.log(`- Last Scraped: ${new Date(savedData.last_scraped).toLocaleString()}`);
        
        // Check if products were saved
        const { data: products, error: productsError } = await supabase
          .from('website_products')
          .select('id, name, category')
          .eq('website_id', savedData.id);
        
        if (productsError) {
          console.error('Error checking for saved products:', productsError);
        } else {
          console.log(`\nSaved Products (${products.length}):`);
          products.forEach((product, index) => {
            console.log(`  ${index + 1}. ${product.name} (${product.category})`);
          });
        }
        
        console.log('\nDatabase saving SUCCESSFUL!');
      } else {
        console.error('No database record found - saving FAILED!');
      }
      
      console.log(`\n========================================`);
      console.log(`Full Scraper Test Completed`);
      console.log(`========================================\n`);
    }, 2000); // Wait 2 seconds for database operations to complete
  } catch (error) {
    console.error('Error running scraper:', error);
  }
}

// Run the test
runTest(); 