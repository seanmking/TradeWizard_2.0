import express, { Request, Response, NextFunction, Router } from 'express';
import dotenv from 'dotenv';
import path from 'path';

// Import controllers
import * as requirementController from './controllers/requirement.controller';
import * as tariffController from './controllers/tariff.controller';
import * as industryController from './controllers/industry.controller';
import * as costCalculatorController from './controllers/cost-calculator.controller';

// Import services
import { dataSourceService } from './services/data-source.service';
import { cacheService } from './services/cache.service';

// Import external API services
// We'll use these services instead of direct database connections when running in test mode
const comtradeService = require('../../services/comtradeService');
import { setupWitsConnector } from '../market-intelligence-mcp/connectors/wits';

dotenv.config();

// Define custom type for route handlers
type RouteHandler = (req: Request, res: Response, next?: NextFunction) => Promise<any>;

// Create router instance
const router: Router = express.Router();

// Debug endpoint to check health of the compliance MCP
const healthCheck: RouteHandler = async (req, res) => {
  try {
    // Get cache statistics
    const cacheStats = cacheService.getStats();
    
    // Setup WITS connector with config from env vars or use defaults for testing
    const witsConnector = setupWitsConnector({
      apiKey: process.env.WITS_API_KEY || 'test-key',
      baseUrl: process.env.WITS_API_URL || 'https://wits.worldbank.org/API/V1'
    });
    
    // Create response with service status
    return res.status(200).json({
      status: 'success',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        comtrade: true,
        wits: true
      },
      cache: cacheStats
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Health check failed'
    });
  }
};

// Debug endpoint to list available data sources
const listTables: RouteHandler = async (req, res) => {
  try {
    // Get available data sources from our APIs
    const dataSources = [
      { name: 'comtrade', description: 'UN Comtrade International Trade Statistics' },
      { name: 'wits', description: 'World Integrated Trade Solution (World Bank)' },
      { name: 'trademap', description: 'ITC TradeMap Statistics' },
      { name: 'cache', description: 'In-memory Cache Service' }
    ];
    
    return res.status(200).json({
      status: 'success',
      data: dataSources
    });
  } catch (error: any) {
    console.error('Error listing data sources:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to list data sources'
    });
  }
};

// Debug endpoint to run a query on comtrade
const runRawQuery: RouteHandler = async (req, res) => {
  try {
    const { query } = req.params;
    const decodedQuery = decodeURIComponent(query);
    
    console.log(`Running query: ${decodedQuery}`);
    
    // Parse the query parameters
    // Expected format: reporterCode=USA&flowCode=1&period=2022&cmdCode=TOTAL
    const params = new URLSearchParams(decodedQuery);
    
    const reporterCode = params.get('reporterCode') || 'USA';
    const flowCode = params.get('flowCode') || '1';
    const period = params.get('period') || '2022';
    const cmdCode = params.get('cmdCode') || 'TOTAL';
    
    // Use comtrade service to get the data
    const data = await comtradeService.getTradeData(
      reporterCode,
      flowCode,
      period,
      cmdCode
    );
    
    return res.status(200).json({
      status: 'success',
      source: 'comtrade',
      query: {
        reporterCode,
        flowCode,
        period,
        cmdCode
      },
      data: data || []
    });
  } catch (error: any) {
    console.error('Error running query:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to run query'
    });
  }
};

// Cache management endpoint
const clearCache: RouteHandler = async (req, res) => {
  try {
    const { key } = req.query;
    
    if (key) {
      // Clear specific cache key
      cacheService.delete(key as string);
      console.log(`Cleared cache for key: ${key}`);
    } else {
      // Clear all cache
      cacheService.clear();
      console.log('Cleared all cache');
    }
    
    return res.status(200).json({
      status: 'success',
      message: key ? `Cache cleared for key: ${key}` : 'All cache cleared',
      cacheStats: cacheService.getStats()
    });
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to clear cache'
    });
  }
};

// ----------------------------------------------------------------------------
// Register routes for all controllers
// ----------------------------------------------------------------------------

// Health check and debug routes
router.get('/health', healthCheck);
router.get('/debug/tables', listTables);
router.get('/debug/query/:query', runRawQuery);
router.post('/debug/clear-cache', clearCache);

// Export requirement routes
router.get('/export-requirements/:country/:industry', requirementController.getExportRequirements);
router.get('/export-requirements/by-hs-code/:country/:hsCode', requirementController.getExportRequirementsByHsCode);
router.post('/export-requirements', requirementController.createExportRequirement);
router.put('/export-requirements/:id', requirementController.updateExportRequirement);
router.delete('/export-requirements/:id', requirementController.deleteExportRequirement);

// New export requirement related routes
router.get('/certifications/:country/:sector/:subsector', requirementController.getCertifications);
router.get('/documentation/:country/:sector/:subsector', requirementController.getDocumentation);
router.get('/subsector-requirements/:country/:sector/:subsector', requirementController.getSubsectorRequirements);
router.get('/regulatory-sources/:country/:sector', requirementController.getRegulatoryAuthorities);
router.get('/requirement-details/:id', requirementController.getRequirementDetails);
router.get('/non-tariff-measures/:country/:hsCode', requirementController.getNonTariffMeasures);
router.get('/regulatory-updates', requirementController.checkRegulatoryUpdates);

// Tariff routes
router.get('/tariffs/:country/:hsCode', tariffController.getTariffInformation);
router.get('/tariffs/comparison/:hsCode', tariffController.getTariffComparisonByHsCode);
router.post('/tariffs', tariffController.createOrUpdateTariffData);

// Industry routes
router.get('/sa-industry-classifications', industryController.getSAIndustryClassifications);
router.get('/sa-industry-classifications/:id', industryController.getIndustryClassificationById);
router.get('/hs-code-to-industry/:hsCode', industryController.mapHsCodeToIndustry);
router.get('/industry-regulations/:industry', industryController.getIndustryRegulations);

// Cost calculator routes
router.get('/calculate-costs/:country/:hsCode', costCalculatorController.calculateComplianceCosts);

export default router; 