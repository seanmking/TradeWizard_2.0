import express from 'express';
import HybridProductDetectorService from '../services/hybrid-product-detector.service';
import LLMProductAnalyzerService from '../services/llm-product-analyzer.service';

const router = express.Router();
const hybridDetector = new HybridProductDetectorService();
const llmAnalyzer = new LLMProductAnalyzerService();

router.post('/detect', async (req, res) => {
  try {
    const { url } = req.body;
    const productDetectionResult = await hybridDetector.detectProduct(url);
    
    // Optional: LLM-based enhancement
    const enhancedClassification = await llmAnalyzer.classifyProduct(productDetectionResult);
    
    res.json({
      detection: productDetectionResult,
      classification: enhancedClassification
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const productDetails = req.body;
    const classification = await llmAnalyzer.classifyProduct(productDetails);
    res.json(classification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
