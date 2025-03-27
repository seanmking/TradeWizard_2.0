import express from 'express';
import HybridProductDetectorService from '../services/hybrid-product-detector.service';
import LLMProductAnalyzerService from '../services/llm-product-analyzer.service';
import ComplianceMCPService from '../services/compliance-mcp.service';
import MarketIntelligenceMCPService from '../services/market-intelligence-mcp.service';
import { ParsedQs } from 'qs';

const router = express.Router();
const hybridDetector = new HybridProductDetectorService();
const llmAnalyzer = new LLMProductAnalyzerService();
const complianceMCP = new ComplianceMCPService();
const marketIntelMCP = new MarketIntelligenceMCPService();

// Product Detection Endpoint
router.post('/detect', async (req, res) => {
  try {
    const { url } = req.body;
    
    // Validate input
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }

    const productDetectionResult = await hybridDetector.detectProduct(url);
    
    // Optional: Enhance with LLM classification
    const enhancedClassification = await llmAnalyzer.classifyProduct(productDetectionResult);
    
    res.json({
      status: 'success',
      detection: productDetectionResult,
      classification: enhancedClassification,
      confidence: productDetectionResult.confidence || 0.5
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save Product Endpoint
router.post('/save', async (req, res) => {
  try {
    const productData = req.body;
    
    // Validate input
    if (!productData.userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch compliance requirements
    const complianceRequirements = await complianceMCP.getComplianceRequirements({
      name: productData.originalDetection.name,
      hsCode: productData.originalDetection.hsCode,
      industrySector: productData.originalDetection.industrySector
    });

    // Fetch market opportunities
    const marketOpportunities = await marketIntelMCP.getMarketOpportunities({
      name: productData.originalDetection.name,
      hsCode: productData.originalDetection.hsCode,
      industrySector: productData.originalDetection.industrySector
    });

    // Calculate export readiness
    const exportReadiness = {
      complianceScore: complianceRequirements ? 80 : 40,
      marketPotentialScore: marketOpportunities?.globalDemand?.totalValue ? 75 : 25,
      overallViability: calculateExportViability(
        complianceRequirements, 
        marketOpportunities
      )
    };

    // Augment product data with export readiness
    const finalProductData = {
      ...productData,
      exportReadiness
    };

    // TODO: Implement actual database save
    // For now, we'll just return the augmented product data
    res.json({
      status: 'success',
      product: finalProductData
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Fetch User Products Endpoint
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { category, minConfidence, exportViability } = req.query;

    // TODO: Implement actual database query with filters
    // For now, we'll return a mock response
    const mockProducts = [
      {
        id: '1',
        userId,
        originalDetection: {
          name: 'Organic Rooibos Tea',
          description: 'Premium South African herbal tea',
          confidence: 0.85,
          hsCode: '0902'
        },
        exportReadiness: {
          overallViability: category === 'Beverages' ? 'high' : 'low'
        }
      },
      {
        id: '2',
        userId,
        originalDetection: {
          name: 'Handcrafted Leather Bag',
          description: 'Premium leather weekender',
          confidence: 0.75,
          hsCode: '4202'
        },
        exportReadiness: {
          overallViability: 'medium'
        }
      }
    ];

    // Apply filters
    const filteredProducts = mockProducts.filter(product => {
      const meetsCategory = !category || (typeof category === 'string' && product.originalDetection.name.toLowerCase().includes(category.toLowerCase()));
      const meetsConfidence = !minConfidence || product.originalDetection.confidence >= parseFloat(minConfidence as string);
      const meetsViability = !exportViability || product.exportReadiness.overallViability === exportViability;

      return meetsCategory && meetsConfidence && meetsViability;
    });

    res.json({
      status: 'success',
      products: filteredProducts
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Product Analysis Endpoint
router.get('/analyze', async (req, res) => {
  try {
    const { url } = req.query;
    
    // Validate input
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }

    // First try hybrid detection
    const productDetectionResult = await hybridDetector.detectProduct(url);
    
    // Enhance with LLM classification if products were found
    let enhancedResult = productDetectionResult;
    if (productDetectionResult.productDetails && productDetectionResult.productDetails.length > 0) {
      enhancedResult = await llmAnalyzer.classifyProduct(productDetectionResult);
    }
    
    res.json({
      status: 'success',
      productDetails: enhancedResult.productDetails || [],
      categories: enhancedResult.categories || [],
      confidence: enhancedResult.confidence || 0.5
    });
  } catch (error) {
    console.error('Error analyzing products:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to calculate export viability
function calculateExportViability(complianceRequirements: any, marketOpportunities: any): 'low' | 'medium' | 'high' {
  // Simple logic to determine export viability
  const hasCompliance = complianceRequirements && Object.keys(complianceRequirements).length > 0;
  const hasMarketOpportunity = marketOpportunities?.globalDemand?.totalValue > 0;

  if (hasCompliance && hasMarketOpportunity) return 'high';
  if (hasCompliance || hasMarketOpportunity) return 'medium';
  return 'low';
}

export default router;
