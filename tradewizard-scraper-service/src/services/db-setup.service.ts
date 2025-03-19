import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service responsible for ensuring database tables exist
 * and are properly configured during application startup
 */
@Injectable()
export class DbSetupService implements OnModuleInit {
  private readonly logger = new Logger(DbSetupService.name);
  private supabaseClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Missing Supabase credentials');
      throw new Error('Missing Supabase credentials');
    }

    // Initialize with service role key for admin privileges
    this.supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /**
   * Runs when the NestJS module initializes
   * Checks and sets up database tables if needed
   */
  async onModuleInit() {
    this.logger.log('Initializing database setup service...');
    await this.setupDatabase();
  }

  /**
   * Main method that ensures all required tables exist
   */
  async setupDatabase() {
    try {
      this.logger.log('Checking if scraped_websites table exists...');
      const tableExists = await this.checkTableExists('scraped_websites');

      if (!tableExists) {
        this.logger.log('scraped_websites table does not exist. Creating it...');
        await this.createScrapedWebsitesTable();
      } else {
        this.logger.log('scraped_websites table already exists.');
      }
    } catch (error) {
      this.logger.error(`Error setting up database: ${error.message}`, error.stack);
      // Don't throw here, as we don't want to prevent app startup
      // Just log the error and proceed with caution
    }
  }

  /**
   * Checks if a table exists in the database
   * @param tableName Name of the table to check
   * @returns boolean indicating if the table exists
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      // Try to select from the table - if it doesn't exist, an error with code 42P01 will be thrown
      const { error } = await this.supabaseClient
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
      this.logger.warn(`Unexpected error checking if table exists: ${error.message}`);
      return false;
    } catch (error) {
      this.logger.error(`Error checking if table exists: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Creates the scraped_websites table
   * First tries to use the execute_sql RPC function
   * Falls back to direct SQL execution if that fails
   */
  private async createScrapedWebsitesTable(): Promise<void> {
    // Method 1: Try to use the execute_sql RPC function
    try {
      const { data, error } = await this.supabaseClient.rpc('execute_sql', {
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
        this.logger.warn(`Could not use execute_sql RPC: ${error.message}`);
      } else {
        this.logger.log('Successfully created scraped_websites table using execute_sql RPC');
        return;
      }
    } catch (error) {
      this.logger.warn(`Error using execute_sql RPC: ${error.message}`);
      // Continue to method 2
    }

    // Method 2: Try to create the table by running the SQL script file
    try {
      const sqlFilePath = path.join(__dirname, '../../db/create_scraped_websites_table.sql');
      
      if (fs.existsSync(sqlFilePath)) {
        this.logger.log(`Found SQL script at ${sqlFilePath}, executing it...`);
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        // If the Supabase instance supports RAW REST API calls
        // Note: This requires proper CORS configuration on the Supabase instance
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
        
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
        
        this.logger.log('Successfully created scraped_websites table using SQL script');
        return;
      } else {
        this.logger.warn(`SQL script not found at ${sqlFilePath}`);
      }
    } catch (error) {
      this.logger.error(`Error executing SQL script: ${error.message}`, error.stack);
    }
    
    // Method 3: Try a simple insert and let Supabase auto-create the table
    // This is a last resort and won't include indexes, comments, or RLS
    try {
      this.logger.log('Attempting to create table by inserting data (last resort)...');
      
      const { error } = await this.supabaseClient
        .from('scraped_websites')
        .insert({
          url: 'example.com',
          data: { test: true },
          status: 'test'
        });
      
      if (error && error.code !== '23505') { // Ignore unique constraint violations
        this.logger.error(`Error inserting initial data: ${error.message}`);
        throw error;
      }
      
      this.logger.log('Table may have been created through insertion');
    } catch (error) {
      this.logger.error(`Failed to create table using all methods: ${error.message}`, error.stack);
      throw new Error(`Could not create scraped_websites table: ${error.message}`);
    }
  }
} 