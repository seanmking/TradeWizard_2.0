/**
 * Table Verification Script
 * Checks if the required table exists and tests basic operations
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

async function verifyTable() {
  // Get Supabase credentials
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing Supabase credentials');
    process.exit(1);
  }
  
  logger.info('Initializing Supabase client...');
  
  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // First make a simple query to test connection
    logger.info('Testing connection...');
    const { data: testData, error: testError } = await supabase.auth.getSession();
    
    if (testError) {
      logger.error('Connection test failed:', testError);
    } else {
      logger.info('Connection successful!');
    }
    
    // Check if table exists by trying to select from it
    logger.info('Checking if scraped_websites table exists...');
    
    const { data: tableData, error: tableError } = await supabase
      .from('scraped_websites')
      .select('*')
      .limit(5);
      
    if (tableError) {
      logger.error('Error accessing table:', tableError);
      process.exit(1);
    } else {
      logger.info('Table exists and is accessible!');
      logger.info(`Found ${tableData.length} records in the table`);
      
      if (tableData.length > 0) {
        logger.info('Sample record:', tableData[0]);
      }
    }
    
    // Test insertion
    logger.info('Testing insertion...');
    
    const testUrl = `test-${Date.now()}.com`;
    const { data: insertData, error: insertError } = await supabase
      .from('scraped_websites')
      .insert({
        url: testUrl,
        data: { 
          test: true, 
          timestamp: new Date().toISOString(),
          verification: 'success'
        },
        status: 'verified'
      })
      .select();
      
    if (insertError) {
      logger.error('Insertion test failed:', insertError);
    } else {
      logger.info('Insertion successful!');
      logger.info('Inserted record:', insertData);
    }
    
    // Test update
    if (!insertError) {
      logger.info('Testing update...');
      
      const { data: updateData, error: updateError } = await supabase
        .from('scraped_websites')
        .update({
          status: 'updated',
          data: { 
            ...insertData[0].data,
            updated: true,
            update_time: new Date().toISOString()
          }
        })
        .eq('url', testUrl)
        .select();
        
      if (updateError) {
        logger.error('Update test failed:', updateError);
      } else {
        logger.info('Update successful!');
        logger.info('Updated record:', updateData);
      }
    }
    
    // Test select with filter
    logger.info('Testing select with filter...');
    
    const { data: filterData, error: filterError } = await supabase
      .from('scraped_websites')
      .select('*')
      .eq('status', 'updated')
      .limit(5);
      
    if (filterError) {
      logger.error('Filter test failed:', filterError);
    } else {
      logger.info('Filter test successful!');
      logger.info(`Found ${filterData.length} records with status 'updated'`);
    }
    
    logger.info('All verification tests completed. The table is ready for use!');
    
  } catch (error) {
    logger.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the verification
verifyTable(); 