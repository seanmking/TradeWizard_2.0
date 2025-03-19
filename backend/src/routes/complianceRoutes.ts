import express from 'express';
import ComplianceMCPService from '../services/compliance-mcp.service';
import HybridProductDetectorService from '../services/hybrid-product-detector.service';

const router = express.Router();
const complianceMCP = new ComplianceMCPService();
const productDetector = new HybridProductDetectorService();

router.post('/requirements', async (req, res) => {
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

    // Fetch compliance requirements
    const complianceRequirements = await complianceMCP.getComplianceRequirements(finalProductDetails);

    res.json({
      status: 'success',
      product: finalProductDetails,
      compliance: complianceRequirements
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
    const stats = await complianceMCP.getComplianceCacheStats();
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
    const clearedItems = await complianceMCP.clearComplianceCache();
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
