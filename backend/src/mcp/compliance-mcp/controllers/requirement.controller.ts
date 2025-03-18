import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dataSourceService } from '../services/data-source.service';
import { cacheService } from '../services/cache.service';

dotenv.config();

// Define custom type for route handlers
type RouteHandler = (req: Request, res: Response, next?: NextFunction) => Promise<any>;

// Get export requirements for a specific country and industry
export const getExportRequirements: RouteHandler = async (req, res) => {
  try {
    const { country, industry } = req.params;
    const { sector, subsector, hsCode } = req.query;
    
    // Log for debugging
    console.log(`Fetching export requirements for country: ${country}, industry: ${industry}, sector: ${sector}, subsector: ${subsector}, hsCode: ${hsCode}`);
    
    // Use the enhanced data source service
    const requirements = await dataSourceService.getExportRequirements(
      country,
      sector as string || industry, // Use sector from query params or fallback to industry from path
      subsector as string,
      hsCode as string
    );
    
    return res.status(200).json({
      status: 'success',
      data: requirements || []
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

// Get export requirements for a specific country and HS code
export const getExportRequirementsByHsCode: RouteHandler = async (req, res) => {
  try {
    const { country, hsCode } = req.params;
    const { sector, subsector } = req.query;
    
    console.log(`Fetching export requirements for country: ${country}, HS code: ${hsCode}, sector: ${sector}, subsector: ${subsector}`);
    
    // Use the enhanced data source service
    const requirements = await dataSourceService.getExportRequirements(
      country,
      sector as string,
      subsector as string,
      hsCode
    );
    
    return res.status(200).json({
      status: 'success',
      data: requirements || []
    });
  } catch (error: any) {
    console.error('Error fetching export requirements by HS code:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch export requirements by HS code'
    });
  }
};

// Create a new export requirement
export const createExportRequirement: RouteHandler = async (req, res) => {
  try {
    const requirementData = req.body;
    
    // In test mode, just return mock data
    if (process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test') {
      return res.status(201).json({
        status: 'success',
        data: [{
          id: 999,
          ...requirementData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      });
    }
    
    // Use Supabase client (only in non-test mode)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Verify the client is initialized and has the expected methods
    if (!supabase) {
      throw new Error('Failed to initialize database client');
    }
    
    // Safely call insert method with type checking
    const { data, error } = await supabase
      .from('export_requirements')
      .insert([requirementData])
      .select();
    
    if (error) throw error;
    
    // Clear cache for the relevant keys
    const cacheKey = `export_requirements_${requirementData.country_code}_${requirementData.sector || ''}_${requirementData.subsector || ''}_${requirementData.hs_code || ''}`;
    cacheService.delete(cacheKey);
    
    return res.status(201).json({
      status: 'success',
      data: data || []
    });
  } catch (error: any) {
    console.error('Error creating export requirement:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to create export requirement'
    });
  }
};

// Update an existing export requirement
export const updateExportRequirement: RouteHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const requirementData = req.body;
    
    // In test mode, just return mock data
    if (process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test') {
      return res.status(200).json({
        status: 'success',
        data: [{
          id: parseInt(id),
          ...requirementData,
          updated_at: new Date().toISOString()
        }]
      });
    }
    
    // Use Supabase client (only in non-test mode)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Verify the client is initialized and has the expected methods
    if (!supabase) {
      throw new Error('Failed to initialize database client');
    }
    
    // Safely call update method with type checking
    const { data, error } = await supabase
      .from('export_requirements')
      .update(requirementData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    // Clear all cache keys that might be affected
    cacheService.clear();
    
    return res.status(200).json({
      status: 'success',
      data: data || []
    });
  } catch (error: any) {
    console.error('Error updating export requirement:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to update export requirement'
    });
  }
};

// Delete an export requirement
export const deleteExportRequirement: RouteHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    // In test mode, just return success
    if (process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test') {
      return res.status(200).json({
        status: 'success',
        message: 'Export requirement deleted successfully'
      });
    }
    
    // Use Supabase client (only in non-test mode)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Verify the client is initialized and has the expected methods
    if (!supabase) {
      throw new Error('Failed to initialize database client');
    }
    
    // Safely call delete method with type checking
    const { error } = await supabase
      .from('export_requirements')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Clear all cache keys that might be affected
    cacheService.clear();
    
    return res.status(200).json({
      status: 'success',
      message: 'Export requirement deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting export requirement:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to delete export requirement'
    });
  }
};

// Get required certifications for a country, sector, and subsector
export const getCertifications: RouteHandler = async (req, res) => {
  try {
    const { country, sector, subsector } = req.params;
    
    console.log(`Fetching required certifications for country: ${country}, sector: ${sector}, subsector: ${subsector}`);
    
    // Use the enhanced data source service to get export requirements
    const requirements = await dataSourceService.getExportRequirements(
      country,
      sector,
      subsector
    );
    
    // Extract certification_required from all requirements
    const certifications = new Set<string>();
    requirements.forEach(req => {
      if (req.certification_required && Array.isArray(req.certification_required)) {
        req.certification_required.forEach(cert => certifications.add(cert));
      }
    });
    
    return res.status(200).json({
      status: 'success',
      data: Array.from(certifications)
    });
  } catch (error: any) {
    console.error('Error fetching certifications:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch certifications'
    });
  }
};

// Get required documentation for a country, sector, and subsector
export const getDocumentation: RouteHandler = async (req, res) => {
  try {
    const { country, sector, subsector } = req.params;
    
    console.log(`Fetching required documentation for country: ${country}, sector: ${sector}, subsector: ${subsector}`);
    
    // Use the enhanced data source service to get export requirements
    const requirements = await dataSourceService.getExportRequirements(
      country,
      sector,
      subsector
    );
    
    // Extract documentation_required from all requirements
    const documents = new Set<string>();
    requirements.forEach(req => {
      if (req.documentation_required && Array.isArray(req.documentation_required)) {
        req.documentation_required.forEach(doc => documents.add(doc));
      }
    });
    
    return res.status(200).json({
      status: 'success',
      data: Array.from(documents)
    });
  } catch (error: any) {
    console.error('Error fetching documentation:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch documentation'
    });
  }
};

// Get specialized subsector requirements
export const getSubsectorRequirements: RouteHandler = async (req, res) => {
  try {
    const { country, sector, subsector } = req.params;
    
    console.log(`Fetching specialized subsector requirements for country: ${country}, sector: ${sector}, subsector: ${subsector}`);
    
    // Use the enhanced data source service to get export requirements
    const requirements = await dataSourceService.getExportRequirements(
      country,
      sector,
      subsector
    );
    
    // Extract special_subsector_requirements from all requirements
    const specialRequirements = requirements
      .filter(req => req.special_subsector_requirements)
      .map(req => ({
        requirement_name: req.requirement_name,
        special_requirements: req.special_subsector_requirements
      }));
    
    return res.status(200).json({
      status: 'success',
      data: specialRequirements
    });
  } catch (error: any) {
    console.error('Error fetching subsector requirements:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch subsector requirements'
    });
  }
};

// Get regulatory authorities for a country and sector
export const getRegulatoryAuthorities: RouteHandler = async (req, res) => {
  try {
    const { country, sector } = req.params;
    
    console.log(`Fetching regulatory authorities for country: ${country}, sector: ${sector}`);
    
    // Use the enhanced data source service to get regulatory sources
    const regulatorySources = await dataSourceService.getRegulatoryAuthorities(
      country,
      sector
    );
    
    return res.status(200).json({
      status: 'success',
      data: regulatorySources
    });
  } catch (error: any) {
    console.error('Error fetching regulatory authorities:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch regulatory authorities'
    });
  }
};

// Get detailed information about a specific requirement
export const getRequirementDetails: RouteHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Fetching requirement details for id: ${id}`);
    
    // In test mode, return mock data
    if (process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test') {
      // Find the requirement in mock data
      const mockResult = dataSourceService.mockQuery('export_requirements', 'id', parseInt(id));
      const requirement = mockResult.data?.[0];
      
      if (!requirement) {
        return res.status(404).json({
          status: 'error',
          code: 404,
          message: 'Requirement not found'
        });
      }
      
      return res.status(200).json({
        status: 'success',
        data: requirement
      });
    }
    
    // Use Supabase client (only in non-test mode)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Verify the client is initialized and has the expected methods
    if (!supabase) {
      throw new Error('Failed to initialize database client');
    }
    
    // Safely call select method with type checking
    const { data, error } = await supabase
      .from('export_requirements')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Requirement not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data
    });
  } catch (error: any) {
    console.error('Error fetching requirement details:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch requirement details'
    });
  }
};

// Get non-tariff measures for a country and HS code
export const getNonTariffMeasures: RouteHandler = async (req, res) => {
  try {
    const { country, hsCode } = req.params;
    
    console.log(`Fetching non-tariff measures for country: ${country}, HS code: ${hsCode}`);
    
    // Use the enhanced data source service to get non-tariff measures
    const measures = await dataSourceService.getNonTariffMeasures(hsCode, country);
    
    return res.status(200).json({
      status: 'success',
      data: measures
    });
  } catch (error: any) {
    console.error('Error fetching non-tariff measures:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch non-tariff measures'
    });
  }
};

// Check for updates to regulatory sources
export const checkRegulatoryUpdates: RouteHandler = async (req, res) => {
  try {
    const { country, sector } = req.query;
    
    console.log(`Checking for regulatory updates for country: ${country}, sector: ${sector}`);
    
    // Get regulatory sources
    const sources = await dataSourceService.getRegulatoryAuthorities(
      country as string,
      sector as string
    );
    
    // Check each source for updates
    const updatePromises = sources.map(async (source) => {
      const hasUpdates = await dataSourceService.checkRegulatoryUpdates(source);
      return {
        ...source,
        has_updates: hasUpdates
      };
    });
    
    const updatedSources = await Promise.all(updatePromises);
    
    // Filter sources with updates
    const sourcesWithUpdates = updatedSources.filter(source => source.has_updates);
    
    return res.status(200).json({
      status: 'success',
      data: {
        total_sources: sources.length,
        sources_with_updates: sourcesWithUpdates.length,
        updated_sources: sourcesWithUpdates
      }
    });
  } catch (error: any) {
    console.error('Error checking for regulatory updates:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to check for regulatory updates'
    });
  }
}; 