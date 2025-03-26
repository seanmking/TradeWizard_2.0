import request from 'supertest';
import express from 'express';
import marketRoutes from '../routes';
import { MarketIntelligenceHandler } from '../handlers/MarketIntelligenceHandler';

// Mock MarketIntelligenceHandler
jest.mock('../handlers/MarketIntelligenceHandler');

describe('Market Intelligence Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/market', marketRoutes);
    jest.clearAllMocks();
  });

  describe('GET /market/trade-flow/:hs_code/:market', () => {
    it('should return trade flow data for valid parameters', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          hs_code: '210690',
          market: 'UAE',
          total_import_value: 1000000,
          total_export_value: 800000,
          year: 2024,
          growth_rate: 0.15
        },
        confidence_score: 0.95,
        metadata: {
          source: 'WITS',
          last_updated: new Date().toISOString(),
          data_completeness: 'complete'
        }
      };

      (MarketIntelligenceHandler.prototype.handle as jest.Mock).mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/market/trade-flow/210690/UAE')
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(MarketIntelligenceHandler.prototype.handle).toHaveBeenCalledWith({
        hs_code: '210690',
        market: 'UAE'
      });
    });

    it('should return 400 for invalid HS code', async () => {
      const response = await request(app)
        .get('/market/trade-flow/12/UAE')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /market/buyers/:industry/:country', () => {
    it('should return buyer data for valid parameters', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          industry: 'Food',
          country: 'UAE',
          buyers: [
            {
              company_name: 'Global Trade Corp',
              country: 'UAE',
              industry: 'Food',
              import_volume: 500000
            }
          ],
          total_count: 1
        },
        confidence_score: 0.9,
        metadata: {
          source: 'Market Database',
          last_updated: new Date().toISOString(),
          data_completeness: 'complete'
        }
      };

      (MarketIntelligenceHandler.prototype.handle as jest.Mock).mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/market/buyers/Food/UAE')
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(MarketIntelligenceHandler.prototype.handle).toHaveBeenCalledWith({
        industry: 'Food',
        country: 'UAE'
      });
    });

    it('should return 400 for invalid industry name', async () => {
      const response = await request(app)
        .get('/market/buyers/F/UAE')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /market/market-size/:product/:country', () => {
    it('should return market size data for valid parameters', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          product: 'Snacks',
          country: 'UAE',
          total_market_size: 5000000,
          market_growth_rate: 0.08,
          market_share_distribution: [
            { segment: 'Premium', share: 0.3, value: 1500000 }
          ]
        },
        confidence_score: 0.85,
        metadata: {
          source: 'Market Research',
          last_updated: new Date().toISOString(),
          data_completeness: 'complete'
        }
      };

      (MarketIntelligenceHandler.prototype.handle as jest.Mock).mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/market/market-size/Snacks/UAE')
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(MarketIntelligenceHandler.prototype.handle).toHaveBeenCalledWith({
        product: 'Snacks',
        country: 'UAE'
      });
    });

    it('should return 400 for invalid product name', async () => {
      const response = await request(app)
        .get('/market/market-size/S/UAE')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  it('should handle internal server errors', async () => {
    (MarketIntelligenceHandler.prototype.handle as jest.Mock).mockRejectedValue(
      new Error('Internal error')
    );

    const response = await request(app)
      .get('/market/trade-flow/210690/UAE')
      .expect(500);

    expect(response.body.status).toBe('error');
    expect(response.body.error).toBe('Internal server error');
  });
}); 