const express = require('express');
const router = express.Router();
const tradeDataManager = require('../services/tradeDataManager');

/**
 * @route GET /api/trade/flows
 * @desc Get trade flows data
 * @access Public
 */
router.get('/flows', async (req, res) => {
  try {
    const params = {
      reporterCode: req.query.reporter,
      flowCode: req.query.flow,
      period: req.query.period,
      cmdCode: req.query.commodity || 'TOTAL',
      preferences: {
        preferredProvider: req.query.provider // Optional
      }
    };
    
    // Validate required parameters
    if (!params.reporterCode || !params.flowCode || !params.period) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const data = await tradeDataManager.getTradeFlows(params);
    res.json(data);
  } catch (error) {
    console.error('Error fetching trade flows:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/trade/tariffs
 * @desc Get tariff data
 * @access Public
 */
router.get('/tariffs', async (req, res) => {
  try {
    const params = {
      reporterCode: req.query.reporter,
      partnerCode: req.query.partner,
      productCode: req.query.product || 'TOTAL',
      year: req.query.year,
      dataType: req.query.dataType || 'reported',
      preferences: {
        preferredProvider: req.query.provider // Optional
      }
    };
    
    // Validate required parameters
    if (!params.reporterCode || !params.partnerCode || !params.year) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const data = await tradeDataManager.getTariffData(params);
    res.json(data);
  } catch (error) {
    console.error('Error fetching tariff data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/trade/top-partners
 * @desc Get top trading partners
 * @access Public
 */
router.get('/top-partners', async (req, res) => {
  try {
    const params = {
      reporterCode: req.query.reporter,
      flowCode: req.query.flow,
      period: req.query.period,
      topN: parseInt(req.query.limit, 10) || 10,
      preferences: {
        preferredProvider: req.query.provider // Optional
      }
    };
    
    // Validate required parameters
    if (!params.reporterCode || !params.flowCode || !params.period) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Validate topN
    if (isNaN(params.topN) || params.topN < 1 || params.topN > 100) {
      return res.status(400).json({ error: 'Invalid limit. Must be between 1 and 100' });
    }
    
    const data = await tradeDataManager.getTopPartners(params);
    res.json(data);
  } catch (error) {
    console.error('Error fetching top partners:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/trade/visualization
 * @desc Generate a visualization
 * @access Public
 */
router.get('/visualization', async (req, res) => {
  try {
    const params = {
      reporterCode: req.query.reporter,
      flowCode: req.query.flow,
      period: req.query.period,
      cmdCode: req.query.commodity || 'TOTAL',
      topN: parseInt(req.query.limit, 10) || 10,
      visualizationType: req.query.type || 'trade_visualization',
      preferences: {
        preferredProvider: req.query.provider // Optional
      }
    };
    
    // Validate required parameters
    if (!params.reporterCode || !params.flowCode || !params.period) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const data = await tradeDataManager.generateVisualization(params);
    res.json(data);
  } catch (error) {
    console.error('Error generating visualization:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/trade/reporters
 * @desc Get reporter countries
 * @access Public
 */
router.get('/reporters', async (req, res) => {
  try {
    const params = {
      dataType: req.query.dataType || 'trade_flows',
      preferences: {
        preferredProvider: req.query.provider // Optional
      }
    };
    
    const data = await tradeDataManager.getReporters(params);
    res.json(data);
  } catch (error) {
    console.error('Error fetching reporters:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/trade/partners
 * @desc Get partner countries
 * @access Public
 */
router.get('/partners', async (req, res) => {
  try {
    const params = {
      dataType: req.query.dataType || 'trade_flows',
      reporterCode: req.query.reporter,
      year: req.query.year,
      preferences: {
        preferredProvider: req.query.provider // Optional
      }
    };
    
    const data = await tradeDataManager.getPartners(params);
    res.json(data);
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/trade/products
 * @desc Get products
 * @access Public
 */
router.get('/products', async (req, res) => {
  try {
    const params = {
      dataType: req.query.dataType || 'trade_flows',
      preferences: {
        preferredProvider: req.query.provider // Optional
      }
    };
    
    const data = await tradeDataManager.getProducts(params);
    res.json(data);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/trade/indicators
 * @desc Get development indicators
 * @access Public
 */
router.get('/indicators', async (req, res) => {
  try {
    const params = {
      reporterCode: req.query.reporter,
      year: req.query.year,
      indicator: req.query.indicator,
      preferences: {
        preferredProvider: req.query.provider // Optional
      }
    };
    
    // Validate required parameters
    if (!params.reporterCode || !params.year || !params.indicator) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const data = await tradeDataManager.getDevelopmentIndicators(params);
    res.json(data);
  } catch (error) {
    console.error('Error fetching indicators:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/trade/providers
 * @desc Get list of available providers
 * @access Public
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = tradeDataManager.getAvailableProviders();
    res.json(providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/trade/data-types
 * @desc Get list of supported data types
 * @access Public
 */
router.get('/data-types', async (req, res) => {
  try {
    const dataTypes = tradeDataManager.getSupportedDataTypes();
    res.json(dataTypes);
  } catch (error) {
    console.error('Error fetching data types:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 