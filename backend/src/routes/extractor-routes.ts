import { Router, Request, Response } from 'express';
import intelligenceService from '../services/intelligence.service';
import { ExtractionOptions } from '../services/intelligence.service';
import logger from '../utils/logger';
import { isValidUrl } from '../utils/validators';

const router = Router();

/**
 * Extract data from a website URL
 * @route POST /api/extract/website
 */
router.post('/website', async (req: Request, res: Response) => {
  try {
    const { url, options } = req.body;
    
    // Validate URL
    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ 
        error: 'Invalid URL. Please provide a valid website URL.' 
      });
    }
    
    // Parse extraction options
    const extractionOptions: ExtractionOptions = {
      extractProducts: options?.extractProducts ?? true,
      extractBusinessInfo: options?.extractBusinessInfo ?? true,
      minConfidence: options?.minConfidence ?? 0.5,
      maxResults: options?.maxResults ?? 10
    };
    
    logger.info(`Received extraction request for ${url}`);
    
    // Start extraction process
    const result = await intelligenceService.extractFromWebsite(url, extractionOptions);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in website extraction route:', error);
    return res.status(500).json({ 
      error: 'Failed to extract data from website.', 
      details: error.message 
    });
  }
});

/**
 * Extract data from an Instagram profile
 * @route POST /api/extract/instagram
 */
router.post('/instagram', async (req: Request, res: Response) => {
  // This is a placeholder for future implementation
  return res.status(501).json({ 
    message: 'Instagram extraction is not yet implemented.' 
  });
});

/**
 * Extract data from a Facebook page
 * @route POST /api/extract/facebook
 */
router.post('/facebook', async (req: Request, res: Response) => {
  // This is a placeholder for future implementation
  return res.status(501).json({ 
    message: 'Facebook extraction is not yet implemented.' 
  });
});

/**
 * Extract data from an uploaded document
 * @route POST /api/extract/document
 */
router.post('/document', async (req: Request, res: Response) => {
  // This is a placeholder for future implementation
  return res.status(501).json({ 
    message: 'Document extraction is not yet implemented.' 
  });
});

/**
 * Get extraction history
 * @route GET /api/extract/history
 */
router.get('/history', async (req: Request, res: Response) => {
  // This is a placeholder for future implementation
  return res.status(501).json({ 
    message: 'Extraction history endpoint is not yet implemented.' 
  });
});

export default router;
