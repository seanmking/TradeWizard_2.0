-- TradeWizard Scraper Service - Add Tables to Existing Supabase Project
-- Run this script in your existing Supabase project's SQL Editor

-- Check if tables already exist and only create them if they don't
DO $$
BEGIN
    -- Check if the scraped_websites table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scraped_websites') THEN
        -- Create the scraped_websites table if it doesn't exist
        CREATE TABLE public.scraped_websites (
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
          international_partnerships TEXT[] DEFAULT '{}',
          value_proposition TEXT,
          regulatory_compliance TEXT,
          supply_chain_info TEXT,
          minimum_order_quantities TEXT,
          shipping_capabilities TEXT,
          ecommerce_capabilities TEXT,
          languages_supported TEXT[] DEFAULT '{}',
          intellectual_property TEXT,
          innovation_capabilities TEXT,
          strengths TEXT[] DEFAULT '{}',
          weaknesses TEXT[] DEFAULT '{}',
          recommendations TEXT[] DEFAULT '{}',
          target_markets TEXT[] DEFAULT '{}',
          compliance_gaps TEXT[] DEFAULT '{}',
          certification_needs TEXT[] DEFAULT '{}',
          supply_chain_risks TEXT[] DEFAULT '{}',
          market_entry_strategy TEXT,
          full_data JSONB NOT NULL,
          last_scraped TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );

        -- Create indexes for the scraped_websites table
        CREATE INDEX idx_scraped_websites_url ON public.scraped_websites (url);
        CREATE INDEX idx_scraped_websites_business_name ON public.scraped_websites (business_name);
        CREATE INDEX idx_scraped_websites_last_scraped ON public.scraped_websites (last_scraped);
        CREATE INDEX idx_scraped_websites_export_readiness ON public.scraped_websites (export_readiness);
        CREATE INDEX idx_scraped_websites_industries ON public.scraped_websites USING GIN (industries);
        CREATE INDEX idx_scraped_websites_certifications ON public.scraped_websites USING GIN (certifications);
        
        RAISE NOTICE 'Created scraped_websites table and indexes';
    ELSE
        RAISE NOTICE 'scraped_websites table already exists, skipping creation';
        
        -- Add new columns if table exists but doesn't have the new columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraped_websites' AND column_name = 'recommendations') THEN
            ALTER TABLE public.scraped_websites ADD COLUMN recommendations TEXT[] DEFAULT '{}';
            RAISE NOTICE 'Added recommendations column to scraped_websites table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraped_websites' AND column_name = 'target_markets') THEN
            ALTER TABLE public.scraped_websites ADD COLUMN target_markets TEXT[] DEFAULT '{}';
            RAISE NOTICE 'Added target_markets column to scraped_websites table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraped_websites' AND column_name = 'compliance_gaps') THEN
            ALTER TABLE public.scraped_websites ADD COLUMN compliance_gaps TEXT[] DEFAULT '{}';
            RAISE NOTICE 'Added compliance_gaps column to scraped_websites table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraped_websites' AND column_name = 'certification_needs') THEN
            ALTER TABLE public.scraped_websites ADD COLUMN certification_needs TEXT[] DEFAULT '{}';
            RAISE NOTICE 'Added certification_needs column to scraped_websites table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraped_websites' AND column_name = 'supply_chain_risks') THEN
            ALTER TABLE public.scraped_websites ADD COLUMN supply_chain_risks TEXT[] DEFAULT '{}';
            RAISE NOTICE 'Added supply_chain_risks column to scraped_websites table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraped_websites' AND column_name = 'market_entry_strategy') THEN
            ALTER TABLE public.scraped_websites ADD COLUMN market_entry_strategy TEXT;
            RAISE NOTICE 'Added market_entry_strategy column to scraped_websites table';
        END IF;
    END IF;

    -- Check if the website_products table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'website_products') THEN
        -- Create the website_products table if it doesn't exist
        CREATE TABLE public.website_products (
          id SERIAL PRIMARY KEY,
          website_id INTEGER NOT NULL REFERENCES public.scraped_websites(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT DEFAULT 'General',
          confidence TEXT DEFAULT 'low',
          hs_code TEXT,
          pricing TEXT,
          specifications TEXT,
          image_urls TEXT[] DEFAULT '{}',
          certifications TEXT[] DEFAULT '{}',
          compliance_info TEXT,
          manufacturing_info TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );

        -- Create indexes for the website_products table
        CREATE INDEX idx_website_products_website_id ON public.website_products (website_id);
        CREATE INDEX idx_website_products_name ON public.website_products (name);
        CREATE INDEX idx_website_products_category ON public.website_products (category);
        CREATE INDEX idx_website_products_hs_code ON public.website_products (hs_code);
        
        RAISE NOTICE 'Created website_products table and indexes';
    ELSE
        RAISE NOTICE 'website_products table already exists, skipping creation';
    END IF;

    -- Check if the scrape_jobs table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scrape_jobs') THEN
        -- Create the scrape_jobs table if it doesn't exist
        CREATE TABLE public.scrape_jobs (
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

        -- Create indexes for the scrape_jobs table
        CREATE INDEX idx_scrape_jobs_url ON public.scrape_jobs (url);
        CREATE INDEX idx_scrape_jobs_status ON public.scrape_jobs (status);
        CREATE INDEX idx_scrape_jobs_created_at ON public.scrape_jobs (created_at);
        CREATE INDEX idx_scrape_jobs_status_created ON public.scrape_jobs (status, created_at);
        
        RAISE NOTICE 'Created scrape_jobs table and indexes';
    ELSE
        RAISE NOTICE 'scrape_jobs table already exists, skipping creation';
    END IF;

    -- Check if the api_usage_logs table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_usage_logs') THEN
        -- Create the api_usage_logs table if it doesn't exist
        CREATE TABLE public.api_usage_logs (
          id SERIAL PRIMARY KEY,
          api_name TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          tokens INTEGER NOT NULL DEFAULT 0,
          estimated_cost DECIMAL(10, 4) NOT NULL DEFAULT 0,
          operation TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );

        -- Create indexes for the api_usage_logs table
        CREATE INDEX idx_api_usage_logs_api_name ON public.api_usage_logs (api_name);
        CREATE INDEX idx_api_usage_logs_timestamp ON public.api_usage_logs (timestamp);
        
        RAISE NOTICE 'Created api_usage_logs table and indexes';
    ELSE
        RAISE NOTICE 'api_usage_logs table already exists, skipping creation';
    END IF;

    -- Create or replace the website_summaries view
    CREATE OR REPLACE VIEW public.website_summaries AS
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
      COALESCE(array_length(sw.international_partnerships, 1), 0) AS partnership_count,
      (SELECT COUNT(*) FROM public.website_products wp WHERE wp.website_id = sw.id) AS product_count,
      sw.last_scraped,
      sw.created_at
    FROM 
      public.scraped_websites sw
    ORDER BY 
      sw.last_scraped DESC;

    RAISE NOTICE 'Created or replaced website_summaries view';

    -- Create a view for export readiness assessment
    CREATE OR REPLACE VIEW public.export_readiness_assessment AS
    SELECT
      sw.id,
      sw.url,
      sw.business_name,
      sw.export_readiness,
      CASE
        WHEN sw.export_readiness >= 80 THEN 'High'
        WHEN sw.export_readiness >= 50 THEN 'Medium'
        ELSE 'Low'
      END AS readiness_level,
      COALESCE(array_length(sw.export_markets, 1), 0) > 0 AS has_export_experience,
      COALESCE(array_length(sw.certifications, 1), 0) > 0 AS has_certifications,
      sw.ecommerce_capabilities IS NOT NULL AS has_ecommerce,
      sw.shipping_capabilities IS NOT NULL AS has_shipping_capabilities,
      sw.languages_supported IS NOT NULL AND array_length(sw.languages_supported, 1) > 1 AS has_multilingual_support,
      sw.strengths,
      sw.weaknesses,
      sw.recommendations,
      sw.target_markets,
      sw.compliance_gaps,
      sw.certification_needs,
      sw.supply_chain_risks,
      sw.market_entry_strategy,
      sw.last_scraped
    FROM
      public.scraped_websites sw;

    RAISE NOTICE 'Created or replaced export_readiness_assessment view';

    -- Create or replace the last_scraped update function and trigger
    CREATE OR REPLACE FUNCTION public.update_last_scraped()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.last_scraped = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Drop the trigger if it exists
    DROP TRIGGER IF EXISTS update_last_scraped_trigger ON public.scraped_websites;

    -- Create the trigger
    CREATE TRIGGER update_last_scraped_trigger
    BEFORE UPDATE ON public.scraped_websites
    FOR EACH ROW
    EXECUTE FUNCTION public.update_last_scraped();

    RAISE NOTICE 'Created or replaced last_scraped update function and trigger';

END $$;

-- Set RLS policies if needed (uncomment and modify according to your security needs)
/*
-- Enable RLS on tables
ALTER TABLE public.scraped_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust as needed)
CREATE POLICY "Allow authenticated users to read scraped_websites"
ON public.scraped_websites FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow service role to manage scraped_websites"
ON public.scraped_websites FOR ALL
TO service_role
USING (true);
*/

SELECT 'TradeWizard Scraper Service tables have been added to your Supabase project!' AS result; 