/**
 * Adapter Test Script
 * Runs the scraper and saves data using the actual table schema
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const scraper = require('./scraper');
const logger = require('./logger');

// URL to scrape
const urlToScrape = process.argv[2] || 'https://ambassadorfoods.co.za';

async function runAdapterTest() {
  console.log(`\n========================================`);
  console.log(`Running Adapter Test for ${urlToScrape}`);
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
    .select('*')
    .eq('url', normalizedUrl)
    .maybeSingle();
  
  if (existingError) {
    console.error('Error checking for existing record:', existingError);
  } else if (existingData) {
    console.log(`Found existing record for ${normalizedUrl}:`);
    console.log(`- ID: ${existingData.id}`);
    console.log(`- Last Scraped: ${new Date(existingData.scraped_at).toLocaleString()}`);
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
    
    // Step 3: Save data directly to the database with the actual schema
    console.log('\n=== Step 3: Saving to database with adapter ===');
    
    // Adapt the data to match our actual table schema
    const adaptedData = {
      url: normalizedUrl,
      data: result,  // Store all result data in the JSONB 'data' field
      status: 'complete'
    };
    
    let saveResult;
    if (existingData?.id) {
      // Update existing record
      const { data, error } = await supabase
        .from('scraped_websites')
        .update({
          ...adaptedData,
          scraped_at: new Date().toISOString()
        })
        .eq('id', existingData.id)
        .select();
      
      if (error) {
        console.error('Error updating record:', error);
      } else {
        console.log('Successfully updated existing record');
        saveResult = data;
      }
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('scraped_websites')
        .insert({
          ...adaptedData,
          scraped_at: new Date().toISOString()
        })
        .select();
      
      if (error) {
        console.error('Error inserting record:', error);
      } else {
        console.log('Successfully inserted new record');
        saveResult = data;
      }
    }
    
    // Step 4: Verify data was saved correctly
    console.log('\n=== Step 4: Verifying database record ===');
    const { data: verifyData, error: verifyError } = await supabase
      .from('scraped_websites')
      .select('*')
      .eq('url', normalizedUrl)
      .maybeSingle();
    
    if (verifyError) {
      console.error('Error verifying record:', verifyError);
    } else if (verifyData) {
      console.log(`Verified record in database:`);
      console.log(`- ID: ${verifyData.id}`);
      console.log(`- URL: ${verifyData.url}`);
      console.log(`- Status: ${verifyData.status}`);
      console.log(`- Last Scraped: ${new Date(verifyData.scraped_at).toLocaleString()}`);
      console.log(`- Data size: ${JSON.stringify(verifyData.data).length} characters`);
      console.log(`\nDatabase saving SUCCESSFUL!`);
    } else {
      console.error('No database record found - saving FAILED!');
    }
    
    console.log(`\n========================================`);
    console.log(`Adapter Test Completed`);
    console.log(`========================================\n`);
  } catch (error) {
    console.error('Error running scraper:', error);
  }
}

// Run the test
runAdapterTest(); 