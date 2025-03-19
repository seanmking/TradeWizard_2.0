import express from 'express';
import HybridProductDetectorService from '../services/hybrid-product-detector.service';
import LLMProductAnalyzerService from '../services/llm-product-analyzer.service';

const router = express.Router();
const hybridDetector = new HybridProductDetectorService();
const llmAnalyzer = new LLMProductAnalyzerService();

router.post('/detect', async (req, res) => {
  try {
    const { url } = req.body;
    
    // Validate input
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }

    const productDetectionResult = await hybridDetector.detectProduct(url);
    
    res.json({
      status: 'success',
      detection: productDetectionResult,
      confidence: productDetectionResult.confidence || 0.5
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const productDetails = req.body;
    const classification = await llmAnalyzer.classifyProduct(productDetails);
    res.json({
      status: 'success',
      classification
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
    const stats = await hybridDetector.getCacheStats();
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
    const clearedItems = await hybridDetector.clearCache();
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
