const express = require('express');
const router = express.Router();
const comtradeService = require('../services/comtradeService');

/**
 * @route GET /api/comtrade/reporters
 * @desc Get all reporter countries
 * @access Public
 */
router.get('/reporters', async (req, res) => {
  try {
    const reporters = await comtradeService.getReporterCountries();
    res.json(reporters);
  } catch (error) {
    console.error('Error fetching reporter countries:', error);
    res.status(500).json({ error: 'Failed to fetch reporter countries' });
  }
});

/**
 * @route GET /api/comtrade/trade-data
 * @desc Get trade data for a specific reporter, flow, and period
 * @access Public
 * @query {string} reporter - Reporter country code
 * @query {string} flow - Flow code (M=Import, X=Export)
 * @query {string} period - Period (YYYY for annual, YYYYMM for monthly)
 * @query {string} commodity - Commodity code (default: "TOTAL" for all commodities)
 */
router.get('/trade-data', async (req, res) => {
  try {
    const { reporter, flow, period, commodity = 'TOTAL' } = req.query;
    
    // Validate parameters
    if (!reporter || !flow || !period) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Validate flow code
    if (flow !== 'M' && flow !== 'X') {
      return res.status(400).json({ error: 'Invalid flow code. Must be "M" (Import) or "X" (Export)' });
    }
    
    // Validate period format (YYYY or YYYYMM)
    const periodRegex = /^(\d{4}|\d{6})$/;
    if (!periodRegex.test(period)) {
      return res.status(400).json({ error: 'Invalid period format. Must be YYYY for annual or YYYYMM for monthly' });
    }
    
    const tradeData = await comtradeService.getTradeData(reporter, flow, period, commodity);
    res.json(tradeData);
  } catch (error) {
    console.error('Error fetching trade data:', error);
    res.status(500).json({ error: 'Failed to fetch trade data' });
  }
});

/**
 * @route GET /api/comtrade/top-partners
 * @desc Get top trading partners for a specific reporter, flow, and period
 * @access Public
 * @query {string} reporter - Reporter country code
 * @query {string} flow - Flow code (M=Import, X=Export)
 * @query {string} period - Period (YYYY for annual, YYYYMM for monthly)
 * @query {number} limit - Number of top partners to return (default: 10)
 */
router.get('/top-partners', async (req, res) => {
  try {
    const { reporter, flow, period, limit = 10 } = req.query;
    
    // Validate parameters
    if (!reporter || !flow || !period) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const topN = parseInt(limit, 10);
    if (isNaN(topN) || topN < 1 || topN > 100) {
      return res.status(400).json({ error: 'Invalid limit. Must be between 1 and 100' });
    }
    
    const topPartners = await comtradeService.getTopTradingPartners(reporter, flow, period, topN);
    res.json(topPartners);
  } catch (error) {
    console.error('Error fetching top partners:', error);
    res.status(500).json({ error: 'Failed to fetch top trading partners' });
  }
});

/**
 * @route GET /api/comtrade/visualization
 * @desc Generate a visualization of top trading partners
 * @access Public
 * @query {string} reporter - Reporter country code
 * @query {string} flow - Flow code (M=Import, X=Export)
 * @query {string} period - Period (YYYY for annual, YYYYMM for monthly)
 * @query {string} commodity - Commodity code (default: "TOTAL" for all commodities)
 * @query {number} limit - Number of top partners to display (default: 10)
 */
router.get('/visualization', async (req, res) => {
  try {
    const { reporter, flow, period, commodity = 'TOTAL', limit = 10 } = req.query;
    
    // Validate parameters
    if (!reporter || !flow || !period) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Generate a unique filename for the visualization
    const timestamp = Date.now();
    const filename = `visualization_${reporter}_${flow}_${period}_${commodity}_${timestamp}.png`;
    const filePath = `public/visualizations/${filename}`;
    
    // Execute the Python script with visualization arguments
    const scriptArgs = [
      '--visualize',
      '--reporter', reporter,
      '--flow', flow,
      '--period', period,
      '--commodity', commodity,
      '--top-n', limit.toString(),
      '--image-file', filePath
    ];
    
    await comtradeService.executePythonScript(comtradeService.pythonScriptPath, scriptArgs);
    
    // Return the URL to the generated image
    res.json({
      success: true,
      imageUrl: `/visualizations/${filename}`
    });
  } catch (error) {
    console.error('Error generating visualization:', error);
    res.status(500).json({ error: 'Failed to generate visualization' });
  }
});

module.exports = router; 