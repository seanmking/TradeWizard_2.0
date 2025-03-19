/**
 * Database Setup Script
 * Creates the scraped_websites table in Supabase if it doesn't exist
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Sets up the database tables required for the scraper service
 */
async function setupDatabase() {
  // Get Supabase credentials from environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing Supabase credentials');
    return false;
  }
  
  try {
    logger.info('Initializing database setup...');
    // Initialize with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // Check if scraped_websites table exists
    logger.info('Checking if scraped_websites table exists...');
    const tableExists = await checkTableExists(supabase, 'scraped_websites');
    
    if (!tableExists) {
      logger.info('scraped_websites table does not exist. Creating it...');
      await createScrapedWebsitesTable(supabase, supabaseUrl, supabaseKey);
    } else {
      logger.info('scraped_websites table already exists.');
    }
    
    return true;
  } catch (error) {
    logger.error(`Error setting up database: ${error.message}`, { error });
    return false;
  }
}

/**
 * Checks if a table exists in the database
 * @param {SupabaseClient} supabase Supabase client
 * @param {string} tableName Name of the table to check
 * @returns {Promise<boolean>} Boolean indicating if the table exists
 */
async function checkTableExists(supabase, tableName) {
  try {
    // Try to select from the table - if it doesn't exist, an error with code 42P01 will be thrown
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    // No error means the table exists
    if (!error) {
      return true;
    }
    
    // If error code is 42P01, table doesn't exist
    if (error.code === '42P01') {
      return false;
    }
    
    // Any other error - log and assume table doesn't exist to be safe
    logger.warn(`Unexpected error checking if table exists: ${error.message}`);
    return false;
  } catch (error) {
    logger.error(`Error checking if table exists: ${error.message}`, { error });
    return false;
  }
}

/**
 * Creates the scraped_websites table
 * First tries to use the execute_sql RPC function
 * Falls back to direct SQL execution if that fails
 * @param {SupabaseClient} supabase Supabase client
 * @param {string} supabaseUrl Supabase URL
 * @param {string} supabaseKey Supabase service role key
 */
async function createScrapedWebsitesTable(supabase, supabaseUrl, supabaseKey) {
  // Method 1: Try to use the execute_sql RPC function
  try {
    logger.info('Attempting to create table using execute_sql RPC...');
    const { data, error } = await supabase.rpc('execute_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.scraped_websites (
          id SERIAL PRIMARY KEY,
          url TEXT NOT NULL,
          data JSONB NOT NULL,
          scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'pending',
          UNIQUE(url)
        );
        
        -- Enable Row Level Security
        ALTER TABLE public.scraped_websites ENABLE ROW LEVEL SECURITY;
        
        -- Create a policy that allows service roles to perform all operations
        CREATE POLICY service_role_policy ON public.scraped_websites
          FOR ALL
          USING (auth.role() = 'service_role')
          WITH CHECK (auth.role() = 'service_role');
          
        -- Create indices
        CREATE INDEX IF NOT EXISTS scraped_websites_url_idx ON public.scraped_websites(url);
        CREATE INDEX IF NOT EXISTS scraped_websites_status_idx ON public.scraped_websites(status);
      `
    });
    
    if (error) {
      // If execute_sql function doesn't exist, log the error but don't throw
      // We'll try method 2 instead
      logger.warn(`Could not use execute_sql RPC: ${error.message}`);
    } else {
      logger.info('Successfully created scraped_websites table using execute_sql RPC');
      return;
    }
  } catch (error) {
    logger.warn(`Error using execute_sql RPC: ${error.message}`);
    // Continue to method 2
  }
  
  // Method 2: Try to create the table by running the SQL script file
  try {
    const sqlFilePath = path.join(__dirname, './db/create_scraped_websites_table.sql');
    
    if (fs.existsSync(sqlFilePath)) {
      logger.info(`Found SQL script at ${sqlFilePath}, executing it...`);
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      
      // Use fetch API to call the Supabase SQL endpoint
      const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ query: sqlContent })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SQL execution failed: ${errorText}`);
      }
      
      logger.info('Successfully created scraped_websites table using SQL script');
      return;
    } else {
      logger.warn(`SQL script not found at ${sqlFilePath}`);
    }
  } catch (error) {
    logger.error(`Error executing SQL script: ${error.message}`, { error });
  }
  
  // Method 3: Try a simple insert and let Supabase auto-create the table
  // This is a last resort and won't include indexes, comments, or RLS
  try {
    logger.info('Attempting to create table by inserting data (last resort)...');
    
    const { error } = await supabase
      .from('scraped_websites')
      .insert({
        url: 'example.com',
        data: { test: true },
        status: 'test'
      });
    
    if (error && error.code !== '23505') { // Ignore unique constraint violations
      logger.error(`Error inserting initial data: ${error.message}`);
      throw error;
    }
    
    logger.info('Table may have been created through insertion');
  } catch (error) {
    logger.error(`Failed to create table using all methods: ${error.message}`, { error });
    throw new Error(`Could not create scraped_websites table: ${error.message}`);
  }
}

// Export the setup function
module.exports = { setupDatabase }; 