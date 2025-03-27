import axios from 'axios';

// WITS API Types
interface WITSPartner {
  name: string;
  value: number;
}

interface WITSTradeFlow {
  hs_code: string;
  market: string;
  total_import_value: number;
  total_export_value: number;
  year: number;
  growth_rate: number;
  top_exporters: Array<{ country: string; value: number; market_share: number }>;
  top_importers: Array<{ country: string; value: number; market_share: number }>;
  trade_balance: number;
  historical_trend: Array<{ year: number; import_value: number; export_value: number }>;
}

interface WITSTariff {
  simple_average: number;
  weighted_average: number;
  minimum_rate: number;
  maximum_rate: number;
  number_of_tariff_lines: number;
}

interface WITSError {
  message: string;
  code?: string;
  details?: unknown;
}

// Type predicate for axios errors
function isAxiosError(error: unknown): error is { 
  response?: { status: number; data: unknown };
  message?: string;
} {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}

export class WITSService {
  private client = axios.create({
    baseURL: 'http://wits.worldbank.org/API/V1/SDMX/V21/rest/data',
    timeout: 10000,
    headers: {
      'Accept': 'application/json'
    }
  });

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (isAxiosError(error)) {
          const witError: WITSError = {
            message: error.message || 'Unknown error',
            code: String(error.response?.status || 'unknown'),
            details: error.response?.data
          };
          throw witError;
        }
        throw error;
      }
    );
  }

  async getTradeFlowData(params: {
    reporter: string;
    partner: string;
    year: number;
    productCode: string;
  }): Promise<WITSTradeFlow> {
    try {
      const response = await this.client.get(
        `/DF_WITS_TradeStats/A.${params.reporter}.${params.partner}.${params.productCode}.${params.year}`
      );

      return {
        hs_code: params.productCode,
        market: params.partner,
        total_import_value: this.extractValue(response.data, 'MVAL_MUSD'),
        total_export_value: this.extractValue(response.data, 'XVAL_MUSD'),
        year: params.year,
        growth_rate: this.extractValue(response.data, 'GRWTH') / 100,
        top_exporters: [],
        top_importers: [],
        trade_balance: 0,
        historical_trend: []
      };
    } catch (error) {
      throw new Error('Failed to fetch trade flow data from WITS');
    }
  }

  async getTariffData(params: {
    reporter: string;
    partner: string;
    year: number;
    productCode: string;
  }): Promise<WITSTariff> {
    try {
      const response = await this.client.get(
        `/DF_WITS_Tariff/A.${params.reporter}.${params.partner}.${params.productCode}.${params.year}`
      );

      return {
        simple_average: this.extractValue(response.data, 'AV_SMPL'),
        weighted_average: this.extractValue(response.data, 'AV_WGHTD'),
        minimum_rate: this.extractValue(response.data, 'MIN_RATE'),
        maximum_rate: this.extractValue(response.data, 'MAX_RATE'),
        number_of_tariff_lines: this.extractValue(response.data, 'NLINE')
      };
    } catch (error) {
      throw new Error('Failed to fetch tariff data from WITS');
    }
  }

  async getHistoricalTrend(params: {
    reporter: string;
    partner: string;
    productCode: string;
    startYear: number;
    endYear: number;
  }): Promise<Array<{ year: number; import_value: number; export_value: number }>> {
    try {
      const years = Array.from(
        { length: params.endYear - params.startYear + 1 },
        (_, i) => params.startYear + i
      );

      const requests = years.map(year =>
        this.client.get(
          `/DF_WITS_TradeStats/A.${params.reporter}.${params.partner}.${params.productCode}.${year}`
        )
      );

      const responses = await Promise.all(requests);

      return responses.map((response, index) => ({
        year: years[index],
        import_value: this.extractValue(response.data, 'MVAL_MUSD'),
        export_value: this.extractValue(response.data, 'XVAL_MUSD')
      }));
    } catch (error) {
      return [];
    }
  }

  async getTopTradingPartners(params: {
    reporter: string;
    productCode: string;
    year: number;
    limit: number;
  }): Promise<{
    top_exporters: Array<{ country: string; value: number; market_share: number }>;
    top_importers: Array<{ country: string; value: number; market_share: number }>;
  }> {
    try {
      const response = await this.client.get(
        `/DF_WITS_TradeStats/A.${params.reporter}.ALL.${params.productCode}.${params.year}`
      );

      const partners = this.extractPartners(response.data);
      const sortedPartners = partners.sort((a: WITSPartner, b: WITSPartner) => b.value - a.value);
      const topPartners = sortedPartners.slice(0, params.limit);

      const totalValue = sortedPartners.reduce((sum: number, p: WITSPartner) => sum + p.value, 0);

      return {
        top_exporters: topPartners.map((partner: WITSPartner) => ({
          country: partner.name,
          value: partner.value,
          market_share: partner.value / totalValue
        })),
        top_importers: topPartners.map((partner: WITSPartner) => ({
          country: partner.name,
          value: partner.value,
          market_share: partner.value / totalValue
        }))
      };
    } catch (error) {
      return {
        top_exporters: [],
        top_importers: []
      };
    }
  }

  private extractValue(data: any, indicator: string): number {
    try {
      const observations = data.dataSets[0].observations;
      const seriesIndex = data.structure.dimensions.series.findIndex(
        (dim: any) => dim.id === indicator
      );
      const value = observations[`${seriesIndex}:0:0`][0];
      return value;
    } catch (error) {
      return 0;
    }
  }

  private extractPartners(data: any): WITSPartner[] {
    try {
      const partners = data.structure.dimensions.series[0].values;
      const observations = data.dataSets[0].observations;

      return partners.map((partner: any, index: number): WITSPartner => ({
        name: partner.name,
        value: observations[`${index}:0:0`][0] || 0
      }));
    } catch (error) {
      return [];
    }
  }
}
