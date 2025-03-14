const axios = require('axios');
const fs = require('fs');
const path = require('path');
const TradeDataProvider = require('./tradeDataInterface');

/**
 * Base provider for all WITS API services
 * Handles common functionality like HTTP requests, caching, and error handling
 */
class WITSBaseProvider extends TradeDataProvider {
  constructor() {
    super();
    
    // Base URL for WITS API
    this.baseUrl = 'https://wits.worldbank.org/API/V1';
    
    // Cache directory
    this.cacheDir = path.join(__dirname, '../../../wits_cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    
    // Default cache expiration (7 days)
    this.cacheExpiration = 7 * 24 * 60 * 60 * 1000;
  }

  /**
   * Make an HTTP request to the WITS API
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {Object} params - Query parameters
   * @param {Object} headers - HTTP headers
   * @returns {Promise<Object|string>} - API response
   */
  async makeRequest(endpoint, method = 'GET', params = {}, headers = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      // Determine if we should accept XML or JSON based on the endpoint
      const acceptHeader = endpoint.includes('/SDMX/') || endpoint.includes('/datasource/') 
        ? 'application/xml, text/xml' 
        : 'application/json';
      
      console.log(`Making request to: ${url}`);
      
      const response = await axios({
        method,
        url,
        params,
        headers: {
          ...headers,
          'Accept': acceptHeader,
        },
        timeout: 30000, // 30 seconds timeout
        // Don't transform XML responses automatically
        transformResponse: [(data) => {
          // Return raw data for XML responses
          if (typeof data === 'string' && data.includes('<?xml')) {
            return data;
          }
          
          // Try to parse JSON
          try {
            return JSON.parse(data);
          } catch (e) {
            return data;
          }
        }],
      });
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - Error object
   * @throws {Error} - Rethrows with more context
   */
  handleApiError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      let message = `WITS API Error: ${status}`;
      
      // Check if the error response is XML
      if (typeof data === 'string' && data.includes('<wits:error')) {
        // Extract error message from XML
        const errorMatch = data.match(/<wits:message[^>]*>(.*?)<\/wits:message>/);
        if (errorMatch && errorMatch.length > 1) {
          message += ` - ${errorMatch[1]}`;
        }
      } else if (data && data.error) {
        message += ` - ${data.error}`;
      } else if (typeof data === 'string') {
        message += ` - ${data}`;
      }
      
      throw new Error(message);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response received from WITS API');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`WITS API request failed: ${error.message}`);
    }
  }

  /**
   * Get data from cache if available and not expired
   * @param {string} key - Cache key
   * @returns {Promise<Object|null>} - Cached data or null
   */
  async getCachedData(key) {
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    
    if (fs.existsSync(cacheFile)) {
      try {
        const data = fs.readFileSync(cacheFile, 'utf8');
        const { timestamp, result } = JSON.parse(data);
        
        // Check if cache is expired
        if (Date.now() - timestamp < this.cacheExpiration) {
          return result;
        }
      } catch (error) {
        console.error(`Error reading cache file: ${error.message}`);
      }
    }
    
    return null;
  }

  /**
   * Cache data with timestamp
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   */
  async cacheData(key, data) {
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    
    try {
      const cacheData = {
        timestamp: Date.now(),
        result: data
      };
      
      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error writing cache file: ${error.message}`);
    }
  }

  /**
   * Generate a cache key from parameters
   * @param {string} prefix - Cache key prefix
   * @param {Object} params - Parameters to include in cache key
   * @returns {string} - Cache key
   */
  generateCacheKey(prefix, params) {
    const paramsStr = Object.entries(params)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}=${value}`)
      .join('_');
    
    return `${prefix}_${paramsStr}`;
  }

  /**
   * Abstract method - must be implemented by subclasses
   */
  supportsDataType(dataType) {
    throw new Error('Method not implemented');
  }
}

module.exports = WITSBaseProvider; 