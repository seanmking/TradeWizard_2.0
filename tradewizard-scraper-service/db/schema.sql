-- TradeWizard Scraper Service Database Schema

-- Create tables for storing scraped website data and products
-- This schema is designed for Supabase/PostgreSQL

-- Table for scraped websites
CREATE TABLE IF NOT EXISTS scraped_websites (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL DEFAULT 'Unknown Business',
  business_size TEXT NOT NULL DEFAULT 'small',
  description TEXT,
  founded_year INTEGER,
  employee_count INTEGER,
  customer_segments TEXT[] DEFAULT '{}',
  product_categories TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  geographic_presence TEXT[] DEFAULT '{}',
  export_readiness INTEGER DEFAULT 50,
  export_markets TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  b2b_focus INTEGER DEFAULT 50,
  full_data JSONB NOT NULL,  -- Store the complete scraped data as JSON
  last_scraped TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create an index on the URL for faster lookups
CREATE INDEX IF NOT EXISTS idx_scraped_websites_url ON scraped_websites (url);
CREATE INDEX IF NOT EXISTS idx_scraped_websites_business_name ON scraped_websites (business_name);
CREATE INDEX IF NOT EXISTS idx_scraped_websites_last_scraped ON scraped_websites (last_scraped);

-- Table for products associated with websites
CREATE TABLE IF NOT EXISTS website_products (
  id SERIAL PRIMARY KEY,
  website_id INTEGER NOT NULL REFERENCES scraped_websites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  confidence TEXT DEFAULT 'low',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for the products table
CREATE INDEX IF NOT EXISTS idx_website_products_website_id ON website_products (website_id);
CREATE INDEX IF NOT EXISTS idx_website_products_name ON website_products (name);

-- Table for storing scrape jobs and their status
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  options JSONB,
  result JSONB,
  error TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for the jobs table
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_url ON scrape_jobs (url);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs (status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_at ON scrape_jobs (created_at);

-- View for quick access to website summaries
CREATE OR REPLACE VIEW website_summaries AS
SELECT 
  sw.id,
  sw.url,
  sw.business_name,
  sw.business_size,
  sw.export_readiness,
  COALESCE(array_length(sw.certifications, 1), 0) AS certification_count,
  COALESCE(array_length(sw.geographic_presence, 1), 0) AS location_count,
  COALESCE(array_length(sw.export_markets, 1), 0) AS export_market_count,
  COALESCE(array_length(sw.industries, 1), 0) AS industry_count,
  (SELECT COUNT(*) FROM website_products wp WHERE wp.website_id = sw.id) AS product_count,
  sw.last_scraped,
  sw.created_at
FROM 
  scraped_websites sw
ORDER BY 
  sw.last_scraped DESC;

-- Function to update the last_scraped timestamp
CREATE OR REPLACE FUNCTION update_last_scraped()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_scraped = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_scraped on update
CREATE TRIGGER update_last_scraped_trigger
BEFORE UPDATE ON scraped_websites
FOR EACH ROW
EXECUTE FUNCTION update_last_scraped(); 