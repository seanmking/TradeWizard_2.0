-- TradeWizard Scraper Service Database Schema
-- This schema creates a simplified structure for storing scraped website data

-- Table: scraped_websites
-- Stores website data with a JSONB column for flexible schema
CREATE TABLE IF NOT EXISTS scraped_websites (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  data JSONB,
  status TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for faster URL lookups
CREATE INDEX IF NOT EXISTS idx_scraped_websites_url ON scraped_websites(url);

-- Index for status-based queries
CREATE INDEX IF NOT EXISTS idx_scraped_websites_status ON scraped_websites(status);

-- Index for timestamp-based queries (recently updated, etc.)
CREATE INDEX IF NOT EXISTS idx_scraped_websites_scraped_at ON scraped_websites(scraped_at);

-- JSONB index for business name (commonly accessed field)
CREATE INDEX IF NOT EXISTS idx_scraped_websites_business_name ON scraped_websites((data->>'businessName'));

-- Comment explaining the adapter pattern
COMMENT ON TABLE scraped_websites IS 'Stores scraped website data using the adapter pattern with JSONB for schema flexibility';

-- Create business data view for easier reporting
CREATE OR REPLACE VIEW business_summary_view AS
SELECT
  id,
  url,
  data->>'businessName' AS business_name,
  data->>'businessSize' AS business_size,
  (data->>'exportReadiness')::INTEGER AS export_readiness,
  jsonb_array_length(COALESCE(data->'productDetails', '[]'::jsonb)) AS product_count,
  status,
  scraped_at
FROM
  scraped_websites;

-- Function to update the scraped_at timestamp
CREATE OR REPLACE FUNCTION update_scraped_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.scraped_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update scraped_at on update
CREATE TRIGGER update_scraped_at_trigger
BEFORE UPDATE ON scraped_websites
FOR EACH ROW
EXECUTE FUNCTION update_scraped_at();

-- Grant permissions (modify as needed based on your Supabase configuration)
ALTER TABLE scraped_websites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can read all scraped_websites data" ON scraped_websites FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can insert scraped_websites data" ON scraped_websites FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin can update scraped_websites data" ON scraped_websites FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can delete scraped_websites data" ON scraped_websites FOR DELETE USING (auth.role() = 'authenticated'); 