/**
 * Database Inspection Script
 * Lists tables and their schemas in the Supabase database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function inspectDatabase() {
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
    
    // Get list of tables in the database
    console.log('\nInspecting database structure:');
    
    // First try to run a simple query to test connection
    try {
      const { data: testData, error: testError } = await supabase
        .from('_prisma_migrations')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.log('Test query failed:', testError);
      } else {
        console.log('Connection successful!');
        console.log('Sample data from _prisma_migrations:', testData);
      }
    } catch (error) {
      console.error('Connection test failed:', error.message);
    }
    
    // Try with public schema
    try {
      const { data: testData, error: testError } = await supabase
        .from('auth.users')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.log('Auth users query failed:', testError);
      } else {
        console.log('Auth query successful!');
        console.log('Sample data from auth.users:', testData);
      }
    } catch (error) {
      console.error('Auth query failed:', error.message);
    }
    
    // List all tables
    try {
      console.log('\nListing tables from information_schema:');
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_schema,table_name')
        .eq('table_schema', 'public');
      
      if (error) {
        console.error('Error listing tables:', error);
      } else {
        console.log('Tables in public schema:');
        console.table(data);
      }
    } catch (error) {
      console.error('Error listing tables:', error.message);
    }
    
    // Try to access PostgreSQL system tables with special format
    try {
      console.log('\nTrying to list extensions:');
      const { data, error } = await supabase
        .from('pg_extension')
        .select('*');
      
      if (error) {
        console.error('Error listing extensions:', error);
      } else {
        console.log('Extensions:');
        console.table(data);
      }
    } catch (error) {
      console.error('Error listing extensions:', error.message);
    }
    
    console.log('\nDatabase inspection completed');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the inspection
inspectDatabase(); 