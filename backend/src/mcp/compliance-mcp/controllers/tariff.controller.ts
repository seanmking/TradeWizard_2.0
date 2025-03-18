import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define custom type for route handlers
type RouteHandler = (req: Request, res: Response, next?: NextFunction) => Promise<any>;

// Get tariff information for a specific country and HS code
export const getTariffInformation: RouteHandler = async (req, res) => {
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

// Get tariff information for multiple countries and a specific HS code
export const getTariffComparisonByHsCode: RouteHandler = async (req, res) => {
  try {
    const { hsCode } = req.params;
    const { countries } = req.query;
    
    if (!countries || !Array.isArray(countries)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Countries parameter must be provided as an array'
      });
    }
    
    // Log for debugging
    console.log(`Fetching tariff comparison for HS code: ${hsCode}, countries: ${countries.join(', ')}`);
    
    // Query tariff data for all specified countries
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
        non_tariff_measures,
        vat_rate
      `)
      .eq('hs_code', hsCode)
      .eq('exporting_country_code', 'ZA')
      .in('importing_country_code', countries);
    
    if (error) throw error;
    
    return res.status(200).json({
      status: 'success',
      data: data || []
    });
  } catch (error: any) {
    console.error('Error fetching tariff comparison data:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch tariff comparison data'
    });
  }
};

// Create or update tariff data
export const createOrUpdateTariffData: RouteHandler = async (req, res) => {
  try {
    const tariffData = req.body;
    
    // Check if tariff data already exists
    const { data: existingData, error: findError } = await supabase
      .from('tariff_data')
      .select('id')
      .eq('importing_country_code', tariffData.importing_country_code)
      .eq('hs_code', tariffData.hs_code)
      .eq('exporting_country_code', tariffData.exporting_country_code)
      .maybeSingle();
    
    if (findError) throw findError;
    
    let result;
    
    if (existingData) {
      // Update existing record
      const { data, error } = await supabase
        .from('tariff_data')
        .update(tariffData)
        .eq('id', existingData.id)
        .select();
      
      if (error) throw error;
      result = { data, operation: 'update' };
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('tariff_data')
        .insert([tariffData])
        .select();
      
      if (error) throw error;
      result = { data, operation: 'insert' };
    }
    
    return res.status(200).json({
      status: 'success',
      operation: result.operation,
      data: result.data || []
    });
  } catch (error: any) {
    console.error('Error creating/updating tariff data:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to create/update tariff data'
    });
  }
}; 