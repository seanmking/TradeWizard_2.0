/**
 * Supabase Service
 * Handles database interactions for the TradeWizard Scraper Service
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

// Supabase client instance
let supabaseClient = null;

/**
 * Initialize the Supabase client
 * @returns {boolean} Success status
 */
function initSupabase() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
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
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      recommendations: data.recommendations || [],
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
      confidence: product.confidence || 'low'
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
 * Get database statistics
 * @returns {Object} Database statistics
 */
async function getDatabaseStats() {
  if (!supabaseClient) {
    if (!initSupabase()) {
      return { error: 'Database service not available' };
    }
  }
  
  try {
    // Get website count
    const { data: websiteCount, error: websiteError } = await supabaseClient
      .from('scraped_websites')
      .select('id', { count: 'exact', head: true });
    
    // Get product count
    const { data: productCount, error: productError } = await supabaseClient
      .from('website_products')
      .select('id', { count: 'exact', head: true });
    
    // Get job count
    const { data: jobCount, error: jobError } = await supabaseClient
      .from('scrape_jobs')
      .select('id', { count: 'exact', head: true });
    
    // Get recent scrapes
    const { data: recentScrapes, error: recentError } = await supabaseClient
      .from('scraped_websites')
      .select('url, business_name, last_scraped')
      .order('last_scraped', { ascending: false })
      .limit(5);
    
    if (websiteError || productError || jobError || recentError) {
      logger.error('Error retrieving database stats', { 
        websiteError, productError, jobError, recentError 
      });
      return { error: 'Error retrieving database statistics' };
    }
    
    return {
      websites: websiteCount?.count || 0,
      products: productCount?.count || 0,
      jobs: jobCount?.count || 0,
      recentScrapes: recentScrapes || []
    };
  } catch (error) {
    logger.error('Error in getDatabaseStats', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Normalize a URL for storage
 * @param {string} url - The URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  try {
    // Add https:// if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Remove trailing slash
    url = url.replace(/\/$/, '');
    
    // Parse the URL
    const parsedUrl = new URL(url);
    
    // Remove 'www.' if present
    let hostname = parsedUrl.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
      url = url.replace(parsedUrl.hostname, hostname);
    }
    
    return url;
  } catch (error) {
    logger.warn(`Error normalizing URL ${url}`, { error: error.message });
    return url;
  }
}

module.exports = {
  initSupabase,
  getCachedData,
  saveScrapedData,
  createScrapeJob,
  updateScrapeJob,
  getDatabaseStats
}; 