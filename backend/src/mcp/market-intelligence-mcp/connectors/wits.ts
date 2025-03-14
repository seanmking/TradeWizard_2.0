/**
 * World Integrated Trade Solution (WITS) Connector
 * 
 * Provides access to the WITS API for retrieving trade data, tariffs, and non-tariff measures.
 * WITS is a software developed by the World Bank, in collaboration with UNCTAD, ITC, and WTO.
 */

import axios from 'axios';
import { TradeFlowData } from '../../../types';
import { ApiError } from '../../../utils/error-handling';
import { cache } from '../../../utils/cache';

interface WitsConfig {
  apiKey: string;
  baseUrl: string;
}

interface WitsResponse<T> {
  data: T;
  metadata: {
    source: string;
    lastUpdated: string;
    count: number;
  };
}

interface WitsTariffData {
  reporter: string;
  partner: string;
  productCode: string;
  year: number;
  simpleAverage: number;
  weightedAverage: number;
  minimumRate: number;
  maximumRate: number;
  numberOfTariffLines: number;
  tradeValue: number;
}

interface WitsNtmData {
  reporter: string;
  productCode: string;
  year: number;
  ntmType: string;
  ntmName: string;
  description: string;
  implementationDate: string;
  affectedPartners: string[];
}

/**
 * Sets up the WITS connector
 */
export function setupWitsConnector(config: WitsConfig) {
  // Create axios instance with base configuration
  const api = axios.create({
    baseURL: config.baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    }
  });
  
  const connector = {
    /**
     * Get tariff data for a specific HS code
     * @param hsCode HS code (6 digits)
     * @param importerCountry Importer country code (ISO)
     * @param exporterCountry Exporter country code (ISO)
     * @param year Year (default: latest available)
     * @returns Tariff data
     */
    getTariffData: async (
      hsCode: string,
      importerCountry: string,
      exporterCountry?: string,
      year?: number
    ): Promise<{
      simpleAverage: number;
      weightedAverage: number;
      minimumRate: number;
      maximumRate: number;
      numberOfTariffLines: number;
      tradeValue: number;
    }> => {
      try {
        // Create a cache key from the function name and arguments
        const cacheKey = `wits_getTariffData_${hsCode}_${importerCountry}_${exporterCountry}_${year}`;
        
        // Try to get from cache
        const cachedData = await cache.get<{
          simpleAverage: number;
          weightedAverage: number;
          minimumRate: number;
          maximumRate: number;
          numberOfTariffLines: number;
          tradeValue: number;
        }>(cacheKey);
        
        if (cachedData) {
          console.log('Retrieved tariff data from cache', { cacheKey });
          return cachedData;
        }
        
        // Build query parameters
        const params: Record<string, any> = {
          reporter: importerCountry,
          partner: exporterCountry,
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
        const response = await api.get<WitsResponse<WitsTariffData[]>>('/tariff', { params });
        
        if (!response.data.data.length) {
          throw new ApiError('No tariff data found for the specified parameters', 404);
        }
        
        // Get the first result (should be only one for specific parameters)
        const tariffData = response.data.data[0];
        
        // Transform response to our data model
        const result = {
          simpleAverage: tariffData.simpleAverage,
          weightedAverage: tariffData.weightedAverage,
          minimumRate: tariffData.minimumRate,
          maximumRate: tariffData.maximumRate,
          numberOfTariffLines: tariffData.numberOfTariffLines,
          tradeValue: tariffData.tradeValue
        };
        
        // Cache the data for future requests (1 day TTL since tariff data doesn't change often)
        await cache.set(cacheKey, result, 86400);
        
        return result;
      } catch (error: any) {
        console.error('Error fetching tariff data from WITS:', error);
        
        // Check if it's an axios error by checking for response property
        if (error.response) {
          if (error.response.status === 401) {
            throw new ApiError('Unauthorized access to WITS API. Check your API key.', 401);
          } else if (error.response.status === 404) {
            throw new ApiError('No tariff data found for the specified parameters', 404);
          } else {
            throw new ApiError(`WITS API error: ${error.message || 'Unknown error'}`, 502);
          }
        }
        
        throw new ApiError('Failed to fetch tariff data from WITS', 500);
      }
    },
    
    /**
     * Get non-tariff measures (NTMs) for a specific HS code
     * @param hsCode HS code (6 digits)
     * @param importerCountry Importer country code (ISO)
     * @param year Year (default: latest available)
     * @returns List of non-tariff measures
     */
    getNonTariffMeasures: async (
      hsCode: string,
      importerCountry: string,
      year?: number
    ): Promise<{
      ntmType: string;
      ntmName: string;
      description: string;
      implementationDate: string;
      affectedPartners: string[];
    }[]> => {
      try {
        // Create a cache key from the function name and arguments
        const cacheKey = `wits_getNonTariffMeasures_${hsCode}_${importerCountry}_${year}`;
        
        // Try to get from cache
        const cachedData = await cache.get<{
          ntmType: string;
          ntmName: string;
          description: string;
          implementationDate: string;
          affectedPartners: string[];
        }[]>(cacheKey);
        
        if (cachedData) {
          console.log('Retrieved NTM data from cache', { cacheKey });
          return cachedData;
        }
        
        // Build query parameters
        const params: Record<string, any> = {
          reporter: importerCountry,
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
        const response = await api.get<WitsResponse<WitsNtmData[]>>('/ntm', { params });
        
        // Transform response to our data model
        const ntmData = response.data.data.map(item => ({
          ntmType: item.ntmType,
          ntmName: item.ntmName,
          description: item.description,
          implementationDate: item.implementationDate,
          affectedPartners: item.affectedPartners
        }));
        
        // Cache the data for future requests (1 day TTL since NTM data doesn't change often)
        await cache.set(cacheKey, ntmData, 86400);
        
        return ntmData;
      } catch (error: any) {
        console.error('Error fetching NTM data from WITS:', error);
        
        // Check if it's an axios error by checking for response property
        if (error.response) {
          if (error.response.status === 401) {
            throw new ApiError('Unauthorized access to WITS API. Check your API key.', 401);
          } else if (error.response.status === 404) {
            return []; // No NTM data found, return empty array
          } else {
            throw new ApiError(`WITS API error: ${error.message || 'Unknown error'}`, 502);
          }
        }
        
        throw new ApiError('Failed to fetch NTM data from WITS', 500);
      }
    },
    
    /**
     * Get market access analysis for a product
     * @param hsCode HS code (6 digits)
     * @param exporterCountry Exporter country code (ISO)
     * @param targetMarkets Array of target market country codes (ISO)
     * @returns Market access analysis for each target market
     */
    getMarketAccessAnalysis: async (
      hsCode: string,
      exporterCountry: string,
      targetMarkets: string[]
    ): Promise<{
      market: string;
      tariff: {
        simpleAverage: number;
        weightedAverage: number;
      };
      ntmCount: number;
      preferentialAccess: boolean;
      competitorMargins: {
        competitor: string;
        marginDifference: number;
      }[];
    }[]> => {
      try {
        // Create a cache key from the function name and arguments
        const cacheKey = `wits_getMarketAccessAnalysis_${hsCode}_${exporterCountry}_${targetMarkets.join('_')}`;
        
        // Try to get from cache
        const cachedData = await cache.get<{
          market: string;
          tariff: {
            simpleAverage: number;
            weightedAverage: number;
          };
          ntmCount: number;
          preferentialAccess: boolean;
          competitorMargins: {
            competitor: string;
            marginDifference: number;
          }[];
        }[]>(cacheKey);
        
        if (cachedData) {
          console.log('Retrieved market access analysis from cache', { cacheKey });
          return cachedData;
        }
        
        // Get tariff data for each target market
        const tariffPromises = targetMarkets.map(market => 
          connector.getTariffData(hsCode, market, exporterCountry).catch(() => null)
        );
        
        // Get NTM data for each target market
        const ntmPromises = targetMarkets.map(market => 
          connector.getNonTariffMeasures(hsCode, market).catch(() => [])
        );
        
        // Wait for all promises to resolve
        const [tariffResults, ntmResults] = await Promise.all([
          Promise.all(tariffPromises),
          Promise.all(ntmPromises)
        ]);
        
        // Combine results into market access analysis
        const marketAccessAnalysis = targetMarkets.map((market, index) => {
          const tariffData = tariffResults[index];
          const ntmData = ntmResults[index];
          
          // If no tariff data is available, provide default values
          const tariff = tariffData ? {
            simpleAverage: tariffData.simpleAverage,
            weightedAverage: tariffData.weightedAverage
          } : {
            simpleAverage: 0,
            weightedAverage: 0
          };
          
          // Determine if there's preferential access (simplified logic)
          const preferentialAccess = tariff.simpleAverage < 5;
          
          // Mock competitor margins (in a real implementation, this would be calculated)
          const competitorMargins = [
            { competitor: 'CHN', marginDifference: 2.5 },
            { competitor: 'VNM', marginDifference: 1.2 },
            { competitor: 'IND', marginDifference: -0.8 }
          ];
          
          return {
            market,
            tariff,
            ntmCount: ntmData.length,
            preferentialAccess,
            competitorMargins
          };
        });
        
        // Cache the data for future requests (1 day TTL)
        await cache.set(cacheKey, marketAccessAnalysis, 86400);
        
        return marketAccessAnalysis;
      } catch (error: any) {
        console.error('Error generating market access analysis:', error);
        throw new ApiError('Failed to generate market access analysis', 500);
      }
    }
  };
  
  return connector;
}
