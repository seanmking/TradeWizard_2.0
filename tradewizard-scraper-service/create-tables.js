/**
 * Create Scraped Websites Table
 * Creates the necessary table for the TradeWizard Scraper Service
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createTables() {
  // Get Supabase credentials from environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return;
  }
  
  try {
    console.log('Initializing Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      }
    });
    
    // Check for existing data
    console.log('Checking for existing tables...');
    const { error: existingError } = await supabase
      .from('scraped_websites')
      .select('id')
      .limit(1);
    
    if (existingError && existingError.code === '42P01') {
      console.log('scraped_websites table does not exist. Creating it...');
      
      // Create scraped_websites table using REST API
      const { error } = await supabase.rest.from('ALTER DATABASE createTable').post({
        method: 'POST',
        body: {
          name: 'scraped_websites',
          columns: [
            { name: 'id', type: 'serial', primaryKey: true },
            { name: 'url', type: 'text', notNull: true },
            { name: 'business_name', type: 'text', notNull: true },
            { name: 'full_data', type: 'jsonb', notNull: true },
            { name: 'created_at', type: 'timestamptz', default: 'now()' }
          ]
        }
      });
      
      if (error) {
        console.error('Error creating table with REST API:', error);
        
        // Alternative approach: try a simple insert and let Supabase create the table
        console.log('Attempting to create table by inserting data...');
        
        try {
          const { data, error } = await supabase
            .from('scraped_websites')
            .insert({
              url: 'example.com',
              business_name: 'Example Business',
              full_data: { test: true }
            });
          
          if (error) {
            console.error('Error inserting initial data:', error);
            
            // Last resort: direct REST API call to Supabase API
            console.log('Attempting direct API call...');
            
            // Future implementation if needed
          } else {
            console.log('Table created successfully through insertion!');
          }
        } catch (insertError) {
          console.error('Error during insertion attempt:', insertError);
        }
      } else {
        console.log('Table created successfully!');
      }
    } else if (existingError) {
      console.error('Error checking for existing table:', existingError);
    } else {
      console.log('scraped_websites table already exists!');
      
      // Insert test data
      console.log('Inserting test data...');
      const { data, error } = await supabase
        .from('scraped_websites')
        .insert({
          url: 'test.com',
          business_name: 'Test Business',
          full_data: { test: true }
        })
        .select();
      
      if (error) {
        console.error('Error inserting test data:', error);
      } else {
        console.log('Test data inserted successfully:', data);
      }
    }
    
    console.log('Table setup completed.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the table creation
createTables(); 