/**
 * Direct Database Setup Script
 * Runs SQL statements directly on Supabase to create necessary tables
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

async function runSetup() {
  logger.info('Starting direct database setup...');
  
  // Get Supabase credentials
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing Supabase credentials');
    process.exit(1);
  }
  
  try {
    // Read the SQL script
    const sqlFilePath = path.join(__dirname, 'db/create_scraped_websites_table.sql');
    if (!fs.existsSync(sqlFilePath)) {
      logger.error(`SQL file not found at ${sqlFilePath}`);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    logger.info(`Loaded SQL file from ${sqlFilePath}`);
    
    // Execute SQL directly using the REST API
    logger.info('Executing SQL statements directly...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sqlContent })
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      logger.error(`SQL execution failed: ${response.status} ${response.statusText}`);
      logger.error(`Response: ${responseText}`);
      process.exit(1);
    }
    
    logger.info('SQL execution completed successfully');
    
    // Try to query the table to confirm it exists
    logger.info('Verifying table creation...');
    
    const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/scraped_websites?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (verifyResponse.ok) {
      logger.info('Table exists and is accessible');
      
      // Insert a test row
      logger.info('Inserting test data...');
      
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/scraped_websites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          url: 'test-setup.com',
          data: { test: true, setup: 'success' },
          status: 'test'
        })
      });
      
      if (insertResponse.ok) {
        const insertResult = await insertResponse.json();
        logger.info(`Test data inserted: ${JSON.stringify(insertResult)}`);
      } else {
        const insertError = await insertResponse.text();
        logger.warn(`Test data insertion failed: ${insertError}`);
      }
    } else {
      const verifyError = await verifyResponse.text();
      logger.warn(`Table verification failed: ${verifyError}`);
    }
    
    logger.info('Database setup completed');
    process.exit(0);
  } catch (error) {
    logger.error(`Setup error: ${error.message}`, { error });
    process.exit(1);
  }
}

// Run the setup
runSetup(); 