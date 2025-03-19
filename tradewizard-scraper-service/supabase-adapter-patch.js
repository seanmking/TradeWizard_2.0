/**
 * Supabase Service Adapter Patch
 * Applies database adapter pattern to supabase-service.js
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');
const dbAdapter = require('./db-adapter');

// Supabase client instance
let supabaseClient = null;

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
      logger.info('Supabase client initialized with adapter patch');
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
    const data = await dbAdapter.getScrapedData(supabaseClient, url);
    if (data) {
      logger.info(`Retrieved cached data for ${url}`);
      return data;
    }
    return null;
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
    const result = await dbAdapter.saveScrapedData(supabaseClient, url, data);
    return !!result;
  } catch (error) {
    logger.error(`Error in saveScrapedData for ${url}`, { error: error.message });
    return false;
  }
}

/**
 * Create a scrape job in the database
 * @param {string} url - The website URL
 * @param {Object} options - Scraping options
 * @returns {number|null} The job ID or null if creation failed
 */
async function createScrapeJob(url, options = {}) {
  if (!supabaseClient) {
    if (!initSupabase()) {
      return null;
    }
  }
  
  try {
    const normalizedUrl = url.replace(/^https?:\/\//, '');
    const jobData = {
      url: normalizedUrl,
      data: { options, startTime: new Date().toISOString() },
      status: 'pending',
      scraped_at: new Date().toISOString()
    };
    
    const { data, error } = await supabaseClient
      .from('scraped_websites')
      .insert(jobData)
      .select('id');
      
    if (error) {
      logger.error(`Error creating scrape job for ${normalizedUrl}`, { error });
      return null;
    }
    
    logger.info(`Created scrape job for ${normalizedUrl}`, { id: data[0].id });
    return data[0].id;
  } catch (error) {
    logger.error(`Error in createScrapeJob for ${url}`, { error: error.message });
    return null;
  }
}

/**
 * Update a scrape job status
 * @param {number} jobId - The job ID
 * @param {string} status - The new status
 * @param {Object} metadata - Additional metadata
 * @returns {boolean} Success status
 */
async function updateScrapeJob(jobId, status, metadata = {}) {
  if (!supabaseClient || !jobId) {
    return false;
  }
  
  try {
    // First get the current job data
    const { data: currentJob, error: fetchError } = await supabaseClient
      .from('scraped_websites')
      .select('data')
      .eq('id', jobId)
      .single();
      
    if (fetchError) {
      logger.error(`Error fetching job ${jobId} for update`, { error: fetchError });
      return false;
    }
    
    // Update the job data
    const updatedData = {
      ...currentJob.data,
      ...metadata,
      status,
      lastUpdated: new Date().toISOString()
    };
    
    const { error } = await supabaseClient
      .from('scraped_websites')
      .update({
        data: updatedData,
        status,
        scraped_at: new Date().toISOString()
      })
      .eq('id', jobId);
      
    if (error) {
      logger.error(`Error updating job ${jobId}`, { error });
      return false;
    }
    
    logger.info(`Updated job ${jobId} status to ${status}`);
    return true;
  } catch (error) {
    logger.error(`Error in updateScrapeJob for job ${jobId}`, { error: error.message });
    return false;
  }
}

// Export wrapped functions
module.exports = {
  initSupabase,
  getCachedData,
  saveScrapedData,
  createScrapeJob,
  updateScrapeJob
}; 