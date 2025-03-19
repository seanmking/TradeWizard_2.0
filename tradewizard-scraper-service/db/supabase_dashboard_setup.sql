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

-- Grant permissions to service_role
GRANT ALL ON public.scraped_websites TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.scraped_websites_id_seq TO service_role;

-- Insert a test row
INSERT INTO public.scraped_websites (url, data, status)
VALUES 
  ('example.com', '{"test": true, "source": "dashboard_setup"}', 'test')
ON CONFLICT (url) DO NOTHING; 