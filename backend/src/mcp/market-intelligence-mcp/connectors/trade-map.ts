/**
 * Trade Map Connector
 * 
 * Provides access to the Trade Map API for retrieving trade flow data.
 * Trade Map is a market analysis tool developed by the International Trade Centre (ITC).
 */

import axios from 'axios';
import { TradeFlowData } from '../../../types';
import { ApiError } from '../../../utils/error-handling';
import { cache } from '../../../utils/cache';

interface TradeMapConfig {
  apiKey: string;
  baseUrl: string;
}

interface TradeMapResponse {
  data: Array<{
    reporterCode: string;
    partnerCode: string;
    productCode: string;
    year: number;
    tradeValue: number;
    quantity?: number;
    quantityUnit?: string;
    growthRate?: number;
    marketShare?: number;
    shareInWorld?: number;
  }>;
}

/**
 * Sets up the Trade Map connector
 */
export function setupTradeMapConnector(config: TradeMapConfig) {
  // Create axios instance with base configuration
  const api = axios.create({
    baseURL: config.baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    }
  });
  
  return {
    /**
     * Get trade flow data for a specific HS code
     * @param hsCode HS code (6 digits)
     * @param exporterCountry Exporter country code (ISO)
     * @param importerCountry Importer country code (ISO)
     * @param year Year (default: latest available)
     * @returns Trade flow data
     */
    getTradeFlowByHsCode: async (
      hsCode: string,
      exporterCountry?: string,
      importerCountry?: string,
      year?: number
    ): Promise<TradeFlowData[]> => {
      try {
        // Create a cache key from the function name and arguments
        const cacheKey = `tradeMap_getTradeFlowByHsCode_${hsCode}_${exporterCountry}_${importerCountry}_${year}`;
        
        // Try to get from cache
        const cachedData = await cache.get<TradeFlowData[]>(cacheKey);
        if (cachedData) {
          console.log('Retrieved trade flow data from cache', { cacheKey });
          return cachedData;
        }
        
        // Build query parameters
        const params: Record<string, any> = {
          reporter: exporterCountry,
          partner: importerCountry,
          productCode: hsCode,
          year: year
        };
        
        // Remove undefined parameters
        Object.keys(params).forEach(key => {
          if (params[key] === undefined) {
            delete params[key];
          }
        });
        
        // Make API request
        const response = await api.get<TradeMapResponse>('/tradedata', { params });
        
        // Transform response to our data model
        const tradeData = response.data.data.map((item) => ({
          exporterCountry: item.reporterCode,
          importerCountry: item.partnerCode,
          hsCode: item.productCode,
          year: item.year,
          value: item.tradeValue,
          quantity: item.quantity,
          unit: item.quantityUnit,
          growth: item.growthRate,
          marketShare: item.marketShare
        }));
        
        // Cache the data for future requests (1 hour TTL)
        await cache.set(cacheKey, tradeData, 3600);
        
        return tradeData;
      } catch (error: any) {
        console.error('Error fetching trade flow data:', error);
        
        // Check if it's an axios error by checking for response property
        if (error.response) {
          if (error.response.status === 401) {
            throw new ApiError('Unauthorized access to Trade Map API. Check your API key.', 401);
          } else if (error.response.status === 404) {
            return []; // No data found, return empty array
          } else {
            throw new ApiError(`Trade Map API error: ${error.message || 'Unknown error'}`, 502);
          }
        }
        
        throw new ApiError('Failed to fetch trade flow data', 500);
      }
    },
    
    /**
     * Get top exporters for a specific HS code
     * @param hsCode HS code (6 digits)
     * @param limit Number of results to return (default: 10)
     * @param year Year (default: latest available)
     * @returns List of top exporters with trade values
     */
    getTopExportersByHsCode: async (
      hsCode: string,
      limit: number = 10,
      year?: number
    ): Promise<{ country: string; value: number; share: number }[]> => {
      try {
        // Create a cache key from the function name and arguments
        const cacheKey = `tradeMap_getTopExportersByHsCode_${hsCode}_${limit}_${year}`;
        
        // Try to get from cache
        const cachedData = await cache.get<{ country: string; value: number; share: number }[]>(cacheKey);
        if (cachedData) {
          console.log('Retrieved top exporters data from cache', { cacheKey });
          return cachedData;
        }
        
        // Build query parameters
        const params: Record<string, any> = {
          productCode: hsCode,
          year: year,
          limit
        };
        
        // Remove undefined parameters
        Object.keys(params).forEach(key => {
          if (params[key] === undefined) {
            delete params[key];
          }
        });
        
        // Make API request
        const response = await api.get<TradeMapResponse>('/exporters', { params });
        
        // Transform response to our data model
        const exporters = response.data.data.map((item) => ({
          country: item.reporterCode,
          value: item.tradeValue,
          share: item.shareInWorld || 0 // Ensure share is never undefined
        }));
        
        // Cache the data for future requests (1 hour TTL)
        await cache.set(cacheKey, exporters, 3600);
        
        return exporters;
      } catch (error: any) {
        console.error('Error fetching top exporters:', error);
        
        // Check if it's an axios error by checking for response property
        if (error.response) {
          if (error.response.status === 401) {
            throw new ApiError('Unauthorized access to Trade Map API. Check your API key.', 401);
          } else if (error.response.status === 404) {
            return []; // No data found, return empty array
          } else {
            throw new ApiError(`Trade Map API error: ${error.message || 'Unknown error'}`, 502);
          }
        }
        
        throw new ApiError('Failed to fetch top exporters data', 500);
      }
    },
    
    /**
     * Get market trends for a specific HS code
     * @param hsCode HS code (6 digits)
     * @param importerCountry Importer country code (ISO)
     * @param years Number of years to analyze (default: 5)
     * @returns Market trend data
     */
    getMarketTrends: async (
      hsCode: string,
      importerCountry: string,
      years: number = 5
    ): Promise<{ year: number; value: number; growth: number }[]> => {
      try {
        // Create a cache key from the function name and arguments
        const cacheKey = `tradeMap_getMarketTrends_${hsCode}_${importerCountry}_${years}`;
        
        // Try to get from cache
        const cachedData = await cache.get<{ year: number; value: number; growth: number }[]>(cacheKey);
        if (cachedData) {
          console.log('Retrieved market trends data from cache', { cacheKey });
          return cachedData;
        }
        
        // Calculate start year
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - years;
        
        // Build query parameters
        const params: Record<string, any> = {
          productCode: hsCode,
          partner: importerCountry,
          startYear,
          endYear: currentYear
        };
        
        // Make API request
        const response = await api.get<TradeMapResponse>('/trends', { params });
        
        // Transform response to our data model
        const trends = response.data.data.map((item) => ({
          year: item.year,
          value: item.tradeValue,
          growth: item.growthRate || 0 // Ensure growth is never undefined
        }));
        
        // Cache the data for future requests (1 hour TTL)
        await cache.set(cacheKey, trends, 3600);
        
        return trends;
      } catch (error: any) {
        console.error('Error fetching market trends:', error);
        
        // Check if it's an axios error by checking for response property
        if (error.response) {
          if (error.response.status === 401) {
            throw new ApiError('Unauthorized access to Trade Map API. Check your API key.', 401);
          } else if (error.response.status === 404) {
            return []; // No data found, return empty array
          } else {
            throw new ApiError(`Trade Map API error: ${error.message || 'Unknown error'}`, 502);
          }
        }
        
        throw new ApiError('Failed to fetch market trends data', 500);
      }
    }
  };
} 