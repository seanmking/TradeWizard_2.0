import express, { Request, Response, NextFunction, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Define custom type for route handlers
type RouteHandler = (req: Request, res: Response, next?: NextFunction) => Promise<any>;

// Create router instance
const router: Router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Debug endpoint to list all tables in the database
const listTables: RouteHandler = async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('list_tables');
    
    if (error) throw error;
    
    return res.status(200).json({
      status: 'success',
      data: data || []
    });
  } catch (error: any) {
    console.error('Error listing tables:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to list tables'
    });
  }
};

// Debug endpoint to run a raw query
const runRawQuery: RouteHandler = async (req, res) => {
  try {
    const { query } = req.params;
    const decodedQuery = decodeURIComponent(query);
    
    console.log(`Running raw query: ${decodedQuery}`);
    
    const { data, error } = await supabase.rpc('run_query', { query_text: decodedQuery });
    
    if (error) throw error;
    
    return res.status(200).json({
      status: 'success',
      data: data || []
    });
  } catch (error: any) {
    console.error('Error running raw query:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to run query'
    });
  }
};

// Get export requirements for a specific country and industry
const getExportRequirements: RouteHandler = async (req, res) => {
  try {
    const { country, industry } = req.params;
    
    // Log for debugging
    console.log(`Fetching export requirements for country: ${country}, industry: ${industry}`);
    
    // Query using the enhanced compliance_requirements table
    const { data, error } = await supabase
      .from('compliance_requirements')
      .select(`
        id,
        country_code,
        industry,
        hs_code,
        requirement_name,
        requirement_description,
        required,
        documentation_link,
        issuing_authority,
        estimated_processing_time_days,
        estimated_cost_zar,
        documentation_language,
        validity_period_months,
        renewal_process,
        legal_reference,
        verification_method,
        priority_level
      `)
      .eq('country_code', country)
      .eq('industry', industry);
    
    if (error) throw error;
    
    return res.status(200).json({
      status: 'success',
      data: data || []
    });
  } catch (error: any) {
    console.error('Error fetching export requirements:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch export requirements'
    });
  }
};

// Get tariff information for a specific country and HS code
const getTariffInformation: RouteHandler = async (req, res) => {
  try {
    const { country, hsCode } = req.params;
    
    // Log for debugging
    console.log(`Fetching tariff information for country: ${country}, HS code: ${hsCode}`);
    
    // Query using the enhanced tariff_data table
    const { data, error } = await supabase
      .from('tariff_data')
      .select(`
        id,
        importing_country_code,
        hs_code,
        exporting_country_code,
        tariff_rate,
        tariff_type,
        trade_agreement,
        certificate_of_origin_required,
        rules_of_origin_text,
        quota_limit,
        quota_unit,
        quota_period,
        non_tariff_measures,
        safeguard_measures,
        specific_duty_amount,
        specific_duty_unit,
        vat_rate,
        documentation_requirements,
        effective_date,
        expiry_date,
        data_source,
        last_verified_date
      `)
      .eq('importing_country_code', country)
      .eq('hs_code', hsCode)
      .eq('exporting_country_code', 'ZA')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    return res.status(200).json({
      status: 'success',
      data: data || {
        importing_country_code: country,
        hs_code: hsCode,
        exporting_country_code: 'ZA',
        tariff_rate: null,
        message: "Tariff information not available"
      }
    });
  } catch (error: any) {
    console.error('Error fetching tariff data:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch tariff data'
    });
  }
};

// Get SA industry classifications
const getSAIndustryClassifications: RouteHandler = async (req, res) => {
  try {
    // Query all industry classifications
    const { data, error } = await supabase
      .from('sa_industry_classifications')
      .select('*');
    
    if (error) throw error;
    
    return res.status(200).json({
      status: 'success',
      data: data || []
    });
  } catch (error: any) {
    console.error('Error fetching industry classifications:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch industry classifications'
    });
  }
};

// Get documentation details for a specific requirement
const getComplianceDocumentation: RouteHandler = async (req, res) => {
  try {
    const { requirementId } = req.params;
    
    const { data, error } = await supabase
      .from('compliance_documentation')
      .select('*')
      .eq('requirement_id', requirementId);
    
    if (error) throw error;
    
    return res.status(200).json({
      status: 'success',
      data: data || []
    });
  } catch (error: any) {
    console.error('Error fetching compliance documentation:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch compliance documentation'
    });
  }
};

// Register routes with explicit handler functions
router.get('/export-requirements/:country/:industry', getExportRequirements);
router.get('/tariffs/:country/:hsCode', getTariffInformation);
router.get('/sa-industry-classifications', getSAIndustryClassifications);
router.get('/documentation/:requirementId', getComplianceDocumentation);

// Debug routes
router.get('/debug/tables', listTables);
router.get('/debug/query/:query', runRawQuery);

export default router; 