import { Router } from 'express';
import complianceRoutes from './compliance/routes';
import marketRoutes from './market/routes';
import { z } from 'zod';
import { ComplianceHandler } from './compliance/handlers/ComplianceHandler';
import { MarketIntelligenceHandler } from './market/handlers/MarketIntelligenceHandler';

const router = Router();
const complianceHandler = new ComplianceHandler();
const marketIntelligenceHandler = new MarketIntelligenceHandler();

// Mount individual MCP routes
router.use('/compliance', complianceRoutes);
router.use('/market', marketRoutes);

// Aggregate endpoint
const aggregateRequestSchema = z.object({
  queries: z.array(z.object({
    type: z.enum(['compliance', 'market', 'logistics']),
    country: z.string(),
    hs_code: z.string().optional(),
    product_type: z.string().optional(),
    market: z.string().optional(),
    industry: z.string().optional(),
    product: z.string().optional()
  }))
});

router.post('/aggregate', async (req, res) => {
  try {
    const { queries } = aggregateRequestSchema.parse(req.body);
    const mode = (req.query.mode || 'both') as 'agent' | 'ui' | 'both';
    const enhanced = req.query.enhanced === 'true';

    // Process each query in parallel
    const results = await Promise.all(
      queries.map(async (query) => {
        switch (query.type) {
          case 'compliance':
            if (!query.hs_code) {
              throw new Error('HS code required for compliance queries');
            }
            return {
              type: 'compliance',
              result: await complianceHandler.handle({
                country: query.country,
                hs_code: query.hs_code,
                product_type: query.product_type
              })
            };
          case 'market':
            if (query.hs_code && query.market) {
              return {
                type: 'market',
                subtype: 'trade-flow',
                result: await marketIntelligenceHandler.handle({
                  hs_code: query.hs_code,
                  market: query.market
                })
              };
            } else if (query.industry && query.country) {
              return {
                type: 'market',
                subtype: 'buyers',
                result: await marketIntelligenceHandler.handle({
                  industry: query.industry,
                  country: query.country
                })
              };
            } else if (query.product && query.country) {
              return {
                type: 'market',
                subtype: 'market-size',
                result: await marketIntelligenceHandler.handle({
                  product: query.product,
                  country: query.country
                })
              };
            }
            throw new Error('Invalid market intelligence query parameters');
          case 'logistics':
            // TODO: Implement logistics handler
            return {
              type: 'logistics',
              result: {
                status: 'error',
                error: 'Logistics MCP not implemented yet'
              }
            };
          default:
            throw new Error(`Unknown MCP type: ${query.type}`);
        }
      })
    );

    // Combine results
    const response = {
      status: 'success',
      results,
      metadata: {
        source: 'Aggregate MCP',
        last_updated: new Date().toISOString(),
        data_completeness: results.every(r => r.result.status === 'success') ? 'complete' : 'partial'
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Aggregate MCP error:', error);
    res.status(400).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Invalid request',
      code: 'VALIDATION_ERROR'
    });
  }
});

export default router; 