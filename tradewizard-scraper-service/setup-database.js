/**
 * Database Setup Script
 * Sets up the database schema for the TradeWizard Scraper Service
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

/**
 * Main function to set up the database
 */
async function setupDatabase() {
  try {
    logger.info('Initializing database connection...');
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logger.error('Missing Supabase credentials');
      throw new Error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    
    // Initialize the Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    logger.info('Starting database setup...');
    
    // Read the schema SQL file
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      logger.error(`Schema file not found at: ${schemaPath}`);
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the SQL commands using the Supabase client's rpc method
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: schemaSql
    });
    
    if (error) {
      logger.error('Error executing SQL', error);
      throw error;
    }
    
    logger.info('Database setup completed successfully!');
    console.log('✅ Database tables and indexes created successfully!');
    
    // Print additional information about the schema
    console.log('\nCreated database objects:');
    console.log('- Table: scraped_websites (with JSONB data column)');
    console.log('- View: business_summary_view');
    console.log('- Indexes on: url, status, scraped_at, businessName');
    console.log('- Update trigger for scraped_at timestamp');
    console.log('\nThe database is now ready to use with the adapter pattern.');
    
  } catch (error) {
    logger.error('Error setting up database', error);
    console.error('❌ Error setting up database:', error.message);
    console.error('\nPossible solutions:');
    console.error('1. Check that your Supabase credentials are correct');
    console.error('2. Verify that your Supabase project has the exec_sql RPC function enabled');
    console.error('3. Try setting up the database manually using the SQL in db/schema.sql');
    console.error('\nFor manual setup:');
    console.error('1. Go to your Supabase project dashboard');
    console.error('2. Open the SQL Editor');
    console.error('3. Copy the contents of db/schema.sql');
    console.error('4. Paste and execute the SQL in the editor');
    
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase }; 