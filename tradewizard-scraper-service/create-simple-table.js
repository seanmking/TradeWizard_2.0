/**
 * Simple Supabase Table Creation Script
 * Creates the scraped_websites table using the JavaScript client
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

async function createTable() {
  // Get Supabase credentials
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing Supabase credentials');
    process.exit(1);
  }
  
  logger.info('Supabase URL:', supabaseUrl);
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
    logger.info('Checking if table exists...');
    
    const { error: checkError } = await supabase
      .from('scraped_websites')
      .select('*')
      .limit(1);
      
    if (checkError && checkError.code === '42P01') {
      logger.info('Table does not exist. Creating table via REST API...');
      
      // Use a simple POST request to create the table
      const response = await fetch(supabaseUrl + '/rest/v1/rpc/create_table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ 
          table_name: 'scraped_websites',
          columns: [
            { name: 'id', type: 'serial', primary_key: true },
            { name: 'url', type: 'text', constraints: ['not null', 'unique'] },
            { name: 'data', type: 'jsonb', constraints: ['not null'] },
            { name: 'scraped_at', type: 'timestamptz', default_value: 'current_timestamp' },
            { name: 'status', type: 'text', default_value: "'pending'" }
          ]
        })
      });
      
      if (!response.ok) {
        logger.error('Error creating table with custom RPC:', await response.text());
        
        // Try to directly insert data and let Supabase create the table
        logger.info('Trying direct insert to auto-create table...');
        
        // Try to insert data directly - might work depending on Supabase configuration
        const { error: insertError } = await supabase
          .from('scraped_websites')
          .insert({
            url: 'test.com',
            data: { test: true },
            status: 'pending'
          });
          
        if (insertError) {
          logger.error('Error inserting data:', insertError);
          
          // Last resort - send command to create a simple table without constraints
          logger.info('Last resort - attempting simplified approach...');
          
          // Use the Table API directly
          await fetch(supabaseUrl + '/rest/v1/scraped_websites', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              url: 'example.com',
              data: { created: 'from_api' },
              status: 'test'
            })
          }).then(async res => {
            if (!res.ok) {
              logger.error('Final attempt failed:', await res.text());
              return false;
            } else {
              logger.info('Table may have been created via direct insertion');
              return true;
            }
          });
        } else {
          logger.info('Successfully created table via insertion');
        }
      } else {
        const result = await response.json();
        logger.info('Table created successfully:', result);
      }
    } else if (checkError) {
      logger.error('Error checking table:', checkError);
    } else {
      logger.info('Table already exists!');
      
      // Insert test data to verify functionality
      logger.info('Inserting test data...');
      
      const { data, error } = await supabase
        .from('scraped_websites')
        .insert({
          url: 'test-script.com',
          data: { test: true, creation: 'success' },
          status: 'complete'
        })
        .select();
        
      if (error) {
        logger.error('Error inserting test data:', error);
      } else {
        logger.info('Test data inserted successfully:', data);
      }
    }
    
    // Final check - try to query the table
    logger.info('Final verification...');
    
    const { data: finalData, error: finalError } = await supabase
      .from('scraped_websites')
      .select('*')
      .limit(5);
      
    if (finalError) {
      logger.error('Final verification failed:', finalError);
    } else {
      logger.info('Table is accessible! Records found:', finalData.length);
      logger.info('Sample data:', finalData);
    }
    
    logger.info('Script completed');
    
  } catch (error) {
    logger.error('Unexpected error:', error);
  }
}

// Run the script
createTable(); 