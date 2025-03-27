import express from 'express';
import { MarketIntelligenceHandler } from './handlers/MarketIntelligenceHandler';
import { z } from 'zod';

const router = express.Router();
const marketIntelligenceHandler = new MarketIntelligenceHandler();

// Input validation schemas
const tradeFlowSchema = z.object({
  hs_code: z.string().min(6),
  market: z.string().min(2),
});

const buyerListSchema = z.object({
  industry: z.string().min(2),
  country: z.string().min(2),
});

const marketSizeSchema = z.object({
  product: z.string().min(2),
  country: z.string().min(2),
});

// GET /mcp/market/trade-flow/:hs_code/:market
router.get('/trade-flow/:hs_code/:market', async (req, res) => {
  try {
    const { hs_code, market } = tradeFlowSchema.parse({
      hs_code: req.params.hs_code,
      market: req.params.market,
    });

    const response = await marketIntelligenceHandler.handle({
      hs_code,
      market,
      type: 'trade_flow',
    });

    res.json(response);
  } catch (error) {
    console.error('Trade flow error:', error);
    res.status(400).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Invalid request',
      code: 'VALIDATION_ERROR',
    });
  }
});

// GET /mcp/market/buyers/:industry/:country
router.get('/buyers/:industry/:country', async (req, res) => {
  try {
    const { industry, country } = buyerListSchema.parse({
      industry: req.params.industry,
      country: req.params.country,
    });

    const response = await marketIntelligenceHandler.handle({
      industry,
      country,
      type: 'buyers',
    });

    res.json(response);
  } catch (error) {
    console.error('Buyers error:', error);
    res.status(400).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Invalid request',
      code: 'VALIDATION_ERROR',
    });
  }
});

// GET /mcp/market/market-size/:product/:country
router.get('/market-size/:product/:country', async (req, res) => {
  try {
    const { product, country } = marketSizeSchema.parse({
      product: req.params.product,
      country: req.params.country,
    });

    const response = await marketIntelligenceHandler.handle({
      product,
      country,
      type: 'market_size',
    });

    res.json(response);
  } catch (error) {
    console.error('Market size error:', error);
    res.status(400).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Invalid request',
      code: 'VALIDATION_ERROR',
    });
  }
});

router.get('/trade-flow', async (req, res) => {
  try {
    const data = await marketIntelligenceHandler.handle({
      ...req.query,
      type: 'trade_flow',
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/tariff', async (req, res) => {
  try {
    const data = await marketIntelligenceHandler.handle({
      ...req.query,
      type: 'tariff',
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/historical', async (req, res) => {
  try {
    const data = await marketIntelligenceHandler.handle({
      ...req.query,
      type: 'historical',
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/partners', async (req, res) => {
  try {
    const data = await marketIntelligenceHandler.handle({
      ...req.query,
      type: 'partners',
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
