import { MCPHandler, MCPResponse } from '../../shared/types';
import { WITSService } from '../services/WITSService';

export interface MarketIntelligenceParams {
  hs_code: string;
  market: string;
  year?: number;
  limit?: number;
  type?: 'trade_flow' | 'tariff' | 'historical' | 'partners';
}

export class MarketIntelligenceHandler implements MCPHandler<MCPResponse<any>> {
  private witsService: WITSService;

  constructor() {
    this.witsService = new WITSService();
  }

  async handle(params: Record<string, unknown>): Promise<MCPResponse<any>> {
    try {
      const validatedParams = this.validateParams(params);
      const data = await this.witsService.getTradeFlowData({
        reporter: validatedParams.market,
        partner: 'WLD',
        productCode: validatedParams.hs_code,
        year: validatedParams.year || new Date().getFullYear() - 1
      });
      
      return {
        data,
        status: 200
      };
    } catch (error) {
      return {
        data: null,
        status: 500,
        message: error instanceof Error ? error.message : 'Error fetching trade flow data'
      };
    }
  }

  private validateParams(params: Record<string, unknown>): MarketIntelligenceParams {
    const { hs_code, market, year, limit, type } = params as Partial<MarketIntelligenceParams>;
    
    if (!hs_code || !market) {
      throw new Error('Missing required parameters: hs_code and market are required');
    }

    return {
      hs_code,
      market,
      year: typeof year === 'number' ? year : undefined,
      limit: typeof limit === 'number' ? limit : undefined,
      type: type as MarketIntelligenceParams['type']
    };
  }
} 