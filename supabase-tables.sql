-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enhanced Regulatory Compliance Requirements
DROP TABLE IF EXISTS compliance_requirements CASCADE;
CREATE TABLE compliance_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT NOT NULL,                      -- ISO country code
  industry TEXT NOT NULL,                          -- Industry sector
  hs_code TEXT,                                    -- Harmonized System code
  requirement_name TEXT NOT NULL,                  -- Name of requirement
  requirement_description TEXT,                    -- Detailed description
  required BOOLEAN DEFAULT true,                   -- Whether mandatory
  documentation_link TEXT,                         -- URL to official docs
  
  -- Enhanced fields for South African exporters
  issuing_authority TEXT,                          -- Authority that issues certification
  estimated_processing_time_days INTEGER,          -- Typical processing time
  estimated_cost_zar DECIMAL(10,2),                -- Approximate cost in Rand
  documentation_language TEXT,                     -- Required language
  validity_period_months INTEGER,                  -- How long certification is valid
  renewal_process TEXT,                            -- Renewal procedure
  legal_reference TEXT,                            -- Applicable regulation
  verification_method TEXT,                        -- How compliance is verified
  priority_level INTEGER,                          -- Importance ranking (1-5)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(country_code, industry, hs_code, requirement_name)
);

-- 2. Comprehensive Tariff Data Structure
DROP TABLE IF EXISTS tariff_data CASCADE;
CREATE TABLE tariff_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  importing_country_code TEXT NOT NULL,           -- Importing country
  hs_code TEXT NOT NULL,                          -- Harmonized System code
  exporting_country_code TEXT NOT NULL DEFAULT 'ZA', -- South Africa as exporter
  tariff_rate DECIMAL(10,2),                      -- Base tariff percentage
  tariff_type TEXT,                               -- MFN, preferential, etc.
  trade_agreement TEXT,                           -- Applicable agreement
  
  -- Enhanced fields for South African exporters
  certificate_of_origin_required BOOLEAN DEFAULT false,
  rules_of_origin_text TEXT,                      -- Origin requirements
  quota_limit DECIMAL(15,2),                      -- Quota amount if applicable
  quota_unit TEXT,                                -- Unit of measurement
  quota_period TEXT,                              -- Annual, quarterly, etc.
  non_tariff_measures TEXT[],                     -- Array of NTMs
  safeguard_measures TEXT,                        -- Any safeguard measures
  specific_duty_amount DECIMAL(10,2),             -- Fixed amount per unit
  specific_duty_unit TEXT,                        -- Unit for specific duty
  vat_rate DECIMAL(5,2),                          -- Import VAT/taxes
  documentation_requirements TEXT[],              -- Required documents
  
  effective_date DATE,                            -- When tariff starts
  expiry_date DATE,                               -- When tariff ends
  data_source TEXT,                               -- Source of data
  last_verified_date DATE,                        -- Verification date
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(importing_country_code, exporting_country_code, hs_code)
);

-- 3. South African Industry-Specific Classifications
DROP TABLE IF EXISTS sa_industry_classifications CASCADE;
CREATE TABLE sa_industry_classifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,                              -- Industry code
  industry_name TEXT NOT NULL,                     -- Full name
  classification_system TEXT NOT NULL,             -- SETAS, SIC, etc.
  export_priority_sector BOOLEAN DEFAULT FALSE,    -- Priority in NEDP
  
  -- South African export-specific fields
  regulatory_authority TEXT,                       -- Primary regulator
  required_certifications TEXT[],                  -- Mandatory certs
  supported_by_emia BOOLEAN DEFAULT FALSE,         -- EMIA support
  dtic_sector_desk TEXT,                           -- DTIC sector desk
  export_councils TEXT[],                          -- Related councils
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(classification_system, code)
);

-- 4. Standardized Compliance Documentation Storage
DROP TABLE IF EXISTS compliance_documentation CASCADE;
CREATE TABLE compliance_documentation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requirement_id UUID REFERENCES compliance_requirements(id),
  document_type TEXT NOT NULL,                     -- Certificate, permit, etc.
  document_template_url TEXT,                      -- Template location
  application_procedure TEXT,                      -- How to apply
  required_supporting_documents TEXT[],            -- Supporting docs
  
  -- Documentation specifics
  processing_fees TEXT,                            -- Fee information
  digital_submission_available BOOLEAN DEFAULT FALSE,
  digital_submission_url TEXT,                     -- Online application URL
  document_format TEXT,                            -- Required format
  contact_information JSONB,                       -- Contact details
  submission_checklist TEXT[],                     -- Required steps
  common_rejection_reasons TEXT[],                 -- Frequent issues
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. User Compliance Progress Tracking
DROP TABLE IF EXISTS user_compliance_progress CASCADE;
CREATE TABLE user_compliance_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References users(id) ON DELETE CASCADE - will add FK once users table exists
  requirement_id UUID NOT NULL REFERENCES compliance_requirements(id),
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'submitted', 'approved', 'rejected')),
  
  -- Progress tracking fields
  application_date DATE,                           -- Submission date
  approval_date DATE,                              -- Approval date
  expiry_date DATE,                                -- Document expiry
  reference_number TEXT,                           -- Tracking number
  document_storage_path TEXT,                      -- Document location
  rejection_reason TEXT,                           -- If rejected
  notes TEXT,                                      -- User notes
  next_action TEXT,                                -- Next step
  next_action_deadline DATE,                       -- Deadline date
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert Real-World Examples into compliance_requirements
INSERT INTO compliance_requirements (
  id, country_code, industry, hs_code, requirement_name, requirement_description, 
  required, documentation_link, issuing_authority, estimated_processing_time_days, 
  estimated_cost_zar, documentation_language, validity_period_months, renewal_process, 
  legal_reference, verification_method, priority_level
) VALUES (
  '7c98b212-32de-4abc-a26f-13c6c45e83fa', 
  'GB', 
  'Food & Beverage', 
  '2204.21', 
  'VI-1 Document for Wine Export', 
  'Official document for wine products certifying compliance with UK regulations and wine standards post-Brexit.',
  true,
  'https://www.gov.uk/guidance/importing-and-exporting-wine',
  'Department of Agriculture, Land Reform and Rural Development',
  14,
  1250.00,
  'English',
  12,
  'New application required for each shipment',
  'UK Wine Regulations 2021; SAWIS Regulations',
  'Laboratory analysis and documentary verification',
  1
);

-- Additional examples for other countries/industries
INSERT INTO compliance_requirements (
  country_code, industry, hs_code, requirement_name, requirement_description, 
  required, documentation_link, issuing_authority, estimated_processing_time_days, 
  estimated_cost_zar, documentation_language, validity_period_months, renewal_process, 
  legal_reference, verification_method, priority_level
) VALUES 
(
  'US', 
  'Food & Beverage', 
  '2008.99', 
  'FDA Food Facility Registration', 
  'Registration required for all food facilities exporting to the US market.',
  true,
  'https://www.fda.gov/food/guidance-regulation-food-and-dietary-supplements/registration-food-facilities-and-other-submissions',
  'US Food and Drug Administration',
  5,
  0.00,
  'English',
  24,
  'Biennial renewal required',
  'Food Safety Modernization Act (FSMA)',
  'Online registration verification',
  1
),
(
  'EU', 
  'Textiles', 
  '6204.62', 
  'REACH Compliance', 
  'Chemical safety compliance for textiles entering the EU market.',
  true,
  'https://echa.europa.eu/regulations/reach/understanding-reach',
  'European Chemicals Agency (ECHA)',
  30,
  15000.00,
  'English',
  36,
  'Testing required for new product lines',
  'EU Regulation 1907/2006 (REACH)',
  'Laboratory testing and technical documentation',
  2
);

-- Insert Real-World Examples into tariff_data
INSERT INTO tariff_data (
  id, importing_country_code, hs_code, exporting_country_code, tariff_rate, 
  tariff_type, trade_agreement, certificate_of_origin_required, 
  rules_of_origin_text, quota_limit, quota_unit, quota_period, 
  non_tariff_measures, safeguard_measures, specific_duty_amount, 
  specific_duty_unit, vat_rate, documentation_requirements, 
  effective_date, expiry_date, data_source, last_verified_date
) VALUES (
  '9e71f890-c5d4-42e8-a86b-bc98e6f432c1',
  'AE',
  '0805.10',
  'ZA',
  0.00,
  'MFN',
  'GCC-SACU FTA',
  true,
  'Wholly obtained or minimum 40% local content value',
  NULL,
  NULL,
  NULL,
  ARRAY['Phytosanitary Certificate', 'Halal Certificate'],
  NULL,
  NULL,
  NULL,
  5.00,
  ARRAY['Certificate of Origin', 'Phytosanitary Certificate', 'Commercial Invoice', 'Packing List'],
  '2021-01-01',
  NULL,
  'Dubai Customs',
  '2023-10-15'
);

-- Additional examples for other countries/products
INSERT INTO tariff_data (
  importing_country_code, hs_code, exporting_country_code, tariff_rate, 
  tariff_type, trade_agreement, certificate_of_origin_required, 
  rules_of_origin_text, quota_limit, quota_unit, quota_period, 
  non_tariff_measures, safeguard_measures, specific_duty_amount, 
  specific_duty_unit, vat_rate, documentation_requirements, 
  effective_date, expiry_date, data_source, last_verified_date
) VALUES 
(
  'US',
  '2204.21',
  'ZA',
  0.00,
  'GSP',
  'AGOA',
  true,
  'Wholly obtained or substantially transformed in South Africa',
  NULL,
  NULL,
  NULL,
  ARRAY['FDA Registration', 'TTB Import Approval'],
  NULL,
  0.00,
  NULL,
  0.00,
  ARRAY['Certificate of Origin', 'Commercial Invoice', 'Packing List', 'Bill of Lading', 'TTB Import Certificate'],
  '2022-01-01',
  '2025-12-31',
  'US International Trade Commission',
  '2024-01-10'
),
(
  'EU',
  '6204.62',
  'ZA',
  0.00,
  'Preferential',
  'EU-SADC EPA',
  true,
  'Fabrics must be woven in South Africa or SADC EPA countries',
  NULL,
  NULL,
  NULL,
  ARRAY['REACH Compliance', 'Product Safety Documentation'],
  NULL,
  NULL,
  NULL,
  20.00,
  ARRAY['EUR.1 Certificate', 'Commercial Invoice', 'Packing List', 'Bill of Lading', 'REACH Compliance Declaration'],
  '2022-01-01',
  NULL,
  'European Commission Market Access Database',
  '2023-11-20'
);

-- Insert South African Industry Classification Example
INSERT INTO sa_industry_classifications (
  id, code, industry_name, classification_system, export_priority_sector,
  regulatory_authority, required_certifications, supported_by_emia,
  dtic_sector_desk, export_councils
) VALUES (
  'dc74e8b1-9f7a-4ba3-b642-a91d2e99b9a7',
  'AGROFD',
  'Agro-Processing: Food and Beverages',
  'DTIC',
  true,
  'Department of Agriculture, Land Reform and Rural Development',
  ARRAY['HACCP', 'FSSC 22000', 'PPECB Export Certification'],
  true,
  'Agro-Processing Desk',
  ARRAY['South African Fruit & Vegetable Exporters'' Council', 'Wine Industry Network of Expertise and Technology']
);

-- Additional industry classifications
INSERT INTO sa_industry_classifications (
  code, industry_name, classification_system, export_priority_sector,
  regulatory_authority, required_certifications, supported_by_emia,
  dtic_sector_desk, export_councils
) VALUES 
(
  'TEXCLO',
  'Textiles and Clothing',
  'DTIC',
  true,
  'Department of Trade, Industry and Competition',
  ARRAY['SA Bureau of Standards Certification', 'ISO 9001'],
  true,
  'Textiles, Clothing, Leather and Footwear Desk',
  ARRAY['Apparel and Textile Association of South Africa']
),
(
  'AUTCOM',
  'Automotive Components',
  'DTIC',
  true,
  'Department of Trade, Industry and Competition',
  ARRAY['ISO/TS 16949', 'ISO 9001'],
  true,
  'Automotive Desk',
  ARRAY['National Association of Automotive Component and Allied Manufacturers']
);

-- Insert Compliance Documentation Example
INSERT INTO compliance_documentation (
  id, requirement_id, document_type, document_template_url, application_procedure,
  required_supporting_documents, processing_fees, digital_submission_available,
  digital_submission_url, document_format, contact_information, submission_checklist,
  common_rejection_reasons
) VALUES (
  '3f5a9d27-7c41-4628-9c19-8876e3b2a7f0',
  '7c98b212-32de-4abc-a26f-13c6c45e83fa',
  'Certificate',
  'https://www.dalrrd.gov.za/forms/VI-1-template.pdf',
  'Submit via PPECB online portal with lab analysis results. In-person submission available at DALRRD offices.',
  ARRAY['Laboratory analysis from SANAS accredited lab', 'SAWIS certificate', 'Commercial invoice', 'Proof of payment'],
  'R1250 per application',
  true,
  'https://ppecbportal.co.za/wine-export',
  'Original with stamps',
  '{"department": "Wine Export Certification", "email": "wineexport@dalrrd.gov.za", "phone": "+27 21 809 1688"}',
  ARRAY['Complete VI-1 form with all sections filled', 'Attach lab analysis results', 'Include payment confirmation', 'Submit at least 14 days before shipment'],
  ARRAY['Incomplete laboratory analysis', 'Missing SAWIS certification', 'Incorrect wine details']
);

-- Additional documentation examples
INSERT INTO compliance_documentation (
  requirement_id, document_type, document_template_url, application_procedure,
  required_supporting_documents, processing_fees, digital_submission_available,
  digital_submission_url, document_format, contact_information, submission_checklist,
  common_rejection_reasons
) VALUES 
(
  (SELECT id FROM compliance_requirements WHERE country_code = 'US' AND hs_code = '2008.99' LIMIT 1),
  'Registration',
  'https://www.fda.gov/food/online-registration-food-facilities',
  'Complete online FDA Food Facility Registration through FDA Industry Systems (FIS).',
  ARRAY['Company information', 'US Agent details', 'Emergency contact information'],
  'Free',
  true,
  'https://www.access.fda.gov/',
  'Electronic',
  '{"department": "FDA FURLS Helpdesk", "email": "FURLS@fda.gov", "phone": "+1 800 216 7331"}',
  ARRAY['Create FDA.gov account', 'Complete all required fields', 'Provide US Agent information', 'Submit biennial renewal on time'],
  ARRAY['Missing US Agent information', 'Incomplete company details', 'Failure to complete biennial renewal']
); 