/**
 * Advanced Database Adapter
 * Based on the developer's recommended implementation pattern
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

class DatabaseAdapterService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      const error = 'Missing Supabase credentials';
      logger.error(error);
      throw new Error(error);
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    logger.info('Advanced Database Adapter initialized');
  }
  
  /**
   * Saves scraped website data using the adapter pattern
   * @param {string} url - Website URL
   * @param {Object} complexData - Rich data from scraper
   * @param {string} status - Status of the scraping operation
   * @returns {Promise<Object>} - Operation result
   */
  async saveScrapedData(url, complexData, status = 'complete') {
    try {
      // Normalize URL by removing protocol
      const normalizedUrl = url.replace(/^https?:\/\//, '');
      
      // Adapt the complex data structure to the simplified schema
      const adaptedData = {
        url: normalizedUrl,
        data: complexData, // Store the entire rich object in the JSONB column
        status,
        scraped_at: new Date().toISOString()
      };
      
      // First check if record exists
      const { data: existingRecord, error: checkError } = await this.supabase
        .from('scraped_websites')
        .select('id')
        .eq('url', normalizedUrl)
        .maybeSingle();
      
      if (checkError) {
        logger.error(`Error checking for existing record for ${normalizedUrl}`, { error: checkError });
        throw checkError;
      }
      
      let result;
      
      if (existingRecord) {
        // Update existing record
        const { data, error } = await this.supabase
          .from('scraped_websites')
          .update(adaptedData)
          .eq('id', existingRecord.id)
          .select();
        
        if (error) {
          logger.error(`Error updating data for ${normalizedUrl}`, { error });
          throw error;
        }
        
        result = data?.[0];
        logger.info(`Updated data for ${normalizedUrl}`);
      } else {
        // Insert new record
        const { data, error } = await this.supabase
          .from('scraped_websites')
          .insert(adaptedData)
          .select();
        
        if (error) {
          logger.error(`Error inserting data for ${normalizedUrl}`, { error });
          throw error;
        }
        
        result = data?.[0];
        logger.info(`Successfully saved data for ${normalizedUrl}`);
      }
      
      return { success: true, data: result };
    } catch (error) {
      logger.error('Error saving data through adapter:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Retrieves scraped website data and extracts the rich object
   * @param {string} url - Website URL
   * @returns {Promise<Object>} - Operation result with data
   */
  async getScrapedData(url) {
    try {
      const normalizedUrl = url.replace(/^https?:\/\//, '');
      
      const { data, error } = await this.supabase
        .from('scraped_websites')
        .select('*')
        .eq('url', normalizedUrl)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No data found - not an error
          logger.info(`No data found for ${normalizedUrl}`);
          return { success: false, error: 'No data found' };
        }
        
        logger.error(`Error retrieving data for ${normalizedUrl}`, { error });
        throw error;
      }
      
      if (!data) {
        logger.info(`No data found for ${normalizedUrl}`);
        return { success: false, error: 'No data found' };
      }
      
      // The adapter translates back to the format the application expects
      const richData = data.data; // Extract the rich object from the JSONB column
      
      return { 
        success: true, 
        data: richData,
        metadata: {
          id: data.id,
          url: data.url,
          status: data.status,
          scraped_at: data.scraped_at
        }
      };
    } catch (error) {
      logger.error('Error retrieving data through adapter:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Lists all scraped websites with optional filtering
   * @param {string} status - Optional status filter
   * @returns {Promise<Object>} - Operation result with list of websites
   */
  async listScrapedWebsites(status) {
    try {
      let query = this.supabase
        .from('scraped_websites')
        .select('*');
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        logger.error('Error listing websites', { error });
        throw error;
      }
      
      // Transform the results to expose the rich data objects
      const transformedResults = data.map(item => ({
        id: item.id,
        url: item.url,
        scrapedAt: item.scraped_at,
        status: item.status,
        // Extract the actual business data from the JSONB
        businessData: item.data
      }));
      
      return { success: true, data: transformedResults };
    } catch (error) {
      logger.error('Error listing websites through adapter:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Updates the status of a scraped website
   * @param {string} url - Website URL
   * @param {string} status - New status
   * @returns {Promise<Object>} - Operation result
   */
  async updateStatus(url, status) {
    try {
      const normalizedUrl = url.replace(/^https?:\/\//, '');
      
      const { data, error } = await this.supabase
        .from('scraped_websites')
        .update({ 
          status,
          scraped_at: new Date().toISOString()
        })
        .eq('url', normalizedUrl)
        .select();
      
      if (error) {
        logger.error(`Error updating status for ${normalizedUrl}`, { error });
        throw error;
      }
      
      return { 
        success: true, 
        data: data?.[0] || null
      };
    } catch (error) {
      logger.error('Error updating status through adapter:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Deletes a scraped website record
   * @param {string} url - Website URL
   * @returns {Promise<Object>} - Operation result
   */
  async deleteScrapedData(url) {
    try {
      const normalizedUrl = url.replace(/^https?:\/\//, '');
      
      const { error } = await this.supabase
        .from('scraped_websites')
        .delete()
        .eq('url', normalizedUrl);
      
      if (error) {
        logger.error(`Error deleting data for ${normalizedUrl}`, { error });
        throw error;
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Error deleting data through adapter:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export a factory function for creating the adapter service
module.exports = {
  createAdapter: () => new DatabaseAdapterService()
}; 