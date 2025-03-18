/**
 * Market Intelligence MCP
 * 
 * This MCP provides market intelligence data from various sources like Trade Map, UN Comtrade, and WITS.
 * It can be used to analyze trade flows, tariffs, and market opportunities.
 */

import express, { Request, Response, NextFunction, Router } from 'express';
import dotenv from 'dotenv';

// Import controllers
import * as tradeFlowController from './controllers/trade-flow.controller';
import * as marketOpportunityController from './controllers/market-opportunity.controller';

// Import services
import { tradeAnalysisService } from './services/trade-analysis.service';
import { cacheService } from './services/cache.service';

// Import connectors
import { setupTradeMapConnector } from './connectors/trade-map';
import { setupComtradeConnector } from './connectors/comtrade';
import { setupWitsConnector } from './connectors/wits';

dotenv.config();

// Define custom type for route handlers
type RouteHandler = (req: Request, res: Response, next?: NextFunction) => Promise<any>;

/**
 * Market Intelligence Model Context Protocol (MCP)
 * 
 * This MCP handles all trade data and market intelligence operations.
 * It serves as a structured data layer that delivers standardized data responses
 * from various trade data sources like Comtrade, WITS, and Trade Map.
 */

// Create router instance
const router: Router = express.Router();

// Debug endpoint to check health of the market intelligence MCP
const healthCheck: RouteHandler = async (req, res) => {
  try {
    // Get cache statistics
    const cacheStats = cacheService.getStats();
    
    return res.status(200).json({
      status: 'success',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      service: 'market-intelligence-mcp',
      connectors: {
        comtrade: process.env.COMTRADE_API_KEY ? 'configured' : 'not configured',
        tradeMap: process.env.TRADE_MAP_API_KEY ? 'configured' : 'not configured',
        wits: process.env.WITS_API_KEY ? 'configured' : 'not configured'
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

// Debug endpoint to clear the cache
const clearCache: RouteHandler = async (req, res) => {
  try {
    cacheService.clear();
    
    return res.status(200).json({
      status: 'success',
      message: 'Cache cleared successfully'
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
router.post('/clear-cache', clearCache);

// Trade flow routes
router.get('/trade-flow/:hsCode/:exporterCountry/:importerCountry', tradeFlowController.getTradeFlowData);
router.get('/top-exporters/:hsCode', tradeFlowController.getTopExporters);
router.get('/historical-trade/:hsCode/:countryCode', tradeFlowController.getHistoricalTradeData);

// Market opportunity routes
router.get('/market-opportunities/:hsCode/:exporterCountry', marketOpportunityController.getMarketOpportunities);
router.get('/market-access/:hsCode/:exporterCountry', marketOpportunityController.getMarketAccessAnalysis);

/**
 * The Market Intelligence MCP is responsible for:
 * 1. Retrieving and standardizing trade flow data from various sources
 * 2. Analyzing market opportunities based on trade data
 * 3. Providing historical trade data for trend analysis
 * 4. Delivering data in a consistent format regardless of the source
 * 5. Implementing caching to improve performance
 * 
 * This MCP is the authoritative source for all market intelligence data in the TradeWizard system.
 */

export default router; 