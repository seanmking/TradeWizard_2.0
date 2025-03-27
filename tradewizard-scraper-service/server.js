/**
 * TradeWizard Scraper Service
 * Express server for scraper API endpoints with enhanced features
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const logger = require('./logger');
const { scrapeWebsite } = require('./scraper');
const supabaseService = require('./supabase-service');

// Initialize Express app
const app = express();
// Use port from environment variable
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Health Check Endpoint
 * GET /health
 */
app.get('/health', async (req, res) => {
  // Test database connectivity
  let dbStatus = {
    connected: false,
    message: 'Supabase connection not configured'
  };
  
  try {
    // Check Supabase credentials
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.warn('Missing Supabase credentials', {
        url: !!process.env.SUPABASE_URL,
        key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      dbStatus.message = 'Missing Supabase credentials';
    } else if (process.env.SUPABASE_SERVICE_ROLE_KEY.includes('role":"anon"')) {
      logger.warn('Using anon key instead of service_role key');
      dbStatus.message = 'Using anon key instead of service_role key';
    } else {
      if (supabaseService.initSupabase()) {
        // Get basic DB stats to verify connectivity
        const stats = await supabaseService.getDatabaseStats();
        dbStatus = {
          connected: stats.connected,
          message: stats.error ? `Database error: ${stats.error}` : 'Connected to Supabase',
          tables: {
            websites: stats.websites || 0,
            products: stats.products || 0,
            jobs: stats.jobs || 0
          }
        };
      }
    }
  } catch (error) {
    logger.error('Database connection error', { 
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    dbStatus = {
      connected: false,
      message: `Database connection error: ${error.message}`
    };
  }
  
  // Check OpenAI API configuration
  const openaiStatus = {
    configured: !!process.env.OPENAI_API_KEY && 
                process.env.OPENAI_API_KEY !== 'mock-api-key' &&
                process.env.OPENAI_API_KEY !== 'sk-your-openai-api-key',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    message: process.env.OPENAI_API_KEY ? 
             (process.env.OPENAI_API_KEY.startsWith('sk-') ? 
              'API key configured' : 
              'Invalid API key format') : 
             'No API key configured'
  };
  
  res.status(200).json({
    status: 'ok',
    message: 'Scraper service is running',
    version: '2.0',
    database: dbStatus,
    openai: openaiStatus,
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Scrape Endpoint
 * GET /scrape?url=example.com&maxPages=10&maxDepth=3&useCache=true&forceFresh=false
 */
app.get('/scrape', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({
      error: 'URL parameter is required'
    });
  }
  
  // Parse options
  const options = {
    maxPages: parseInt(req.query.maxPages) || 10,
    maxDepth: parseInt(req.query.maxDepth) || 3,
    useCache: req.query.useCache !== 'false',
    forceFresh: req.query.forceFresh === 'true'
  };
  
  try {
    logger.info(`Scrape request for ${url}`, { options });
    
    const result = await scrapeWebsite(url, options);
    
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error scraping ${url}`, { error: error.message });
    res.status(500).json({
      error: 'Error scraping website',
      message: error.message
    });
  }
});

/**
 * Analyze Endpoint
 * GET /analyze?url=example.com
 * Returns formatted data for TradeWizard MCP
 */
app.get('/analyze', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({
      error: 'URL parameter is required'
    });
  }
  
  // Parse options
  const options = {
    maxPages: parseInt(req.query.maxPages) || 10,
    maxDepth: parseInt(req.query.maxDepth) || 3,
    useCache: req.query.useCache !== 'false',
    forceFresh: req.query.forceFresh === 'true'
  };
  
  try {
    logger.info(`Analyze request for ${url}`, { options });
    
    const result = await scrapeWebsite(url, options);
    
    // Format the data for the TradeWizard MCP
    const formattedData = {
      businessName: result.businessName || 'Unknown Business',
      businessSize: result.businessSize || 'unknown',
      description: result.description || '',
      foundedYear: result.foundedYear || null,
      employeeCount: result.employeeCount || null,
      productCategories: result.productCategories || [],
      productDetails: result.productDetails || [],
      customerSegments: result.customerSegments || [],
      certifications: result.certifications || [],
      geographicPresence: result.geographicPresence || [],
      exportMarkets: result.exportMarkets || [],
      exportReadiness: result.exportReadiness || 0,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      recommendations: result.recommendations || [],
      dataSource: result.dataSource || 'fresh',
      lastUpdated: result.lastUpdated || new Date().toISOString()
    };
    
    res.status(200).json(formattedData);
  } catch (error) {
    logger.error(`Error analyzing ${url}`, { error: error.message });
    res.status(500).json({
      error: 'Error analyzing website',
      message: error.message
    });
  }
});

/**
 * Cached Data Endpoint
 * GET /cached?url=example.com
 */
app.get('/cached', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({
      error: 'URL parameter is required'
    });
  }
  
  // Initialize Supabase if needed
  if (!supabaseService.initSupabase()) {
    return res.status(500).json({
      error: 'Database service not available'
    });
  }
  
  try {
    const cachedData = await supabaseService.getCachedData(url);
    
    if (!cachedData) {
      return res.status(404).json({
        error: 'No cached data found for this URL'
      });
    }
    
    const ageInHours = calculateCacheAge(cachedData.last_scraped);
    
    res.status(200).json({
      url: url,
      cached: true,
      lastScraped: cachedData.last_scraped,
      cacheAgeHours: ageInHours,
      data: cachedData.full_data
    });
  } catch (error) {
    logger.error(`Error retrieving cached data for ${url}`, { error: error.message });
    res.status(500).json({
      error: 'Error retrieving cached data',
      message: error.message
    });
  }
});

/**
 * Data Completeness Check Endpoint
 * GET /completeness?url=example.com
 */
app.get('/completeness', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({
      error: 'URL parameter is required'
    });
  }
  
  // Initialize Supabase if needed
  if (!supabaseService.initSupabase()) {
    return res.status(500).json({
      error: 'Database service not available'
    });
  }
  
  try {
    const cachedData = await supabaseService.getCachedData(url);
    
    if (!cachedData) {
      return res.status(404).json({
        error: 'No data found for this URL',
        message: 'Please analyze the website first'
      });
    }
    
    // Assess data completeness
    const completeness = assessDataCompleteness(cachedData);
    
    res.status(200).json(completeness);
  } catch (error) {
    logger.error(`Error assessing completeness for ${url}`, { error: error.message });
    res.status(500).json({
      error: 'Error assessing data completeness',
      message: error.message
    });
  }
});

/**
 * Stats Endpoint
 * GET /stats
 * Returns service statistics and usage metrics
 */
app.get('/stats', async (req, res) => {
  // Initialize Supabase if needed
  if (!supabaseService.initSupabase()) {
    return res.status(500).json({
      error: 'Database service not available'
    });
  }
  
  try {
    const stats = await supabaseService.getDatabaseStats();
    
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        connected: stats.connected,
        websites: stats.websites || 0,
        products: stats.products || 0,
        jobs: stats.jobs || 0,
        recentJobs: stats.recentJobs || []
      },
      api: {
        usage: stats.apiUsage || {
          totalRecords: 0,
          estimatedCost: '0.00'
        }
      }
    });
  } catch (error) {
    logger.error('Error retrieving stats', { error: error.message });
    res.status(500).json({
      error: 'Error retrieving service statistics',
      message: error.message
    });
  }
});

/**
 * Clear Cache Endpoint
 * POST /clear-cache?url=example.com
 */
app.post('/clear-cache', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({
      error: 'URL parameter is required'
    });
  }
  
  // Initialize Supabase if needed
  if (!supabaseService.initSupabase()) {
    return res.status(500).json({
      error: 'Database service not available'
    });
  }
  
  try {
    const success = await supabaseService.clearCachedData(url);
    
    if (success) {
      res.status(200).json({
        message: `Cache cleared for ${url}`,
        status: 'success'
      });
    } else {
      res.status(500).json({
        error: `Failed to clear cache for ${url}`,
        status: 'error'
      });
    }
  } catch (error) {
    logger.error(`Error clearing cache for ${url}`, { error: error.message });
    res.status(500).json({
      error: 'Error clearing cache',
      message: error.message
    });
  }
});

/**
 * Calculate the age of cached data in hours
 * @param {string} lastScraped - ISO date string of when data was last scraped
 * @returns {number} - Age in hours
 */
function calculateCacheAge(lastScraped) {
  const lastScrapedDate = new Date(lastScraped);
  const now = new Date();
  const ageMs = now - lastScrapedDate;
  return Math.round(ageMs / (1000 * 60 * 60));
}

/**
 * Assess the completeness of scraped data
 * @param {Object} data - Scraped data
 * @returns {Object} - Completeness assessment
 */
function assessDataCompleteness(data) {
  // Business information completeness
  const businessInfo = assessBusinessInfoCompleteness(data);
  
  // Product information completeness
  const productInfo = assessProductInfoCompleteness(data);
  
  // Export information completeness
  const exportInfo = assessExportInfoCompleteness(data);
  
  // Overall completeness score (weighted average)
  const overall = Math.round(
    (businessInfo.score * 0.4) + 
    (productInfo.score * 0.3) + 
    (exportInfo.score * 0.3)
  );
  
  // Combine all recommendations
  const recommendations = [
    ...businessInfo.recommendations,
    ...productInfo.recommendations,
    ...exportInfo.recommendations
  ];
  
  return {
    overall,
    businessInfo,
    productInfo,
    exportInfo,
    recommendations
  };
}

/**
 * Assess business information completeness
 * @param {Object} data - Scraped data
 * @returns {Object} - Business info completeness
 */
function assessBusinessInfoCompleteness(data) {
  const fields = {
    businessName: !!data.businessName && data.businessName !== 'Unknown Business',
    description: !!data.description && data.description.length > 20,
    foundedYear: !!data.foundedYear,
    employeeCount: !!data.employeeCount,
    businessSize: !!data.businessSize && data.businessSize !== 'unknown',
    customerSegments: Array.isArray(data.customerSegments) && data.customerSegments.length > 0
  };
  
  // Calculate score based on field presence
  const presentFields = Object.values(fields).filter(v => v).length;
  const totalFields = Object.keys(fields).length;
  const score = Math.round((presentFields / totalFields) * 100);
  
  // Generate recommendations
  const recommendations = [];
  
  if (!fields.businessName) {
    recommendations.push('Add business name information');
  }
  
  if (!fields.description) {
    recommendations.push('Add a detailed business description');
  }
  
  if (!fields.foundedYear) {
    recommendations.push('Add founding year information');
  }
  
  if (!fields.employeeCount) {
    recommendations.push('Add employee count information');
  }
  
  if (!fields.customerSegments) {
    recommendations.push('Identify customer segments');
  }
  
  return {
    score,
    fields,
    recommendations
  };
}

/**
 * Assess product information completeness
 * @param {Object} data - Scraped data
 * @returns {Object} - Product info completeness
 */
function assessProductInfoCompleteness(data) {
  const hasProducts = Array.isArray(data.productDetails) && data.productDetails.length > 0;
  const hasCategories = Array.isArray(data.productCategories) && data.productCategories.length > 0;
  
  // Evaluate product descriptions
  let productDescriptionScore = 0;
  if (hasProducts) {
    const productsWithGoodDescriptions = data.productDetails.filter(p => 
      p.description && p.description.length > 30
    ).length;
    
    productDescriptionScore = Math.round((productsWithGoodDescriptions / data.productDetails.length) * 100);
  }
  
  const fields = {
    hasProducts,
    hasCategories,
    productDescriptionScore: productDescriptionScore > 50
  };
  
  // Calculate overall product info score
  let score = 0;
  if (hasProducts) {
    score = Math.round(
      (hasProducts ? 40 : 0) +
      (hasCategories ? 30 : 0) +
      (productDescriptionScore / 100 * 30)
    );
  }
  
  // Generate recommendations
  const recommendations = [];
  
  if (!hasProducts) {
    recommendations.push('Add product information');
  } else if (data.productDetails.length < 3) {
    recommendations.push('Add more product details');
  }
  
  if (!hasCategories) {
    recommendations.push('Categorize products');
  }
  
  if (productDescriptionScore < 50) {
    recommendations.push('Improve product descriptions');
  }
  
  return {
    score,
    fields,
    recommendations
  };
}

/**
 * Assess export information completeness
 * @param {Object} data - Scraped data
 * @returns {Object} - Export info completeness
 */
function assessExportInfoCompleteness(data) {
  const hasExportMarkets = Array.isArray(data.exportMarkets) && data.exportMarkets.length > 0;
  const hasCertifications = Array.isArray(data.certifications) && data.certifications.length > 0;
  const hasGeographicPresence = Array.isArray(data.geographicPresence) && data.geographicPresence.length > 0;
  const hasExportReadiness = typeof data.exportReadiness === 'number';
  const hasStrengths = Array.isArray(data.strengths) && data.strengths.length > 0;
  const hasWeaknesses = Array.isArray(data.weaknesses) && data.weaknesses.length > 0;
  
  const fields = {
    exportMarkets: hasExportMarkets,
    certifications: hasCertifications,
    geographicPresence: hasGeographicPresence,
    exportReadiness: hasExportReadiness,
    strengths: hasStrengths,
    weaknesses: hasWeaknesses
  };
  
  // Calculate export info score
  const presentFields = Object.values(fields).filter(v => v).length;
  const totalFields = Object.keys(fields).length;
  let score = Math.round((presentFields / totalFields) * 100);
  
  // Boost score if export readiness is high
  if (hasExportReadiness && data.exportReadiness > 50) {
    score = Math.min(100, score + 10);
  }
  
  // Generate recommendations
  const recommendations = [];
  
  if (!hasExportMarkets) {
    recommendations.push('Identify target export markets');
  }
  
  if (!hasCertifications) {
    recommendations.push('Add information about certifications relevant for export');
  }
  
  if (!hasGeographicPresence) {
    recommendations.push('Add information about geographic presence');
  }
  
  return {
    score,
    fields,
    recommendations
  };
}

// Start the server
app.listen(PORT, () => {
  logger.info(`TradeWizard Scraper Service running on port ${PORT}`);
  
  // Initialize database connection
  if (supabaseService.initSupabase()) {
    logger.info('Database connection initialized');
  } else {
    logger.warn('Database connection not available');
  }
});

module.exports = app; 