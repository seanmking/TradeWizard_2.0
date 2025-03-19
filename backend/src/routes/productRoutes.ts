/**
 * Product Detection Routes
 * 
 * API routes for product detection and analysis
 */

import express, { Request, Response } from 'express';
import { HybridProductDetectorService } from '../services/hybrid-product-detector.service';
import { WebScraperService } from '../services/web-scraper.service';
import { DomProductDetectorService } from '../services/dom-product-detector.service';

const router = express.Router();
const hybridDetector = new HybridProductDetectorService();
const webScraper = new WebScraperService();
const domDetector = new DomProductDetectorService();

/**
 * @route   POST /api/products/detect
 * @desc    Detect products from a website
 * @access  Public
 */
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const { url, useLlm, forceFresh, domConfidenceThreshold, minProducts } = req.body;
    
    if (!url) {
      return res.status(400).json({
        status: 'error',
        message: 'URL is required'
      });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid URL format'
      });
    }
    
    // Configure detection options
    const options = {
      useLlm: useLlm !== undefined ? Boolean(useLlm) : true,
      forceFresh: forceFresh !== undefined ? Boolean(forceFresh) : false,
      domConfidenceThreshold: domConfidenceThreshold !== undefined ? Number(domConfidenceThreshold) : 0.6,
      minProducts: minProducts !== undefined ? Number(minProducts) : 3
    };
    
    // Detect products with hybrid approach
    const result = await hybridDetector.detectProducts(url, options);
    
    return res.status(200).json({
      status: 'success',
      data: result,
      message: `Detected ${result.products.length} products from ${url}`
    });
  } catch (error: any) {
    console.error('Error detecting products:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error detecting products'
    });
  }
});

/**
 * @route   POST /api/products/scrape
 * @desc    Scrape website content without product detection
 * @access  Public
 */
router.post('/scrape', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        status: 'error',
        message: 'URL is required'
      });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid URL format'
      });
    }
    
    // Scrape website content
    const websiteData = await webScraper.scrapeWebsite(url);
    
    return res.status(200).json({
      status: 'success',
      data: websiteData,
      message: `Successfully scraped ${url}`
    });
  } catch (error: any) {
    console.error('Error scraping website:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error scraping website'
    });
  }
});

/**
 * @route   POST /api/products/dom-detect
 * @desc    Detect products using DOM-based detection only
 * @access  Public
 */
router.post('/dom-detect', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        status: 'error',
        message: 'URL is required'
      });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid URL format'
      });
    }
    
    // First scrape the website
    const websiteData = await webScraper.scrapeWebsite(url);
    
    // Generate HTML from website data
    const html = `
      <html>
        <head>
          <title>${websiteData.title}</title>
          <meta name="description" content="${websiteData.description || ''}">
          ${Object.entries(websiteData.metadata || {}).map(([name, content]) => 
            `<meta name="${name}" content="${content}">`
          ).join('\n')}
        </head>
        <body>
          ${websiteData.content}
        </body>
      </html>
    `;
    
    // Detect products from HTML
    const result = domDetector.detectProducts(html);
    
    return res.status(200).json({
      status: 'success',
      data: {
        ...result,
        url
      },
      message: `Detected ${result.products.length} products from ${url} using DOM-based detection`
    });
  } catch (error: any) {
    console.error('Error detecting products with DOM:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error detecting products with DOM'
    });
  }
});

/**
 * @route   GET /api/products/cache-stats
 * @desc    Get cache statistics for the product detector
 * @access  Public
 */
router.get('/cache-stats', (req: Request, res: Response) => {
  try {
    const stats = hybridDetector.getCacheStats();
    
    return res.status(200).json({
      status: 'success',
      data: stats,
      message: 'Retrieved cache statistics'
    });
  } catch (error: any) {
    console.error('Error getting cache stats:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error getting cache stats'
    });
  }
});

/**
 * @route   POST /api/products/clear-cache
 * @desc    Clear the product detector cache
 * @access  Public
 */
router.post('/clear-cache', (req: Request, res: Response) => {
  try {
    hybridDetector.clearCache();
    
    return res.status(200).json({
      status: 'success',
      message: 'Cache cleared successfully'
    });
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error clearing cache'
    });
  }
});

/**
 * @route   POST /api/products/cleanup-cache
 * @desc    Cleanup expired entries in the product detector cache
 * @access  Public
 */
router.post('/cleanup-cache', (req: Request, res: Response) => {
  try {
    const removedCount = hybridDetector.cleanupCache();
    
    return res.status(200).json({
      status: 'success',
      data: {
        removedCount
      },
      message: `Removed ${removedCount} expired cache entries`
    });
  } catch (error: any) {
    console.error('Error cleaning up cache:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error cleaning up cache'
    });
  }
});

export default router;
