/**
 * UN Comtrade Connector
 * 
 * Provides access to the UN Comtrade API for retrieving international trade statistics.
 * UN Comtrade is the pseudonym for United Nations International Trade Statistics Database.
 */

import axios from 'axios';
import { TradeFlowData } from '../../../types';
import { ApiError } from '../../../utils/error-handling';
import { cache } from '../../../utils/cache';
import { StandardDataStructures } from '../../../utils/data-standards';

// Use the TradeFlowType enum from StandardDataStructures
type TradeFlowType = StandardDataStructures.TradeFlowType;
const TradeFlowType = StandardDataStructures.TradeFlowType;

interface ComtradeConfig {
  apiKey: string;
  baseUrl: string;
}

interface ComtradeResponse {
  data: Array<{
    reporterCode: string;
    reporterDesc: string;
    partnerCode: string;
    partnerDesc: string;
    cmdCode: string;
    cmdDesc: string;
    flowCode: number;
    flowDesc: string;
    period: number;
    periodDesc: string;
    tradeValue: number;
    netWgt: number;
    qty: number;
    qtyUnitCode: number;
    qtyUnitDesc: string;
  }>;
  count: number;
  limit: number;
  offset: number;
}

/**
 * Sets up the UN Comtrade connector
 */
export function setupComtradeConnector(config: ComtradeConfig) {
  // Create axios instance with base configuration
  const api = axios.create({
    baseURL: config.baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'Subscription-Key': config.apiKey
    }
  });
  
  return {
    /**
     * Get trade flow data for a specific HS code
     * @param hsCode HS code (6 digits)
     * @param exporterCountry Exporter country code (ISO)
     * @param importerCountry Importer country code (ISO)
     * @param year Year (default: latest available)
     * @param flowType Type of trade flow (export, import, re-export, re-import)
     * @returns Trade flow data
     */
    getTradeFlowByHsCode: async (
      hsCode: string,
      exporterCountry?: string,
      importerCountry?: string,
      year?: number,
      flowType: TradeFlowType = TradeFlowType.EXPORT
    ): Promise<TradeFlowData[]> => {
      try {
        // Create a cache key from the function name and arguments
        const cacheKey = `comtrade_getTradeFlowByHsCode_${hsCode}_${exporterCountry}_${importerCountry}_${year}_${flowType}`;
        
        // Try to get from cache
        const cachedData = await cache.get<TradeFlowData[]>(cacheKey);
        if (cachedData) {
          console.log('Retrieved trade flow data from cache', { cacheKey });
          return cachedData;
        }
        
        // Map flow type to Comtrade flow code
        const flowCodeMap: Record<TradeFlowType, number> = {
          [TradeFlowType.EXPORT]: 1,
          [TradeFlowType.IMPORT]: 2,
          [TradeFlowType.RE_EXPORT]: 3,
          [TradeFlowType.RE_IMPORT]: 4
        };
        
        // Build query parameters
        const params: Record<string, any> = {
          reporterCode: exporterCountry,
          partnerCode: importerCountry,
          cmdCode: hsCode,
          period: year,
          flowCode: flowCodeMap[flowType]
        };
        
        // Remove undefined parameters
        Object.keys(params).forEach(key => {
          if (params[key] === undefined) {
            delete params[key];
          }
        });
        
        // Make API request
        const response = await api.get<ComtradeResponse>('/data/query', { params });
        
        // Transform response to our data model
        const tradeData = response.data.data.map((item) => ({
          exporterCountry: item.reporterCode,
          importerCountry: item.partnerCode,
          hsCode: item.cmdCode,
          year: item.period,
          value: item.tradeValue,
          quantity: item.qty,
          unit: item.qtyUnitDesc,
          weight: item.netWgt,
          flowType: item.flowDesc
        }));
        
        // Cache the data for future requests (1 hour TTL)
        await cache.set(cacheKey, tradeData, 3600);
        
        return tradeData;
      } catch (error: any) {
        console.error('Error fetching trade flow data from Comtrade:', error);
        
        // Check if it's an axios error by checking for response property
        if (error.response) {
          if (error.response.status === 401) {
            throw new ApiError('Unauthorized access to UN Comtrade API. Check your API key.', 401);
          } else if (error.response.status === 404) {
            return []; // No data found, return empty array
          } else {
            throw new ApiError(`UN Comtrade API error: ${error.message || 'Unknown error'}`, 502);
          }
        }
        
        throw new ApiError('Failed to fetch trade flow data from Comtrade', 500);
      }
    },
    
    /**
     * Get top trading partners for a specific country and HS code
     * @param countryCode Country code (ISO)
     * @param hsCode HS code (6 digits)
     * @param limit Number of results to return (default: 10)
     * @param year Year (default: latest available)
     * @param isExport Whether to get top export partners (true) or import partners (false)
     * @returns List of top trading partners with trade values
     */
    getTopTradingPartners: async (
      countryCode: string,
      hsCode: string,
      limit: number = 10,
      year?: number,
      isExport: boolean = true
    ): Promise<{ country: string; countryName: string; value: number; share: number }[]> => {
      try {
        // Create a cache key from the function name and arguments
        const cacheKey = `comtrade_getTopTradingPartners_${countryCode}_${hsCode}_${limit}_${year}_${isExport}`;
        
        // Try to get from cache
        const cachedData = await cache.get<{ country: string; countryName: string; value: number; share: number }[]>(cacheKey);
        if (cachedData) {
          console.log('Retrieved top trading partners data from cache', { cacheKey });
          return cachedData;
        }
        
        // Build query parameters
        const params: Record<string, any> = {
          reporterCode: isExport ? countryCode : undefined,
          partnerCode: isExport ? undefined : countryCode,
          cmdCode: hsCode,
          period: year,
          flowCode: isExport ? 1 : 2, // 1 for export, 2 for import
          limit
        };
        
        // Remove undefined parameters
        Object.keys(params).forEach(key => {
          if (params[key] === undefined) {
            delete params[key];
          }
        });
        
        // Make API request
        const response = await api.get<ComtradeResponse>('/data/query', { params });
        
        // Transform response to our data model
        const partners = response.data.data.map((item) => ({
          country: isExport ? item.partnerCode : item.reporterCode,
          countryName: isExport ? item.partnerDesc : item.reporterDesc,
          value: item.tradeValue,
          share: 0 // Comtrade doesn't provide share directly, would need to calculate
        }));
        
        // Calculate shares based on total
        const totalValue = partners.reduce((sum, item) => sum + item.value, 0);
        const partnersWithShare = partners.map(partner => ({
          ...partner,
          share: totalValue > 0 ? (partner.value / totalValue) * 100 : 0
        }));
        
        // Cache the data for future requests (1 hour TTL)
        await cache.set(cacheKey, partnersWithShare, 3600);
        
        return partnersWithShare;
      } catch (error: any) {
        console.error('Error fetching top trading partners from Comtrade:', error);
        
        // Check if it's an axios error by checking for response property
        if (error.response) {
          if (error.response.status === 401) {
            throw new ApiError('Unauthorized access to UN Comtrade API. Check your API key.', 401);
          } else if (error.response.status === 404) {
            return []; // No data found, return empty array
          } else {
            throw new ApiError(`UN Comtrade API error: ${error.message || 'Unknown error'}`, 502);
          }
        }
        
        throw new ApiError('Failed to fetch top trading partners from Comtrade', 500);
      }
    },
    
    /**
     * Get historical trade data for a specific HS code and country
     * @param hsCode HS code (6 digits)
     * @param countryCode Country code (ISO)
     * @param startYear Start year for historical data
     * @param endYear End year for historical data (default: current year)
     * @param isExport Whether to get export data (true) or import data (false)
     * @returns Historical trade data by year
     */
    getHistoricalTradeData: async (
      hsCode: string,
      countryCode: string,
      startYear: number,
      endYear: number = new Date().getFullYear(),
      isExport: boolean = true
    ): Promise<{ year: number; value: number; quantity: number; unit: string }[]> => {
      try {
        // Create a cache key from the function name and arguments
        const cacheKey = `comtrade_getHistoricalTradeData_${hsCode}_${countryCode}_${startYear}_${endYear}_${isExport}`;
        
        // Try to get from cache
        const cachedData = await cache.get<{ year: number; value: number; quantity: number; unit: string }[]>(cacheKey);
        if (cachedData) {
          console.log('Retrieved historical trade data from cache', { cacheKey });
          return cachedData;
        }
        
        // Build query parameters for multiple years
        const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
        
        // Make API requests for each year and combine results
        const requests = years.map(year => {
          const params: Record<string, any> = {
            reporterCode: isExport ? countryCode : undefined,
            partnerCode: isExport ? undefined : countryCode,
            cmdCode: hsCode,
            period: year,
            flowCode: isExport ? 1 : 2 // 1 for export, 2 for import
          };
          
          // Remove undefined parameters
          Object.keys(params).forEach(key => {
            if (params[key] === undefined) {
              delete params[key];
            }
          });
          
          return api.get<ComtradeResponse>('/data/query', { params });
        });
        
        // Execute all requests in parallel
        const responses = await Promise.all(requests);
        
        // Combine and transform responses
        const historicalData = responses.flatMap(response => 
          response.data.data.map(item => ({
            year: item.period,
            value: item.tradeValue,
            quantity: item.qty,
            unit: item.qtyUnitDesc
          }))
        );
        
        // Sort by year
        historicalData.sort((a, b) => a.year - b.year);
        
        // Cache the data for future requests (1 day TTL since historical data doesn't change often)
        await cache.set(cacheKey, historicalData, 86400);
        
        return historicalData;
      } catch (error: any) {
        console.error('Error fetching historical trade data from Comtrade:', error);
        
        // Check if it's an axios error by checking for response property
        if (error.response) {
          if (error.response.status === 401) {
            throw new ApiError('Unauthorized access to UN Comtrade API. Check your API key.', 401);
          } else if (error.response.status === 404) {
            return []; // No data found, return empty array
          } else {
            throw new ApiError(`UN Comtrade API error: ${error.message || 'Unknown error'}`, 502);
          }
        }
        
        throw new ApiError('Failed to fetch historical trade data from Comtrade', 500);
      }
    }
  };
}
