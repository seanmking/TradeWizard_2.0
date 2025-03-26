import { Router } from 'express';
import { MarketIntelligenceHandler } from './handlers/MarketIntelligenceHandler';
import { z } from 'zod';

const router = Router();
const marketIntelligenceHandler = new MarketIntelligenceHandler();

// Input validation schemas
const tradeFlowSchema = z.object({
  hs_code: z.string().min(6),
  market: z.string().min(2)
});

const buyerListSchema = z.object({
  industry: z.string().min(2),
  country: z.string().min(2)
});

const marketSizeSchema = z.object({
  product: z.string().min(2),
  country: z.string().min(2)
});

// GET /mcp/market/trade-flow/:hs_code/:market
router.get('/trade-flow/:hs_code/:market', async (req, res) => {
  try {
    const { hs_code, market } = tradeFlowSchema.parse({
      hs_code: req.params.hs_code,
      market: req.params.market
    });

    const mode = (req.query.mode || 'both') as 'agent' | 'ui' | 'both';
    const enhanced = req.query.enhanced === 'true';

    const response = await marketIntelligenceHandler.handle({
      hs_code,
      market
    });

    res.json(response);
  } catch (error) {
    console.error('Trade flow error:', error);
    res.status(400).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Invalid request',
      code: 'VALIDATION_ERROR'
    });
  }
});

// GET /mcp/market/buyers/:industry/:country
router.get('/buyers/:industry/:country', async (req, res) => {
  try {
    const { industry, country } = buyerListSchema.parse({
      industry: req.params.industry,
      country: req.params.country
    });

    const mode = (req.query.mode || 'both') as 'agent' | 'ui' | 'both';
    const enhanced = req.query.enhanced === 'true';

    const response = await marketIntelligenceHandler.handle({
      industry,
      country
    });

    res.json(response);
  } catch (error) {
    console.error('Buyers error:', error);
    res.status(400).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Invalid request',
      code: 'VALIDATION_ERROR'
    });
  }
});

// GET /mcp/market/market-size/:product/:country
router.get('/market-size/:product/:country', async (req, res) => {
  try {
    const { product, country } = marketSizeSchema.parse({
      product: req.params.product,
      country: req.params.country
    });

    const mode = (req.query.mode || 'both') as 'agent' | 'ui' | 'both';
    const enhanced = req.query.enhanced === 'true';

    const response = await marketIntelligenceHandler.handle({
      product,
      country
    });

    res.json(response);
  } catch (error) {
    console.error('Market size error:', error);
    res.status(400).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Invalid request',
      code: 'VALIDATION_ERROR'
    });
  }
});

export default router; 