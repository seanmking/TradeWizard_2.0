import express from 'express';
import MarketIntelligenceMCPService from '../services/market-intelligence-mcp.service';
import HybridProductDetectorService from '../services/hybrid-product-detector.service';

const router = express.Router();
const marketIntelMCP = new MarketIntelligenceMCPService();
const productDetector = new HybridProductDetectorService();

router.post('/opportunities', async (req, res) => {
  try {
    const { url, productDetails } = req.body;
    let finalProductDetails;

    // If URL is provided, first detect the product
    if (url) {
      const detectedProduct = await productDetector.detectProduct(url);
      finalProductDetails = {
        name: detectedProduct.name,
        description: detectedProduct.description,
        hsCode: detectedProduct.hsCode,
        industrySector: detectedProduct.industrySector
      };
    } else if (productDetails) {
      // Use provided product details
      finalProductDetails = productDetails;
    } else {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Either URL or product details must be provided' 
      });
    }

    // Fetch market opportunities
    const marketOpportunities = await marketIntelMCP.getMarketOpportunities(finalProductDetails);

    res.json({
      status: 'success',
      product: finalProductDetails,
      marketInsights: marketOpportunities
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Market Intelligence Comparison Endpoint
router.post('/compare', async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length < 2) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'At least two products are required for comparison' 
      });
    }

    // Fetch market opportunities for each product
    const comparativeInsights = await Promise.all(
      products.map(product => marketIntelMCP.getMarketOpportunities(product))
    );

    res.json({
      status: 'success',
      comparativeInsights
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Cache management routes
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await marketIntelMCP.getMarketIntelCacheStats();
    res.json({
      status: 'success',
      stats
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

router.delete('/cache/clear', async (req, res) => {
  try {
    const clearedItems = await marketIntelMCP.clearMarketIntelCache();
    res.json({
      status: 'success',
      clearedItems
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

export default router;
