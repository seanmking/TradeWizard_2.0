/**
 * Database Adapter Module
 * Handles translation between application models and database schema
 */

const logger = require('./logger');

/**
 * Adapts scraped website data to match the simplified database schema
 * @param {string} url - The website URL
 * @param {Object} scrapedData - Full rich data from the scraper
 * @returns {Object} - Data formatted for database storage
 */
function adaptScrapedDataForStorage(url, scrapedData) {
  // Extract domain from URL if it's a full URL
  const normalizedUrl = url.replace(/^https?:\/\//, '');
  
  return {
    url: normalizedUrl,
    data: scrapedData, // Store all rich data in the JSONB 'data' field
    status: 'complete',
    scraped_at: new Date().toISOString()
  };
}

/**
 * Adapts database record back to application model
 * @param {Object} dbRecord - Record from database
 * @returns {Object} - Full application model
 */
function adaptDatabaseRecordToModel(dbRecord) {
  if (!dbRecord) return null;
  
  // Extract the rich data from the JSONB 'data' field
  const modelData = dbRecord.data || {};
  
  // Add metadata from the database record
  return {
    ...modelData,
    id: dbRecord.id,
    url: dbRecord.url,
    status: dbRecord.status,
    lastUpdated: dbRecord.scraped_at,
    dataSource: 'database'
  };
}

/**
 * Saves scraped data to the database using the adapter pattern
 * @param {Object} supabase - Initialized Supabase client
 * @param {string} url - Website URL
 * @param {Object} scrapedData - Full rich data from scraper
 * @returns {Promise<Object>} - Saved database record
 */
async function saveScrapedData(supabase, url, scrapedData) {
  try {
    // Check if record exists
    const normalizedUrl = url.replace(/^https?:\/\//, '');
    const { data: existingData, error: checkError } = await supabase
      .from('scraped_websites')
      .select('id')
      .eq('url', normalizedUrl)
      .maybeSingle();
      
    if (checkError) {
      logger.error(`Error checking for existing data for ${normalizedUrl}`, { error: checkError });
      return null;
    }
    
    // Adapt data for storage
    const adaptedData = adaptScrapedDataForStorage(normalizedUrl, scrapedData);
    
    let result;
    if (existingData?.id) {
      // Update existing record
      const { data, error } = await supabase
        .from('scraped_websites')
        .update(adaptedData)
        .eq('id', existingData.id)
        .select();
        
      if (error) {
        logger.error(`Error updating data for ${normalizedUrl}`, { error });
        return null;
      }
      
      result = data;
      logger.info(`Updated existing record for ${normalizedUrl}`, { id: existingData.id });
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('scraped_websites')
        .insert(adaptedData)
        .select();
        
      if (error) {
        logger.error(`Error inserting data for ${normalizedUrl}`, { error });
        return null;
      }
      
      result = data;
      logger.info(`Created new record for ${normalizedUrl}`);
    }
    
    return result?.[0] || null;
  } catch (error) {
    logger.error(`Error in saveScrapedData for ${url}`, { error: error.message });
    return null;
  }
}

/**
 * Retrieves data from the database and converts it to application model
 * @param {Object} supabase - Initialized Supabase client
 * @param {string} url - Website URL to retrieve
 * @returns {Promise<Object>} - Full application model
 */
async function getScrapedData(supabase, url) {
  try {
    const normalizedUrl = url.replace(/^https?:\/\//, '');
    
    const { data, error } = await supabase
      .from('scraped_websites')
      .select('*')
      .eq('url', normalizedUrl)
      .maybeSingle();
      
    if (error) {
      logger.error(`Error retrieving data for ${normalizedUrl}`, { error });
      return null;
    }
    
    if (!data) {
      logger.info(`No data found for ${normalizedUrl}`);
      return null;
    }
    
    // Convert database record to application model
    return adaptDatabaseRecordToModel(data);
  } catch (error) {
    logger.error(`Error in getScrapedData for ${url}`, { error: error.message });
    return null;
  }
}

module.exports = {
  adaptScrapedDataForStorage,
  adaptDatabaseRecordToModel,
  saveScrapedData,
  getScrapedData
}; 