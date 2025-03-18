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

// Get all SA industry classifications
export const getSAIndustryClassifications: RouteHandler = async (req, res) => {
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

// Get industry classification by ID
export const getIndustryClassificationById: RouteHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('sa_industry_classifications')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return res.status(200).json({
      status: 'success',
      data: data || {}
    });
  } catch (error: any) {
    console.error('Error fetching industry classification by ID:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch industry classification by ID'
    });
  }
};

// Map HS code to industry classification
export const mapHsCodeToIndustry: RouteHandler = async (req, res) => {
  try {
    const { hsCode } = req.params;
    
    const { data, error } = await supabase
      .from('hs_code_industry_mapping')
      .select(`
        id,
        hs_code,
        industry_id,
        sa_industry_classifications (*)
      `)
      .eq('hs_code', hsCode)
      .maybeSingle();
    
    if (error) throw error;
    
    return res.status(200).json({
      status: 'success',
      data: data || {
        hs_code: hsCode,
        message: 'Industry mapping not found for this HS code'
      }
    });
  } catch (error: any) {
    console.error('Error mapping HS code to industry:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to map HS code to industry'
    });
  }
};

// Get all export regulations for a specific industry
export const getIndustryRegulations: RouteHandler = async (req, res) => {
  try {
    const { industry } = req.params;
    
    const { data, error } = await supabase
      .from('industry_regulations')
      .select(`
        id,
        industry,
        regulation_name,
        regulation_description,
        regulatory_body,
        compliance_requirements,
        legal_reference,
        last_updated
      `)
      .eq('industry', industry);
    
    if (error) throw error;
    
    return res.status(200).json({
      status: 'success',
      data: data || []
    });
  } catch (error: any) {
    console.error('Error fetching industry regulations:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch industry regulations'
    });
  }
}; 