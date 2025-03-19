import { NextApiRequest, NextApiResponse } from 'next';
import { WebScraperService } from '../../src/lib/services/web-scraper.service';

/**
 * API endpoint for product detection
 * 
 * This endpoint accepts a URL and returns detected products using
 * the WebScraperService, which combines DOM-based detection with
 * LLM enhancement to identify products on SME websites.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid URL',
        products: [],
        categories: []
      });
    }

    // Create web scraper service
    const scraperService = new WebScraperService();

    // Detect products from the URL
    const detectionResult = await scraperService.scrapeProducts(url);

    // If there's an error in the metrics, handle it
    if (detectionResult.metrics.error) {
      console.error('Error detecting products:', detectionResult.metrics.error);
      return res.status(500).json({
        error: 'Failed to analyze website',
        products: [],
        categories: [],
        metrics: detectionResult.metrics
      });
    }

    // Return the results
    return res.status(200).json({
      products: detectionResult.products,
      categories: detectionResult.categories,
      metrics: detectionResult.metrics
    });
  } catch (error) {
    console.error('Unexpected error in product detection API:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      products: [],
      categories: []
    });
  }
}
