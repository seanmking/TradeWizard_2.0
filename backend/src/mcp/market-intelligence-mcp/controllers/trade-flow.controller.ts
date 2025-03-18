import { Request, Response, NextFunction } from 'express';
import { tradeAnalysisService } from '../services/trade-analysis.service';

// Define custom type for route handlers
type RouteHandler = (req: Request, res: Response, next?: NextFunction) => Promise<any>;

/**
 * Get trade flow data for a specific product and countries
 */
export const getTradeFlowData: RouteHandler = async (req, res) => {
  try {
    const { hsCode, exporterCountry, importerCountry } = req.params;
    const { year, source } = req.query;
    
    // Parse query parameters
    const yearParam = year ? parseInt(year as string) : undefined;
    const sourceParam = source as 'tradeMap' | 'comtrade' | 'wits' | undefined;
    
    console.log(`Fetching trade flow data for HS code: ${hsCode}, exporter: ${exporterCountry}, importer: ${importerCountry}, year: ${yearParam}, source: ${sourceParam}`);
    
    const tradeFlowData = await tradeAnalysisService.getTradeFlowData(
      hsCode,
      exporterCountry,
      importerCountry,
      yearParam,
      sourceParam
    );
    
    return res.status(200).json({
      status: 'success',
      data: tradeFlowData
    });
  } catch (error: any) {
    console.error('Error fetching trade flow data:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch trade flow data'
    });
  }
};

/**
 * Get top exporters for a specific product
 */
export const getTopExporters: RouteHandler = async (req, res) => {
  try {
    const { hsCode } = req.params;
    const { limit, year } = req.query;
    
    // Parse query parameters
    const limitParam = limit ? parseInt(limit as string) : 10;
    const yearParam = year ? parseInt(year as string) : undefined;
    
    console.log(`Fetching top exporters for HS code: ${hsCode}, limit: ${limitParam}, year: ${yearParam}`);
    
    const topExporters = await tradeAnalysisService.getTopExporters(hsCode, limitParam, yearParam);
    
    return res.status(200).json({
      status: 'success',
      data: topExporters
    });
  } catch (error: any) {
    console.error('Error fetching top exporters:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch top exporters'
    });
  }
};

/**
 * Get historical trade data for a product and country
 */
export const getHistoricalTradeData: RouteHandler = async (req, res) => {
  try {
    const { hsCode, countryCode } = req.params;
    const { startYear, endYear, isExport } = req.query;
    
    // Parse query parameters
    const startYearParam = startYear ? parseInt(startYear as string) : new Date().getFullYear() - 5;
    const endYearParam = endYear ? parseInt(endYear as string) : new Date().getFullYear() - 1;
    const isExportParam = isExport === 'true';
    
    console.log(`Fetching historical trade data for HS code: ${hsCode}, country: ${countryCode}, years: ${startYearParam}-${endYearParam}, isExport: ${isExportParam}`);
    
    const historicalData = await tradeAnalysisService.getHistoricalTradeData(
      hsCode,
      countryCode,
      startYearParam,
      endYearParam,
      isExportParam
    );
    
    return res.status(200).json({
      status: 'success',
      data: historicalData
    });
  } catch (error: any) {
    console.error('Error fetching historical trade data:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to fetch historical trade data'
    });
  }
}; 