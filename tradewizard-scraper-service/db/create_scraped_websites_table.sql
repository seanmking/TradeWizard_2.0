-- First, create the execute_sql function that can be used to run SQL from the JavaScript client
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
AS $$
BEGIN
  EXECUTE query;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Create the scraped_websites table
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

-- Create a policy that allows authenticated users to read data (optional)
CREATE POLICY auth_users_select_policy ON public.scraped_websites
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create an index on the url column for faster lookups
CREATE INDEX IF NOT EXISTS scraped_websites_url_idx ON public.scraped_websites(url);

-- Create an index on the status column
CREATE INDEX IF NOT EXISTS scraped_websites_status_idx ON public.scraped_websites(status);

-- Comment on the table and columns for documentation
COMMENT ON TABLE public.scraped_websites IS 'Stores information about websites that have been scraped by the TradeWizard Scraper Service';
COMMENT ON COLUMN public.scraped_websites.id IS 'Unique identifier for each scraped website';
COMMENT ON COLUMN public.scraped_websites.url IS 'URL of the scraped website';
COMMENT ON COLUMN public.scraped_websites.data IS 'JSON data extracted from the website';
COMMENT ON COLUMN public.scraped_websites.scraped_at IS 'Timestamp when the website was scraped';
COMMENT ON COLUMN public.scraped_websites.status IS 'Current status of the scraping process (pending, complete, error)';

-- Grant permissions to service_role
GRANT ALL ON public.scraped_websites TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.scraped_websites_id_seq TO service_role; 