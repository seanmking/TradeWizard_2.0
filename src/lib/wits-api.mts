import axios from 'axios';
import type { AxiosInstance } from 'axios';
import rateLimit from 'axios-rate-limit';
import { parseStringPromise } from 'xml2js';

// Types
export interface WITSError extends Error {
  status?: number;
  data?: any;
}

export interface WITSReporter {
  countryCode: string;
  iso3Code: string;
  name: string;
  isReporter: boolean;
  isPartner: boolean;
  isGroup: boolean;
  groupType?: string;
  notes?: string;
}

export interface WITSProduct {
  productCode: string;
  description: string;
  isGroup: boolean;
  groupType?: string;
  notes?: string;
}

export interface WITSTariffData {
  simpleAverage: number;
  tariffType: string;
  totalLines: number;
  prefLines: number;
  mfnLines: number;
  naLines: number;
  sumOfRates: number;
  minRate: number;
  maxRate: number;
  nomenCode: string;
}

// Create rate-limited axios instance (5 requests per second)
const http: AxiosInstance = rateLimit(axios.create(), { maxRPS: 5 }) as AxiosInstance;

export class WITSApi {
  private baseUrl: string;
  private sdmxUrl: string;
  private dataSource: string;

  constructor(config?: { baseUrl?: string; sdmxUrl?: string; dataSource?: string }) {
    this.baseUrl = config?.baseUrl || process.env.WITS_BASE_URL || 'https://wits.worldbank.org/API/V1';
    this.sdmxUrl = config?.sdmxUrl || process.env.WITS_SDMX_BASE_URL || 'https://wits.worldbank.org/API/V1/SDMX/V21';
    this.dataSource = config?.dataSource || process.env.WITS_DATA_SOURCE || 'TRN';
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: unknown): never {
    const witsError: WITSError = new Error(
      (error as Error)?.message || 'An error occurred while fetching data from WITS API'
    );
    
    if ((error as AxiosError)?.response) {
      witsError.status = (error as AxiosError).response?.status;
      witsError.data = (error as AxiosError).response?.data;
    }
    
    throw witsError;
  }

  /**
   * Parse XML response to JSON
   */
  private async parseXMLResponse(xml: string): Promise<any> {
    try {
      return await parseStringPromise(xml);
    } catch (error) {
      throw new Error('Failed to parse XML response from WITS API');
    }
  }

  /**
   * Get list of all reporters/countries
   */
  async getReporters(): Promise<WITSReporter[]> {
    try {
      const response = await http.get(`${this.baseUrl}/wits/datasource/${this.dataSource}/country/ALL`);
      const reporters = response.data?.wits?.reporters || [];
      return reporters.map((reporter: any) => ({
        countryCode: reporter.countryCode?.[0],
        iso3Code: reporter.iso3Code?.[0],
        name: reporter.name?.[0],
        isReporter: reporter.isReporter?.[0] === 'true',
        isPartner: reporter.isPartner?.[0] === 'true',
        isGroup: reporter.isGroup?.[0] === 'true',
        groupType: reporter.groupType?.[0],
        notes: reporter.notes?.[0]
      }));
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get list of all products
   */
  async getProducts(): Promise<WITSProduct[]> {
    try {
      const response = await http.get(`${this.baseUrl}/wits/datasource/${this.dataSource}/product/all`);
      const products = response.data?.wits?.products || [];
      return products.map((product: any) => ({
        productCode: product.productCode?.[0],
        description: product.description?.[0],
        isGroup: product.isGroup?.[0] === 'true',
        groupType: product.groupType?.[0],
        notes: product.notes?.[0]
      }));
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get tariff data for specific parameters
   */
  async getTariffData(params: {
    reporter: string;
    partner: string;
    product: string;
    year: number;
    dataType?: 'reported' | 'aveestimated';
  }): Promise<WITSTariffData[]> {
    try {
      const { reporter, partner, product, year, dataType = 'reported' } = params;
      const url = `${this.sdmxUrl}/datasource/${this.dataSource}/reporter/${reporter}/partner/${partner}/product/${product}/year/${year}/datatype/${dataType}`;
      
      const response = await http.get(url);
      const xmlData = await this.parseXMLResponse(response.data);
      
      // Extract data from SDMX format
      const series = xmlData?.['message:StructureSpecificData']?.['message:DataSet']?.[0]?.Series || [];
      
      return series.map((series: any) => {
        const obs = series.Obs?.[0];
        return {
          simpleAverage: parseFloat(obs.$.OBS_VALUE || '0'),
          tariffType: obs.$.TARIFFTYPE || '',
          totalLines: parseInt(obs.$.TOTALNOOFLINES || '0', 10),
          prefLines: parseInt(obs.$.NBR_PREF_LINES || '0', 10),
          mfnLines: parseInt(obs.$.NBR_MFN_LINES || '0', 10),
          naLines: parseInt(obs.$.NBR_NA_LINES || '0', 10),
          sumOfRates: parseFloat(obs.$.SUM_OF_RATES || '0'),
          minRate: parseFloat(obs.$.MIN_RATE || '0'),
          maxRate: parseFloat(obs.$.MAX_RATE || '0'),
          nomenCode: obs.$.NOMENCODE || ''
        };
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Check data availability for a specific year or reporter
   */
  async checkDataAvailability(params?: {
    reporter?: string;
    year?: number;
  }): Promise<any> {
    try {
      let url = `${this.baseUrl}/wits/datasource/${this.dataSource}/dataavailability`;
      
      if (params) {
        const { reporter, year } = params;
        if (reporter || year) {
          url += '/country/';
          url += reporter || 'ALL';
          url += '/year/';
          url += year || 'ALL';
        }
      }
      
      const response = await http.get(url);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Export singleton instance
export const witsApi = new WITSApi();

// Export default for flexibility
export default WITSApi; 