import { Router } from 'express';
import { ComplianceHandler } from './handlers/ComplianceHandler';
import { z } from 'zod';

const router = Router();
const complianceHandler = new ComplianceHandler();

// Input validation schemas
const exportRequirementsSchema = z.object({
  country: z.string().min(2),
  hs_code: z.string().min(6),
  product_type: z.string().optional()
});

// GET /mcp/compliance/export-requirements/:country/:hs_code
router.get('/export-requirements/:country/:hs_code', async (req, res) => {
  try {
    const { country, hs_code } = exportRequirementsSchema.parse({
      country: req.params.country,
      hs_code: req.params.hs_code,
      product_type: req.query.product_type
    });

    const mode = (req.query.mode || 'both') as 'agent' | 'ui' | 'both';
    const enhanced = req.query.enhanced === 'true';

    const response = await complianceHandler.handle({
      country,
      hs_code,
      product_type: req.query.product_type as string
    });

    res.json(response);
  } catch (error) {
    console.error('Export requirements error:', error);
    res.status(400).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Invalid request',
      code: 'VALIDATION_ERROR'
    });
  }
});

// GET /mcp/compliance/tariffs/:country/:hs_code
router.get('/tariffs/:country/:hs_code', async (req, res) => {
  try {
    const { country, hs_code } = exportRequirementsSchema.parse({
      country: req.params.country,
      hs_code: req.params.hs_code
    });

    const mode = (req.query.mode || 'both') as 'agent' | 'ui' | 'both';
    const enhanced = req.query.enhanced === 'true';

    const response = await complianceHandler.handle({
      country,
      hs_code
    });

    // Extract only tariff-related information
    const tariffData = {
      status: response.status,
      data: {
        country: response.data.country,
        hs_code: response.data.hs_code,
        tariff_rate: response.data.tariff_rate
      },
      confidence_score: response.confidence_score,
      metadata: response.metadata
    };

    res.json(tariffData);
  } catch (error) {
    console.error('Tariffs error:', error);
    res.status(400).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Invalid request',
      code: 'VALIDATION_ERROR'
    });
  }
});

// GET /mcp/compliance/documentation/:product_type/:country
router.get('/documentation/:product_type/:country', async (req, res) => {
  try {
    const { country, product_type } = z.object({
      country: z.string().min(2),
      product_type: z.string().min(2)
    }).parse({
      country: req.params.country,
      product_type: req.params.product_type
    });

    const mode = (req.query.mode || 'both') as 'agent' | 'ui' | 'both';
    const enhanced = req.query.enhanced === 'true';

    const response = await complianceHandler.handle({
      country,
      product_type,
      hs_code: req.query.hs_code as string || ''
    });

    // Extract only documentation-related information
    const documentationData = {
      status: response.status,
      data: {
        country: response.data.country,
        product_type,
        certifications_required: response.data.certifications_required,
        import_permits: response.data.import_permits
      },
      confidence_score: response.confidence_score,
      metadata: response.metadata
    };

    res.json(documentationData);
  } catch (error) {
    console.error('Documentation error:', error);
    res.status(400).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Invalid request',
      code: 'VALIDATION_ERROR'
    });
  }
});

export default router; 