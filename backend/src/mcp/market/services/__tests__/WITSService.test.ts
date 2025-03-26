import { WITSService } from '../WITSService';
import axios from 'axios';
import { createMockAxiosResponse } from './mockHelpers';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WITSService', () => {
  let service: WITSService;

  beforeEach(() => {
    service = new WITSService();
    jest.clearAllMocks();
  });

  describe('getTradeFlowData', () => {
    const params = {
      reporter: 'WLD',
      partner: 'USA',
      year: 2023,
      productCode: '210690'
    };

    it('should fetch and transform trade flow data', async () => {
      const mockData = {
        dataSets: [{
          observations: {
            '0:0:0': [1000000], // Export value
            '0:1:0': [800000],  // Import value
            '0:2:0': [15]       // Growth rate
          }
        }],
        structure: {
          dimensions: {
            series: [
              { id: 'XVAL_MUSD' },
              { id: 'MVAL_MUSD' },
              { id: 'GRWTH' }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(createMockAxiosResponse(mockData));

      const result = await service.getTradeFlowData(params);

      expect(result).toEqual({
        hs_code: '210690',
        market: 'USA',
        total_import_value: 800000,
        total_export_value: 1000000,
        year: 2023,
        growth_rate: 0.15,
        top_exporters: [],
        top_importers: [],
        trade_balance: 0,
        historical_trend: []
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/DF_WITS_TradeStats/A.WLD.USA.210690.2023'),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Failed to fetch trade flow data from WITS'));
      await expect(service.getTradeFlowData(params)).rejects.toThrow('Failed to fetch trade flow data from WITS');
    });
  });

  describe('getTariffData', () => {
    const params = {
      reporter: 'USA',
      partner: 'WLD',
      year: 2023,
      productCode: '210690'
    };

    it('should fetch and transform tariff data', async () => {
      const mockData = {
        dataSets: [{
          observations: {
            '0:0:0': [5.5],    // Simple average
            '0:1:0': [6.2],    // Weighted average
            '0:2:0': [0],      // Minimum rate
            '0:3:0': [15],     // Maximum rate
            '0:4:0': [10]      // Number of tariff lines
          }
        }]
      };

      mockedAxios.get.mockResolvedValueOnce(createMockAxiosResponse(mockData));

      const result = await service.getTariffData(params);

      expect(result).toEqual({
        simple_average: 5.5,
        weighted_average: 6.2,
        minimum_rate: 0,
        maximum_rate: 15,
        number_of_tariff_lines: 10
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/DF_WITS_Tariff/A.USA.WLD.210690.2023'),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Failed to fetch tariff data from WITS'));
      await expect(service.getTariffData(params)).rejects.toThrow('Failed to fetch tariff data from WITS');
    });
  });

  describe('getHistoricalTrend', () => {
    const params = {
      reporter: 'WLD',
      partner: 'USA',
      productCode: '210690',
      startYear: 2021,
      endYear: 2023
    };

    it('should fetch historical trend data', async () => {
      const mockData = {
        dataSets: [{
          observations: {
            '0:0:0': [1000000],
            '0:1:0': [800000]
          }
        }],
        structure: {
          dimensions: {
            series: [
              { id: 'XVAL_MUSD' },
              { id: 'MVAL_MUSD' }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValue(createMockAxiosResponse(mockData));

      const result = await service.getHistoricalTrend(params);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('year');
      expect(result[0]).toHaveProperty('import_value');
      expect(result[0]).toHaveProperty('export_value');
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      const result = await service.getHistoricalTrend(params);
      expect(result).toEqual([]);
    });
  });

  describe('getTopTradingPartners', () => {
    const params = {
      reporter: 'WLD',
      productCode: '210690',
      year: 2023,
      limit: 5
    };

    it('should fetch and transform top trading partners', async () => {
      const mockData = {
        dataSets: [{
          observations: {
            '0:0:0': [500000],
            '0:1:0': [300000],
            '0:2:0': [200000]
          }
        }],
        structure: {
          dimensions: {
            series: [{
              id: 'PARTNER',
              values: [
                { name: 'China' },
                { name: 'USA' },
                { name: 'Germany' }
              ]
            }]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(createMockAxiosResponse(mockData));

      const result = await service.getTopTradingPartners(params);

      expect(result.top_exporters).toHaveLength(3);
      expect(result.top_importers).toHaveLength(3);
      expect(result.top_exporters[0]).toHaveProperty('country', 'China');
      expect(result.top_exporters[0]).toHaveProperty('value', 500000);
      expect(result.top_exporters[0]).toHaveProperty('market_share');
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));
      const result = await service.getTopTradingPartners(params);
      expect(result.top_exporters).toEqual([]);
      expect(result.top_importers).toEqual([]);
    });
  });
}); 