/**
 * Supabase Service
 * Handles database interactions for the TradeWizard Scraper Service
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

// Supabase client instance
let supabaseClient = null;

// Token counting constants for OpenAI API usage monitoring
const AVG_TOKEN_CHARS = 4; // Average characters per token
const TOKEN_COST_FACTOR = 0.002; // Approximate cost per 1K tokens (varies by model)

/**
 * Initialize the Supabase client
 * @returns {boolean} Success status
 */
function initSupabase() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Missing Supabase credentials. Database functionality will be unavailable.');
      return false;
    }
    
    if (!supabaseClient) {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
      logger.info('Supabase client initialized');
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize Supabase client', { error: error.message });
    return false;
  }
}

/**
 * Get cached data for a URL
 * @param {string} url - The website URL
 * @returns {Object|null} The cached data or null if not found
 */
async function getCachedData(url) {
  if (!supabaseClient) {
    if (!initSupabase()) {
      return null;
    }
  }
  
  try {
    const normalizedUrl = normalizeUrl(url);
    
    const { data, error } = await supabaseClient
      .from('scraped_websites')
      .select('*')
      .eq('url', normalizedUrl)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found error
        logger.info(`No cached data found for ${normalizedUrl}`);
        return null;
      }
      
      logger.error(`Error retrieving cached data for ${normalizedUrl}`, { error });
      return null;
    }
    
    logger.info(`Retrieved cached data for ${normalizedUrl}`, { 
      lastScraped: data.last_scraped
    });
    
    return data;
  } catch (error) {
    logger.error(`Error in getCachedData for ${url}`, { error: error.message });
    return null;
  }
}

/**
 * Save scraped data to Supabase
 * @param {string} url - The website URL
 * @param {Object} data - The scraped data
 * @returns {boolean} Success status
 */
async function saveScrapedData(url, data) {
  if (!supabaseClient) {
    if (!initSupabase()) {
      return false;
    }
  }
  
  try {
    const normalizedUrl = normalizeUrl(url);
    
    // Check if record exists
    const { data: existingData, error: fetchError } = await supabaseClient
      .from('scraped_websites')
      .select('id')
      .eq('url', normalizedUrl)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error(`Error checking for existing data for ${normalizedUrl}`, { error: fetchError });
      return false;
    }
    
    // Create formatted data record
    const websiteRecord = {
      url: normalizedUrl,
      business_name: data.businessName || 'Unknown Business',
      business_size: data.businessSize || 'unknown',
      description: data.description || '',
      founded_year: data.foundedYear || null,
      employee_count: data.employeeCount || null,
      customer_segments: data.customerSegments || [],
      product_categories: data.productCategories || [],
      certifications: data.certifications || [],
      geographic_presence: data.geographicPresence || [],
      export_markets: data.exportMarkets || [],
      export_readiness: data.exportReadiness || 0,
      industries: data.industries || [],
      b2b_focus: data.b2bFocus || 50,
      international_partnerships: data.internationalPartnerships || [],
      value_proposition: data.valueProposition || null,
      regulatory_compliance: data.regulatoryCompliance || null,
      supply_chain_info: data.supplyChainInfo || null,
      minimum_order_quantities: data.minimumOrderQuantities || null,
      shipping_capabilities: data.shippingCapabilities || null,
      ecommerce_capabilities: data.ecommerceCapabilities || null,
      languages_supported: data.languagesSupported || [],
      intellectual_property: data.intellectualProperty || null,
      innovation_capabilities: data.innovationCapabilities || null,
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      recommendations: data.recommendations || [],
      target_markets: data.targetMarkets || [],
      compliance_gaps: data.complianceGaps || [],
      certification_needs: data.certificationNeeds || [],
      supply_chain_risks: data.supplyChainRisks || [],
      market_entry_strategy: data.marketEntryStrategy || null,
      full_data: data,
      last_scraped: new Date().toISOString()
    };
    
    let result;
    if (existingData?.id) {
      // Update existing record
      const { data: updatedData, error: updateError } = await supabaseClient
        .from('scraped_websites')
        .update(websiteRecord)
        .eq('id', existingData.id)
        .select();
      
      if (updateError) {
        logger.error(`Error updating data for ${normalizedUrl}`, { error: updateError });
        return false;
      }
      
      result = updatedData;
      logger.info(`Updated existing record for ${normalizedUrl}`, { id: existingData.id });
    } else {
      // Insert new record
      const { data: insertedData, error: insertError } = await supabaseClient
        .from('scraped_websites')
        .insert(websiteRecord)
        .select();
      
      if (insertError) {
        logger.error(`Error inserting data for ${normalizedUrl}`, { error: insertError });
        return false;
      }
      
      result = insertedData;
      logger.info(`Created new record for ${normalizedUrl}`);
    }
    
    // Save products if available
    if (data.productDetails && data.productDetails.length > 0) {
      await saveProducts(result[0].id, data.productDetails);
    }
    
    return true;
  } catch (error) {
    logger.error(`Error in saveScrapedData for ${url}`, { error: error.message });
    return false;
  }
}

/**
 * Save products for a website
 * @param {number} websiteId - The website ID in the database
 * @param {Array} products - The product details
 * @returns {boolean} Success status
 */
async function saveProducts(websiteId, products) {
  if (!websiteId || !products || !Array.isArray(products)) {
    return false;
  }
  
  try {
    // First delete existing products for this website
    const { error: deleteError } = await supabaseClient
      .from('website_products')
      .delete()
      .eq('website_id', websiteId);
    
    if (deleteError) {
      logger.error(`Error deleting existing products for website ${websiteId}`, { error: deleteError });
      return false;
    }
    
    // Format product records
    const productRecords = products.map(product => ({
      website_id: websiteId,
      name: product.name || 'Unknown product',
      description: product.description || '',
      category: product.category || 'General',
      confidence: product.confidence || 'low',
      hs_code: product.hsCode || null,
      pricing: product.pricing || null,
      specifications: product.specifications || null,
      image_urls: product.imageUrls || [],
      certifications: product.certifications || [],
      compliance_info: product.complianceInfo || null,
      manufacturing_info: product.manufacturingInfo || null
    }));
    
    // Insert new products
    const { error: insertError } = await supabaseClient
      .from('website_products')
      .insert(productRecords);
    
    if (insertError) {
      logger.error(`Error inserting products for website ${websiteId}`, { error: insertError });
      return false;
    }
    
    logger.info(`Saved ${products.length} products for website ${websiteId}`);
    return true;
  } catch (error) {
    logger.error(`Error in saveProducts for website ${websiteId}`, { error: error.message });
    return false;
  }
}

/**
 * Track a scrape job
 * @param {string} url - The website URL
 * @param {Object} options - Scrape options
 * @returns {number|null} Job ID or null on failure
 */
async function createScrapeJob(url, options) {
  if (!supabaseClient) {
    if (!initSupabase()) {
      return null;
    }
  }
  
  try {
    const normalizedUrl = normalizeUrl(url);
    
    const { data, error } = await supabaseClient
      .from('scrape_jobs')
      .insert({
        url: normalizedUrl,
        status: 'pending',
        options: options || {}
      })
      .select();
    
    if (error) {
      logger.error(`Error creating scrape job for ${normalizedUrl}`, { error });
      return null;
    }
    
    logger.info(`Created scrape job for ${normalizedUrl}`, { jobId: data[0].id });
    return data[0].id;
  } catch (error) {
    logger.error(`Error in createScrapeJob for ${url}`, { error: error.message });
    return null;
  }
}

/**
 * Update a scrape job status
 * @param {number} jobId - The job ID
 * @param {string} status - The job status
 * @param {Object} result - The job result
 * @returns {boolean} Success status
 */
async function updateScrapeJob(jobId, status, result = null) {
  if (!supabaseClient) {
    if (!initSupabase()) {
      return false;
    }
  }
  
  if (!jobId) {
    return false;
  }
  
  try {
    const { error } = await supabaseClient
      .from('scrape_jobs')
      .update({
        status: status,
        result: result,
        completed_at: ['completed', 'failed'].includes(status) ? new Date().toISOString() : null
      })
      .eq('id', jobId);
    
    if (error) {
      logger.error(`Error updating scrape job ${jobId}`, { error });
      return false;
    }
    
    logger.info(`Updated scrape job ${jobId} to ${status}`);
    return true;
  } catch (error) {
    logger.error(`Error in updateScrapeJob for job ${jobId}`, { error: error.message });
    return false;
  }
}

/**
 * Estimate token usage for a string of text
 * @param {string} text - The text to estimate tokens for
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / AVG_TOKEN_CHARS);
}

/**
 * Log API usage metrics to Supabase
 * @param {string} apiName - The API being used (e.g., 'openai', 'other')
 * @param {string} endpoint - The specific endpoint or model used
 * @param {number} tokens - Number of tokens used
 * @param {string} operation - Type of operation
 * @returns {boolean} Success status
 */
async function logApiUsage(apiName, endpoint, tokens, operation) {
  if (!supabaseClient) {
    if (!initSupabase()) {
      return false;
    }
  }
  
  try {
    const { error } = await supabaseClient
      .from('api_usage_logs')
      .insert({
        api_name: apiName,
        endpoint: endpoint,
        tokens: tokens,
        estimated_cost: (tokens / 1000) * TOKEN_COST_FACTOR,
        operation: operation,
        timestamp: new Date().toISOString()
      });
    
    if (error) {
      logger.error(`Error logging API usage`, { error });
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Error in logApiUsage`, { error: error.message });
    return false;
  }
}

/**
 * Check if a website was recently scraped and cache is still valid
 * @param {string} url - The website URL
 * @param {number} maxAgeHours - Maximum age in hours for valid cache
 * @returns {boolean} Whether the cache is valid
 */
async function isCacheValid(url, maxAgeHours = 24) {
  const cachedData = await getCachedData(url);
  
  if (!cachedData || !cachedData.last_scraped) {
    return false;
  }
  
  const lastScraped = new Date(cachedData.last_scraped);
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const cacheAge = Date.now() - lastScraped.getTime();
  
  return cacheAge < maxAgeMs;
}

/**
 * Get stats for scraping activity and database usage
 * @returns {Object} Database statistics
 */
async function getDatabaseStats() {
  if (!supabaseClient) {
    if (!initSupabase()) {
      return {
        error: 'Database not available',
        connected: false
      };
    }
  }
  
  try {
    // Get counts from each table
    const { data: websiteCount, error: websiteError } = await supabaseClient
      .from('scraped_websites')
      .select('id', { count: 'exact', head: true });
    
    const { data: productCount, error: productError } = await supabaseClient
      .from('website_products')
      .select('id', { count: 'exact', head: true });
    
    const { data: jobCount, error: jobError } = await supabaseClient
      .from('scrape_jobs')
      .select('id', { count: 'exact', head: true });
    
    // Get stats on API usage if the table exists
    let apiUsage = null;
    let totalCost = 0;
    
    try {
      const { data: usageData, error: usageError } = await supabaseClient
        .from('api_usage_logs')
        .select('estimated_cost');
      
      if (!usageError && usageData) {
        totalCost = usageData.reduce((sum, record) => sum + (record.estimated_cost || 0), 0);
        apiUsage = {
          totalRecords: usageData.length,
          estimatedCost: totalCost.toFixed(2)
        };
      }
    } catch (usageTableError) {
      logger.info('API usage logging table may not exist yet');
    }
    
    // Get recent scrape jobs
    const { data: recentJobs, error: recentJobsError } = await supabaseClient
      .from('scrape_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (websiteError || productError || jobError) {
      logger.error('Error getting database stats', { 
        websiteError, productError, jobError 
      });
    }
    
    return {
      connected: true,
      websites: websiteCount ? websiteCount.length : 0,
      products: productCount ? productCount.length : 0,
      jobs: jobCount ? jobCount.length : 0,
      recentJobs: recentJobs || [],
      apiUsage
    };
  } catch (error) {
    logger.error('Error in getDatabaseStats', { error: error.message });
    return {
      error: error.message,
      connected: false
    };
  }
}

/**
 * Delete cached data for a URL
 * @param {string} url - The website URL to clear from cache
 * @returns {boolean} Success status
 */
async function clearCachedData(url) {
  if (!supabaseClient) {
    if (!initSupabase()) {
      return false;
    }
  }
  
  try {
    const normalizedUrl = normalizeUrl(url);
    
    const { error } = await supabaseClient
      .from('scraped_websites')
      .delete()
      .eq('url', normalizedUrl);
    
    if (error) {
      logger.error(`Error clearing cached data for ${normalizedUrl}`, { error });
      return false;
    }
    
    logger.info(`Cleared cached data for ${normalizedUrl}`);
    return true;
  } catch (error) {
    logger.error(`Error in clearCachedData for ${url}`, { error: error.message });
    return false;
  }
}

/**
 * Normalize a URL for consistent database storage
 * @param {string} url - The URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  if (!url) return '';
  
  // Ensure URL has a protocol
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  
  try {
    // Parse URL to normalize it
    const parsedUrl = new URL(normalizedUrl);
    
    // Remove trailing slash
    let hostname = parsedUrl.hostname;
    
    // Remove www. prefix if present
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    return hostname;
  } catch (error) {
    // If URL parsing fails, just return cleaned original
    return normalizedUrl
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  }
}

module.exports = {
  initSupabase,
  getCachedData,
  saveScrapedData,
  saveProducts,
  createScrapeJob,
  updateScrapeJob,
  getDatabaseStats,
  normalizeUrl,
  estimateTokens,
  logApiUsage,
  isCacheValid,
  clearCachedData
}; 