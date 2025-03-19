-- TradeWizard Scraper Service Database Setup Script for Supabase
-- Run this script in the Supabase SQL Editor to set up your database

-- Create tables for storing scraped website data and products
\i 'schema.sql'

-- Set up Row-Level Security (RLS)
-- Enable RLS on all tables
ALTER TABLE scraped_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

-- Default policies: Allow service role full access but restrict anonymous access

-- Create policies for scraped_websites
CREATE POLICY "Service role can read scraped_websites"
  ON scraped_websites FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert into scraped_websites"
  ON scraped_websites FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update scraped_websites"
  ON scraped_websites FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete from scraped_websites"
  ON scraped_websites FOR DELETE
  USING (auth.role() = 'service_role');

-- Anonymous users can only read specific data
CREATE POLICY "Anonymous users can read scraped_websites"
  ON scraped_websites FOR SELECT
  USING (true);

-- Create policies for website_products
CREATE POLICY "Service role can read website_products"
  ON website_products FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert into website_products"
  ON website_products FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update website_products"
  ON website_products FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete from website_products"
  ON website_products FOR DELETE
  USING (auth.role() = 'service_role');

-- Anonymous users can only read product data
CREATE POLICY "Anonymous users can read website_products"
  ON website_products FOR SELECT
  USING (true);

-- Create policies for scrape_jobs
CREATE POLICY "Service role can read scrape_jobs"
  ON scrape_jobs FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert into scrape_jobs"
  ON scrape_jobs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update scrape_jobs"
  ON scrape_jobs FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete from scrape_jobs"
  ON scrape_jobs FOR DELETE
  USING (auth.role() = 'service_role');

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_website_products_category ON website_products (category);
CREATE INDEX IF NOT EXISTS idx_scraped_websites_export_readiness ON scraped_websites (export_readiness);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status_created ON scrape_jobs (status, created_at);

-- Create additional indexes for new export readiness columns
CREATE INDEX IF NOT EXISTS idx_scraped_websites_target_markets ON scraped_websites USING GIN (target_markets);
CREATE INDEX IF NOT EXISTS idx_scraped_websites_compliance_gaps ON scraped_websites USING GIN (compliance_gaps);
CREATE INDEX IF NOT EXISTS idx_scraped_websites_certification_needs ON scraped_websites USING GIN (certification_needs);

-- Grant appropriate privileges to the anon and service roles
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role; 