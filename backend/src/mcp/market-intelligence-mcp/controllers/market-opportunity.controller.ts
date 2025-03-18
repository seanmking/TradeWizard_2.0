import { Request, Response, NextFunction } from 'express';
import { setupTradeMapConnector } from '../connectors/trade-map';
import { tradeAnalysisService } from '../services/trade-analysis.service';

// Define custom type for route handlers
type RouteHandler = (req: Request, res: Response, next?: NextFunction) => Promise<any>;

// Define interfaces for the responses
interface MarketOpportunity {
  country: string;
  marketSize: number;
  growthRate: number;
  totalImports: number;
  currentMarketShare: number;
  topCompetitors: Array<{
    country: string;
    share: number;
  }>;
  opportunityScore: number;
}

interface MarketAccessAnalysis {
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
  recommendation: string;
}

/**
 * Get market opportunity analysis for a specific product
 */
export const getMarketOpportunities: RouteHandler = async (req, res) => {
  try {
    const { hsCode, exporterCountry } = req.params;
    const { limit } = req.query;
    
    // Parse and validate query parameters
    const limitParam = limit ? parseInt(limit as string) : 10;
    
    console.log(`Analyzing market opportunities for HS code: ${hsCode}, exporter: ${exporterCountry}, limit: ${limitParam}`);
    
    // Set up Trade Map connector
    const tradeMapConnector = await setupTradeMapConnector({
      apiKey: process.env.TRADE_MAP_API_KEY || '',
      baseUrl: process.env.TRADE_MAP_BASE_URL || 'https://api.trademap.org/api/v1'
    });
    
    // Get market growth data from Trade Map
    const marketGrowthData = await tradeMapConnector.getMarketTrends(hsCode, limitParam.toString());
    
    // Get top exporters for the product
    const topExporters = await tradeAnalysisService.getTopExporters(hsCode, 20);
    
    // Calculate market opportunities based on growth rate, market size, and competition
    const opportunities: MarketOpportunity[] = marketGrowthData
      // Remove the exporter's own country from potential markets
      .filter((market: any) => market.country !== exporterCountry)
      // Sort by market share for presentation
      .sort((a: any, b: any) => (b.share || 0) - (a.share || 0))
      // Map to our opportunity structure with score
      .map((market: any) => {
        // Get competitors in this market
        const marketCompetitors = topExporters.slice(0, 5);
        
        // Calculate opportunity score (higher is better)
        const opportunityScore = 
          (market.growth || 0) * 0.4 +
          (market.value / (market.totalValue || 1)) * 0.3 +
          (1 - (marketCompetitors.length / 10)) * 0.3;
        
        return {
          country: market.country || 'Unknown',
          marketSize: market.value || 0,
          growthRate: market.growth || 0,
          totalImports: market.totalValue || 0,
          currentMarketShare: market.exporterShare || 0,
          topCompetitors: marketCompetitors.map((comp: any) => ({
            country: comp.country,
            share: comp.share || 0
          })),
          opportunityScore
        };
      })
      // Sort by opportunity score (highest first)
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      // Limit to requested number
      .slice(0, limitParam);
    
    return res.status(200).json({
      status: 'success',
      data: opportunities
    });
  } catch (error: any) {
    console.error('Error analyzing market opportunities:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to analyze market opportunities'
    });
  }
};

/**
 * Get market access analysis for specific target markets
 */
export const getMarketAccessAnalysis: RouteHandler = async (req, res) => {
  try {
    const { hsCode, exporterCountry } = req.params;
    const { markets } = req.query;
    
    // Parse target markets from query parameter
    const targetMarkets = markets ? (markets as string).split(',') : ['USA', 'EU', 'CHN', 'JPN'];
    
    console.log(`Analyzing market access for HS code: ${hsCode}, exporter: ${exporterCountry}, markets: ${targetMarkets.join(', ')}`);
    
    // Set up Trade Map connector
    const tradeMapConnector = await setupTradeMapConnector({
      apiKey: process.env.TRADE_MAP_API_KEY || '',
      baseUrl: process.env.TRADE_MAP_BASE_URL || 'https://api.trademap.org/api/v1'
    });
    
    const analysisResults: MarketAccessAnalysis[] = [];
    
    for (const market of targetMarkets) {
      try {
        // Get tariff data for the market
        // Note: We need to implement or mock this method since it's missing
        const tariffData = {
          rate: Math.random() * 10, // Mock tariff rate between 0-10%
          nonTariffMeasures: ['Documentation requirements', 'Quality standards']
        };
        
        // Get trade flow data to analyze competition
        const tradeFlowData = await tradeAnalysisService.getTradeFlowData(
          hsCode, 
          exporterCountry, 
          market,
          undefined, 
          undefined
        );
        
        // Get top exporters to the market
        const competitors = await tradeAnalysisService.getTopExporters(hsCode, 5);
        
        // Find rank of exporter country
        const exporterRank = competitors.findIndex(c => c.country === exporterCountry) + 1;
        
        // Calculate score based on rank (1 is best, 0 is worst)
        const competitivenessScore = exporterRank ? 1 - ((exporterRank - 1) / competitors.length) : 0;
        
        // Generate recommendation based on tariffs and competition
        let recommendation = '';
        if (tariffData.rate < 3 && competitivenessScore > 0.7) {
          recommendation = 'High potential market with low trade barriers.';
        } else if (tariffData.rate < 7 && competitivenessScore > 0.4) {
          recommendation = 'Moderate potential with manageable tariffs.';
        } else if (tariffData.rate > 7) {
          recommendation = 'High tariff barriers present. Consider trade negotiations.';
        } else if (competitivenessScore < 0.3) {
          recommendation = 'Strong competition in this market. Consider differentiation strategy.';
        } else {
          recommendation = 'Market requires further analysis.';
        }
        
        analysisResults.push({
          market,
          tariffRate: tariffData.rate,
          nonTariffMeasures: tariffData.nonTariffMeasures,
          competitiveness: {
            rank: exporterRank || 0,
            score: competitivenessScore,
            competitors: competitors.map(c => ({
              country: c.country,
              share: c.share || 0
            }))
          },
          recommendation
        });
      } catch (error) {
        console.error(`Error analyzing market access for ${market}:`, error);
        // Continue with other markets even if one fails
      }
    }
    
    return res.status(200).json({
      status: 'success',
      data: analysisResults
    });
  } catch (error: any) {
    console.error('Error analyzing market access:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to analyze market access'
    });
  }
}; 