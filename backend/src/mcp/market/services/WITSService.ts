import axios from 'axios';
import type { TradeFlowData, TariffData, HistoricalTrendData, TopTradingPartnersData } from '../types';

interface WITSServiceConfig {
  baseURL: string;
  timeout: number;
}

export class WITSService {
  private client;

  constructor(config: Partial<WITSServiceConfig> = {}) {
    this.client = axios.create({
      baseURL: config.baseURL || 'https://wits.worldbank.org/API/V1/SDMX/V21/rest/data',
      timeout: config.timeout || 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
  }

  async getTradeFlowData(params: {
    reporter: string;
    partner: string;
    productCode: string;
    year: number;
  }): Promise<TradeFlowData> {
    const response = await this.client.get<TradeFlowData>(
      `/WBG_WITS/DF_WITS_TradeStats_TRADE/${params.reporter}.${params.partner}.${params.productCode}.${params.year}`
    );
    return response.data;
  }

  async getTariffData(params: {
    reporter: string;
    partner: string;
    productCode: string;
    year: number;
  }): Promise<TariffData> {
    const response = await this.client.get<TariffData>(
      `/WBG_WITS/DF_WITS_Tariff/${params.reporter}.${params.partner}.${params.productCode}.${params.year}`
    );
    return response.data;
  }

  async getHistoricalTrend(params: {
    reporter: string;
    partner: string;
    productCode: string;
    startYear: number;
    endYear: number;
  }): Promise<HistoricalTrendData[]> {
    const response = await this.client.get<HistoricalTrendData[]>(
      `/WBG_WITS/DF_WITS_TradeStats_TRADE/${params.reporter}.${params.partner}.${params.productCode}.${params.startYear}-${params.endYear}`
    );
    return response.data;
  }

  async getTopTradingPartners(params: {
    reporter: string;
    productCode: string;
    year: number;
    limit: number;
  }): Promise<TopTradingPartnersData> {
    const response = await this.client.get<TopTradingPartnersData>(
      `/WBG_WITS/DF_WITS_TradeStats_TOP/${params.reporter}.${params.productCode}.${params.year}?limit=${params.limit}`
    );
    return response.data;
  }
} 