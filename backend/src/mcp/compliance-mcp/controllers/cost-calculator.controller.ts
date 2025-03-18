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

// Calculate compliance costs for specific country and product
export const calculateComplianceCosts: RouteHandler = async (req, res) => {
  try {
    const { country, hsCode } = req.params;
    const { quantity, unitValue } = req.query;
    
    // Convert query parameters to numbers
    const productQuantity = quantity ? Number(quantity) : 1;
    const unitValueZAR = unitValue ? Number(unitValue) : 0;
    
    console.log(`Calculating compliance costs for country: ${country}, HS code: ${hsCode}, quantity: ${productQuantity}, unit value: ${unitValueZAR}`);
    
    // Get requirements for the specified country and HS code
    const { data: requirements, error: requirementsError } = await supabase
      .from('compliance_requirements')
      .select(`
        id,
        requirement_name,
        estimated_cost_zar,
        estimated_processing_time_days,
        required
      `)
      .eq('country_code', country)
      .eq('hs_code', hsCode);
    
    if (requirementsError) throw requirementsError;
    
    // Get tariff information
    const { data: tariffData, error: tariffError } = await supabase
      .from('tariff_data')
      .select(`
        tariff_rate,
        vat_rate,
        specific_duty_amount,
        specific_duty_unit
      `)
      .eq('importing_country_code', country)
      .eq('hs_code', hsCode)
      .eq('exporting_country_code', 'ZA')
      .maybeSingle();
    
    if (tariffError && tariffError.code !== 'PGRST116') throw tariffError;
    
    // Calculate compliance document costs
    const complianceCosts = requirements ? requirements.reduce((total, req) => {
      if (req.required && req.estimated_cost_zar) {
        return total + req.estimated_cost_zar;
      }
      return total;
    }, 0) : 0;
    
    // Calculate tariffs and duties
    const productValue = unitValueZAR * productQuantity;
    let tariffCost = 0;
    let vatCost = 0;
    let specificDutyCost = 0;
    
    if (tariffData) {
      // Calculate ad valorem tariff
      if (tariffData.tariff_rate) {
        tariffCost = (productValue * tariffData.tariff_rate) / 100;
      }
      
      // Calculate specific duty if applicable
      if (tariffData.specific_duty_amount) {
        specificDutyCost = tariffData.specific_duty_amount * productQuantity;
      }
      
      // Calculate VAT if applicable
      if (tariffData.vat_rate) {
        // VAT is typically calculated on the value plus the tariff
        vatCost = ((productValue + tariffCost + specificDutyCost) * tariffData.vat_rate) / 100;
      }
    }
    
    // Calculate total landed cost
    const totalLandedCost = productValue + complianceCosts + tariffCost + specificDutyCost + vatCost;
    
    // Calculate percentage increase over product value
    const costIncreasePercentage = productValue > 0 
      ? ((totalLandedCost - productValue) / productValue) * 100 
      : 0;
    
    // Prepare processing time information
    const processingTimeDetails = requirements ? requirements
      .filter(req => req.required && req.estimated_processing_time_days)
      .map(req => ({
        requirement_name: req.requirement_name,
        processing_days: req.estimated_processing_time_days
      }))
      .sort((a, b) => b.processing_days - a.processing_days) : [];
    
    const longestProcessingTime = processingTimeDetails.length > 0 
      ? processingTimeDetails[0].processing_days
      : 0;
    
    return res.status(200).json({
      status: 'success',
      data: {
        base_product_value: productValue,
        compliance_costs: complianceCosts,
        tariff_cost: tariffCost,
        specific_duty_cost: specificDutyCost,
        vat_cost: vatCost,
        total_landed_cost: totalLandedCost,
        cost_increase_percentage: costIncreasePercentage,
        processing_time_details: processingTimeDetails,
        estimated_total_processing_days: longestProcessingTime,
        tariff_details: tariffData || {
          tariff_rate: null,
          vat_rate: null,
          message: "No tariff data available"
        },
        requirements_count: requirements ? requirements.filter(req => req.required).length : 0
      }
    });
  } catch (error: any) {
    console.error('Error calculating compliance costs:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to calculate compliance costs'
    });
  }
}; 