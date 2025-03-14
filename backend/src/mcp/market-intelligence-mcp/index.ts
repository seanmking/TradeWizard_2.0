/**
 * Market Intelligence MCP
 * 
 * This MCP provides market intelligence data from various sources like Trade Map, UN Comtrade, and WITS.
 * It can be used to analyze trade flows, tariffs, and market opportunities.
 */

import { setupTradeMapConnector } from './connectors/trade-map';
import { setupComtradeConnector } from './connectors/comtrade';
import { setupWitsConnector } from './connectors/wits';
import { trackResponseTime } from '../../utils/monitoring';
import { StandardDataStructures } from '../../utils/data-standards';
import { TradeFlowData } from '../../types';

export interface MarketIntelligenceMcpConfig {
  tradeMap?: {
    apiKey: string;
    baseUrl?: string;
  };
  comtrade?: {
    apiKey: string;
    baseUrl?: string;
  };
  wits?: {
    apiKey: string;
    baseUrl?: string;
  };
}

export interface GetTradeFlowDataOptions {
  year?: number;
  source?: 'tradeMap' | 'comtrade' | 'wits';
  flowType?: StandardDataStructures.TradeFlowType;
}

export interface MarketAccessAnalysisResult {
  market: string;
  tariffRate: number | null;
  nonTariffMeasures: string[];
  competitiveness: {
    rank: number;
    score: number;
    competitors: {
      country: string;
      share: number;
    }[];
  };
  marketSize: number;
  growthRate: number;
  recommendation: string;
}

export interface MarketTrendResult {
  year: number;
  value: number;
  volume?: number;
  unitPrice?: number;
  growthRate?: number;
}

export interface TariffData {
  hsCode: string;
  importerCountry: string;
  exporterCountry: string;
  year: number;
  mfnRate?: number;
  preferentialRate?: number;
  quotas?: {
    type: string;
    amount: number;
    unit: string;
  }[];
  notes?: string;
}

export interface WitsTariffData {
  simpleAverage: number;
  weightedAverage: number;
  minimumRate: number;
  maximumRate: number;
  numberOfTariffLines: number;
  tradeValue: number;
}

export interface ExtendedTradeFlowData extends TradeFlowData {
  source?: string;
}

export interface MarketIntelligenceMcp {
  getTradeFlowData: (
    hsCode: string,
    exporterCountry: string,
    importerCountry: string,
    options?: GetTradeFlowDataOptions
  ) => Promise<TradeFlowData>;
  
  getTopExporters: (
    hsCode: string,
    limit?: number,
    year?: number
  ) => Promise<Array<{
    country: string;
    value: number;
    share?: number;
    volume?: number;
  }>>;
  
  getMarketTrends: (
    hsCode: string,
    marketCountry: string,
    years?: number
  ) => Promise<MarketTrendResult[]>;
  
  getTariffData: (
    hsCode: string,
    importerCountry: string,
    exporterCountry: string,
    year?: number
  ) => Promise<TariffData>;
  
  getMarketAccessAnalysis: (
    hsCode: string,
    exporterCountry: string,
    targetMarkets: string[]
  ) => Promise<MarketAccessAnalysisResult[]>;
  
  getHistoricalTradeData: (
    hsCode: string,
    countryCode: string,
    startYear: number,
    endYear: number,
    isExport: boolean
  ) => Promise<Array<{
    year: number;
    value: number;
    volume?: number;
  }>>;
}

/**
 * Setup the Market Intelligence MCP with all available connectors
 * @param config Configuration for the various connectors
 * @returns Unified Market Intelligence MCP interface
 */
export default async function setupMarketIntelligenceMcp(
  config?: MarketIntelligenceMcpConfig
): Promise<MarketIntelligenceMcp> {
  // Initialize connectors with provided configuration or environment variables
  const tradeMap = await setupTradeMapConnector({
    apiKey: config?.tradeMap?.apiKey || process.env.TRADE_MAP_API_KEY || '',
    baseUrl: config?.tradeMap?.baseUrl || process.env.TRADE_MAP_BASE_URL || 'https://api.trademap.org/api/v1'
  });
  
  const comtrade = await setupComtradeConnector({
    apiKey: config?.comtrade?.apiKey || process.env.COMTRADE_API_KEY || '',
    baseUrl: config?.comtrade?.baseUrl || process.env.COMTRADE_BASE_URL || 'https://comtrade.un.org/api'
  });
  
  const wits = await setupWitsConnector({
    apiKey: config?.wits?.apiKey || process.env.WITS_API_KEY || '',
    baseUrl: config?.wits?.baseUrl || process.env.WITS_BASE_URL || 'https://wits.worldbank.org/API/V1'
  });

  return {
    /**
     * Get trade flow data for a specific product between countries
     */
    getTradeFlowData: async (
      hsCode: string,
      exporterCountry: string,
      importerCountry: string,
      options?: GetTradeFlowDataOptions
    ): Promise<TradeFlowData> => {
      const source = options?.source || 'tradeMap';
      
      return trackResponseTime('getTradeFlowData', async () => {
        if (source === 'tradeMap') {
          // Ensure we always return a single TradeFlowData object
          const result = await tradeMap.getTradeFlowByHsCode(hsCode, exporterCountry, importerCountry, options?.year);
          return Array.isArray(result) ? result[0] : result;
        } else if (source === 'comtrade') {
          // Ensure we always return a single TradeFlowData object
          const result = await comtrade.getTradeFlowByHsCode(hsCode, exporterCountry, importerCountry, options?.year, options?.flowType);
          return Array.isArray(result) ? result[0] : result;
        } else {
          // For WITS, we'll need to adapt its output format to match our TradeFlowData interface
          // This is a placeholder implementation
          const mockData: TradeFlowData = {
            hsCode,
            exporterCountry,
            importerCountry,
            year: options?.year || new Date().getFullYear(),
            value: 0,
            quantity: 0,
            unit: 'kg'
          };
          return mockData;
        }
      }, { hsCode, source, exporterCountry, importerCountry });
    },
    
    /**
     * Get top exporters for a specific product
     */
    getTopExporters: async (
      hsCode: string,
      limit: number = 10,
      year?: number
    ) => {
      return trackResponseTime('getTopExporters', async () => {
        // Try TradeMap first, then fall back to Comtrade if it fails
        try {
          return await tradeMap.getTopExportersByHsCode(hsCode, limit, year);
        } catch (error) {
          // Use comtrade's getTopTradingPartners method which returns a similar structure
          // Convert undefined year to a default year to avoid type error
          const yearValue = year || new Date().getFullYear();
          return comtrade.getTopTradingPartners(hsCode, '', limit, yearValue, true);
        }
      }, { 
        hsCode, 
        limit, 
        year: year !== undefined ? year.toString() : 'latest' 
      });
    },
    
    /**
     * Get market trends for a specific product in a target market
     */
    getMarketTrends: async (
      hsCode: string,
      marketCountry: string,
      years: number = 5
    ): Promise<MarketTrendResult[]> => {
      return trackResponseTime('getMarketTrends', async () => {
        return tradeMap.getMarketTrends(hsCode, marketCountry, years);
      }, { hsCode, marketCountry, years: years.toString() });
    },
    
    /**
     * Get tariff data for a specific product
     */
    getTariffData: async (
      hsCode: string,
      importerCountry: string,
      exporterCountry: string,
      year?: number
    ): Promise<TariffData> => {
      return trackResponseTime('getTariffData', async () => {
        // Call WITS API to get tariff data
        const witsTariffData = await wits.getTariffData(hsCode, importerCountry, exporterCountry, year);
        
        // Convert WITS tariff data to our standardized format
        return {
          hsCode,
          importerCountry,
          exporterCountry,
          year: year || new Date().getFullYear(),
          mfnRate: witsTariffData.simpleAverage,
          preferentialRate: witsTariffData.weightedAverage,
          notes: `Based on ${witsTariffData.numberOfTariffLines} tariff lines with trade value of ${witsTariffData.tradeValue}`
        };
      }, { 
        hsCode, 
        importerCountry, 
        exporterCountry,
        year: year !== undefined ? year.toString() : 'latest'
      });
    },
    
    /**
     * Get market access analysis for a specific product in target markets
     */
    getMarketAccessAnalysis: async (
      hsCode: string,
      exporterCountry: string,
      targetMarkets: string[]
    ): Promise<MarketAccessAnalysisResult[]> => {
      return trackResponseTime('getMarketAccessAnalysis', async () => {
        // This is a composite analysis that uses multiple connectors
        const results: MarketAccessAnalysisResult[] = [];
        
        for (const market of targetMarkets) {
          // Get tariff data from WITS
          const witsTariffData = await wits.getTariffData(hsCode, market, exporterCountry, undefined);
          
          // Get market trends from TradeMap
          const trends = await tradeMap.getMarketTrends(hsCode, market, 3);
          
          // Get top exporters to measure competition
          const competitors = await tradeMap.getTopExportersByHsCode(hsCode, 5, undefined);
          
          // Calculate competitiveness
          const competitorsList = competitors.map(c => ({
            country: c.country,
            share: c.share || 0
          }));
          
          // Find rank of exporter country
          const exporterRank = competitors.findIndex(c => c.country === exporterCountry) + 1;
          
          // Calculate score based on rank (1 is best, 0 is worst)
          const competitivenessScore = exporterRank ? 1 - ((exporterRank - 1) / competitors.length) : 0;
          
          // Calculate growth rate from trends
          const growthRate = trends.length > 1 
            ? ((trends[trends.length - 1].value - trends[0].value) / trends[0].value) * 100 
            : 0;
          
          // Generate recommendation based on tariffs, competition, and growth
          let recommendation = '';
          if (witsTariffData.weightedAverage === 0 && competitivenessScore > 0.7 && growthRate > 5) {
            recommendation = 'High potential market with duty-free access and strong competitiveness.';
          } else if (witsTariffData.weightedAverage < 5 && competitivenessScore > 0.4 && growthRate > 0) {
            recommendation = 'Moderate potential with manageable tariffs and decent market position.';
          } else if (growthRate < 0 || competitivenessScore < 0.2) {
            recommendation = 'Challenging market with declining demand or strong competition.';
          } else {
            recommendation = 'Market requires further analysis and potential trade facilitation.';
          }
          
          results.push({
            market,
            tariffRate: witsTariffData.weightedAverage || witsTariffData.simpleAverage || null,
            nonTariffMeasures: [], // Would need additional data source for NTMs
            competitiveness: {
              rank: exporterRank || 0,
              score: competitivenessScore,
              competitors: competitorsList
            },
            marketSize: trends.length > 0 ? trends[trends.length - 1].value : 0,
            growthRate,
            recommendation
          });
        }
        
        return results;
      }, { hsCode, exporterCountry, marketsCount: targetMarkets.length });
    },
    
    /**
     * Get historical trade data for a specific product and country
     */
    getHistoricalTradeData: async (
      hsCode: string,
      countryCode: string,
      startYear: number,
      endYear: number,
      isExport: boolean
    ) => {
      return trackResponseTime('getHistoricalTradeData', async () => {
        return comtrade.getHistoricalTradeData(hsCode, countryCode, startYear, endYear, isExport);
      }, { 
        hsCode, 
        countryCode, 
        startYear: startYear.toString(), 
        endYear: endYear.toString(), 
        isExport: isExport.toString() 
      });
    }
  };
} 