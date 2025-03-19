-- TradeWizard Scraper Service Database Migration - v2 Export Readiness Enhancement
-- Run this script to update your existing database with new fields for export readiness assessment

-- Add new columns to the scraped_websites table if they don't exist
DO $$
BEGIN
    -- Add recommendations column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraped_websites' AND column_name = 'recommendations') THEN
        ALTER TABLE public.scraped_websites ADD COLUMN recommendations TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added recommendations column to scraped_websites table';
    END IF;
    
    -- Add target_markets column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraped_websites' AND column_name = 'target_markets') THEN
        ALTER TABLE public.scraped_websites ADD COLUMN target_markets TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added target_markets column to scraped_websites table';
    END IF;
    
    -- Add compliance_gaps column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraped_websites' AND column_name = 'compliance_gaps') THEN
        ALTER TABLE public.scraped_websites ADD COLUMN compliance_gaps TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added compliance_gaps column to scraped_websites table';
    END IF;
    
    -- Add certification_needs column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraped_websites' AND column_name = 'certification_needs') THEN
        ALTER TABLE public.scraped_websites ADD COLUMN certification_needs TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added certification_needs column to scraped_websites table';
    END IF;
    
    -- Add supply_chain_risks column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraped_websites' AND column_name = 'supply_chain_risks') THEN
        ALTER TABLE public.scraped_websites ADD COLUMN supply_chain_risks TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added supply_chain_risks column to scraped_websites table';
    END IF;
    
    -- Add market_entry_strategy column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scraped_websites' AND column_name = 'market_entry_strategy') THEN
        ALTER TABLE public.scraped_websites ADD COLUMN market_entry_strategy TEXT;
        RAISE NOTICE 'Added market_entry_strategy column to scraped_websites table';
    END IF;
END $$;

-- Create additional indexes for new columns
CREATE INDEX IF NOT EXISTS idx_scraped_websites_target_markets ON public.scraped_websites USING GIN (target_markets);
CREATE INDEX IF NOT EXISTS idx_scraped_websites_compliance_gaps ON public.scraped_websites USING GIN (compliance_gaps);
CREATE INDEX IF NOT EXISTS idx_scraped_websites_certification_needs ON public.scraped_websites USING GIN (certification_needs);

-- Update the export_readiness_assessment view to include new fields
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

-- Attempt to extract new fields from full_data JSON for existing records
UPDATE public.scraped_websites
SET
  recommendations = COALESCE(full_data->'recommendations', '[]')::TEXT[],
  target_markets = COALESCE(full_data->'targetMarkets', '[]')::TEXT[],
  compliance_gaps = COALESCE(full_data->'complianceGaps', '[]')::TEXT[],
  certification_needs = COALESCE(full_data->'certificationNeeds', '[]')::TEXT[],
  supply_chain_risks = COALESCE(full_data->'supplyChainRisks', '[]')::TEXT[],
  market_entry_strategy = COALESCE(full_data->>'marketEntryStrategy', NULL)
WHERE 
  full_data IS NOT NULL;

SELECT 'Database migration for enhanced export readiness completed successfully!' AS result; 