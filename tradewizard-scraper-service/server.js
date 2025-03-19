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
// Force port 3002 to avoid conflict with other services
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Health Check Endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Scraper service is running',
    version: '2.0'
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
  
  try {
    let data;
    let dataSource = 'fresh';
    let lastUpdated = new Date().toISOString();
    
    // Try to get data from cache first
    if (supabaseService.initSupabase()) {
      const cachedData = await supabaseService.getCachedData(url);
      
      if (cachedData && cachedData.full_data) {
        data = cachedData.full_data;
        dataSource = 'cache';
        lastUpdated = cachedData.last_scraped;
        logger.info(`Using cached data for completeness check of ${url}`);
      }
    }
    
    // If no cached data, scrape fresh
    if (!data) {
      logger.info(`No cached data found, scraping fresh data for ${url}`);
      data = await scrapeWebsite(url, { maxPages: 5, maxDepth: 2 });
      dataSource = 'fresh';
    }
    
    // Assess completeness
    const completeness = assessDataCompleteness(data);
    completeness.dataSource = dataSource;
    completeness.lastUpdated = lastUpdated;
    
    res.status(200).json(completeness);
  } catch (error) {
    logger.error(`Error checking data completeness for ${url}`, { error: error.message });
    res.status(500).json({
      error: 'Error checking data completeness',
      message: error.message
    });
  }
});

/**
 * Database Stats Endpoint
 * GET /stats
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
    res.status(200).json(stats);
  } catch (error) {
    logger.error('Error retrieving database stats', { error: error.message });
    res.status(500).json({
      error: 'Error retrieving database stats',
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
  logger.info(`Scraper service running on port ${PORT}`);
});

module.exports = app; 