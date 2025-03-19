/**
 * Test Database Script
 * Tests Supabase connectivity with a simple table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

async function testDatabase() {
  // Get Supabase credentials from environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return;
  }
  
  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');
    
    // Test 1: Create a test table for our scraper data
    console.log('\nTest 1: Creating a test table');
    try {
      const { data: createData, error: createError } = await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS test_table (
            id SERIAL PRIMARY KEY,
            name TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      });
      
      if (createError) {
        console.error('Error creating table:', createError);
        
        // Try direct SQL query if RPC fails
        console.log('Attempting to create table directly...');
        const { data, error } = await supabase
          .from('scraped_websites')
          .select('id')
          .limit(1);
          
        if (error) {
          if (error.code === '42P01') {
            console.log('Table does not exist.');
          } else {
            console.error('Error checking table existence:', error);
          }
        } else {
          console.log('Table already exists!');
        }
      } else {
        console.log('Table created successfully!');
      }
    } catch (error) {
      console.error('Test 1 failed:', error.message);
    }
    
    console.log('\nTest 2: Creating scraped_websites table');
    try {
      const { data: createData, error: createError } = await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS scraped_websites (
            id SERIAL PRIMARY KEY,
            url TEXT NOT NULL,
            business_name TEXT NOT NULL,
            full_data JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      });
      
      if (createError) {
        console.error('Error creating scraped_websites table:', createError);
      } else {
        console.log('scraped_websites table created successfully!');
      }
    } catch (error) {
      console.error('Test 2 failed:', error.message);
    }
    
    console.log('\nTest 3: Inserting data with upsert');
    try {
      const { data, error } = await supabase
        .from('scraped_websites')
        .upsert({ 
          url: 'test.com', 
          business_name: 'Test Business',
          full_data: { test: true }
        })
        .select();
      
      if (error) {
        console.error('Error inserting data:', error);
      } else {
        console.log('Data inserted successfully:', data);
      }
    } catch (error) {
      console.error('Test 3 failed:', error.message);
    }
    
    console.log('\nTest 4: Querying data');
    try {
      const { data, error } = await supabase
        .from('scraped_websites')
        .select('*')
        .limit(5);
      
      if (error) {
        console.error('Error querying data:', error);
      } else {
        console.log('Data queried successfully:', data);
      }
    } catch (error) {
      console.error('Test 4 failed:', error.message);
    }
    
    console.log('\nDatabase tests completed');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the test
testDatabase(); 