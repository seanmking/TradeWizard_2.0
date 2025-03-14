const WITSBaseProvider = require('./witsBaseProvider');
const axios = require('axios');

/**
 * Provider for WITS UNCTAD TRAINS tariff data
 * Provides access to preferential and MFN tariff rates
 */
class WITSTrainsProvider extends WITSBaseProvider {
  /**
   * Constructor
   * @param {Object} options - Provider options
   * @param {Object} options.cache - Cache service
   */
  constructor(options = {}) {
    super(options);
    
    this.name = 'wits_trains';
    this.displayName = 'WITS TRAINS';
    this.description = 'World Integrated Trade Solution - TRAINS (Trade Analysis Information System)';
    
    // Base endpoints
    this.baseEndpoint = 'https://wits.worldbank.org/API/V1';
    this.metaEndpoint = `${this.baseEndpoint}/wits/datasource/trn`;
    this.dataEndpoint = `${this.baseEndpoint}/SDMX/V21`;
    
    // Data source identifier
    this.dataSource = 'TRN';
    
    // Initialize cache
    this.cache = options.cache;
  }

  /**
   * Check if this provider supports a specific data type
   * @param {string} dataType - Type of data requested
   * @returns {boolean} - Whether this provider supports the data type
   */
  supportsDataType(dataType) {
    const supportedTypes = [
      'preferential_tariffs',
      'mfn_tariffs',
      'tariff_data',
      'tariff_rates'
    ];
    
    return supportedTypes.includes(dataType);
  }

  /**
   * Get tariff data
   * @param {Object} params - Query parameters
   * @param {string} params.reporterCode - Reporter country code
   * @param {string} params.partnerCode - Partner country code
   * @param {string} params.productCode - Product code
   * @param {string} params.year - Year
   * @param {boolean} params.useCache - Whether to use cached data
   * @returns {Promise<Array>} - Tariff data
   */
  async getTariffData(params = {}) {
    const { 
      reporterCode, 
      partnerCode = '000', // Default to World
      productCode, 
      year,
      useCache = true 
    } = params;
    
    if (!reporterCode || !productCode || !year) {
      console.error('Missing required parameters for tariff data');
      return [];
    }
    
    // Check if we have cached data
    const cacheKey = `trains_tariff_${reporterCode}_${partnerCode}_${productCode}_${year}`;
    
    if (useCache) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Construct the endpoint for tariff data
    // Using SDMX format for better structure
    const endpoint = `${this.dataEndpoint}/datasource/TRN/reporter/${reporterCode}/partner/${partnerCode}/product/${productCode}/year/${year}/datatype/reported`;
    
    try {
      const data = await this.makeRequest(endpoint);
      
      // Parse the response to extract tariff data
      const tariffData = this.parseTariffResponse(data);
      
      // Cache the result
      await this.cacheData(cacheKey, tariffData);
      
      return tariffData;
    } catch (error) {
      console.error(`Error fetching tariff data: ${error.message}`);
      // Return empty array instead of throwing error
      return [];
    }
  }

  /**
   * Parse tariff response
   * @param {string|Object} response - API response
   * @returns {Array} - Parsed tariff data
   */
  parseTariffResponse(response) {
    console.log('Parsing SDMX XML tariff response');
    const result = [];
    
    try {
      // Check if response is XML
      if (typeof response === 'string' && response.includes('<?xml')) {
        // Extract Series elements
        const seriesRegex = /<Series[^>]*>([\s\S]*?)<\/Series>/g;
        let seriesMatch;
        
        while ((seriesMatch = seriesRegex.exec(response)) !== null) {
          const seriesXml = seriesMatch[0];
          
          // Extract series attributes
          const productMatch = /PRODUCTCODE="([^"]+)"/.exec(seriesXml);
          const partnerMatch = /PARTNER="([^"]+)"/.exec(seriesXml);
          const reporterMatch = /REPORTER="([^"]+)"/.exec(seriesXml);
          const measureMatch = /MEASURECODE="([^"]+)"/.exec(seriesXml);
          const typeMatch = /TARIFFTYPE="([^"]+)"/.exec(seriesXml);
          const nomenclatureMatch = /NOMENCLATURECODE="([^"]+)"/.exec(seriesXml);
          
          if (productMatch && partnerMatch && reporterMatch) {
            const productCode = productMatch[1];
            const partnerCode = partnerMatch[1];
            const reporterCode = reporterMatch[1];
            const measureType = measureMatch ? measureMatch[1] : 'SimpleAverage';
            const tariffType = typeMatch ? typeMatch[1] : 'MFN';
            const nomenclature = nomenclatureMatch ? nomenclatureMatch[1] : '';
            
            // Extract Obs elements (observations)
            const obsRegex = /<Obs[^>]*?TIME_PERIOD="([^"]+)"[^>]*?OBS_VALUE="([^"]+)"[^>]*?>/g;
            let obsMatch;
            
            while ((obsMatch = obsRegex.exec(seriesXml)) !== null) {
              const year = obsMatch[1];
              const tariffRate = parseFloat(obsMatch[2]);
              
              result.push({
                reporterCode,
                partnerCode,
                productCode,
                year,
                tariffRate,
                tariffType,
                measureType,
                totalLines: 1,
                prefLines: 0,
                mfnLines: 1,
                minRate: tariffRate,
                maxRate: tariffRate,
                nomenclature
              });
            }
          }
        }
        
        return result;
      }
      
      // Handle JSON response
      if (typeof response === 'string') {
        response = JSON.parse(response);
      }
      
      if (response && response.dataSets && response.dataSets.length > 0) {
        const dataSet = response.dataSets[0];
        
        if (dataSet.observations) {
          // Process observations
          Object.entries(dataSet.observations).forEach(([key, obs]) => {
            // Extract indices from the key (format: "0:0:0:0:0")
            const indices = key.split(':').map(Number);
            
            // Get dimension values using indices
            const dimensions = dataSet.structure.dimensions;
            const reporterCode = dimensions.series[0].values[indices[0]].id;
            const partnerCode = dimensions.series[1].values[indices[1]].id;
            const productCode = dimensions.series[2].values[indices[2]].id;
            const year = dimensions.observation[0].values[indices[4]].id;
            
            // Get attributes
            const attributes = dataSet.structure.attributes;
            const tariffType = attributes.series[0].values[indices[0]].name;
            const measureType = attributes.series[1].values[indices[1]].name;
            
            // Get the tariff rate value
            const tariffRate = parseFloat(obs[0]);
            
            result.push({
              reporterCode,
              partnerCode,
              productCode,
              year,
              tariffRate,
              tariffType,
              measureType,
              totalLines: 1,
              prefLines: 0,
              mfnLines: 1,
              minRate: tariffRate,
              maxRate: tariffRate,
              nomenclature: 'H5'
            });
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Error parsing tariff response: ${error.message}`);
      return [];
    }
  }

  /**
   * Get available reporter countries
   * @param {Object} params - Query parameters
   * @param {boolean} params.useCache - Whether to use cached data
   * @returns {Promise<Array>} - Reporter countries
   */
  async getReporters(params = {}) {
    const { useCache = true } = params;
    
    // Check if we have cached data
    const cacheKey = 'trains_reporters';
    
    if (useCache) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Make request to get reporters
    const endpoint = `${this.metaEndpoint}/country/ALL`;
    
    try {
      const data = await this.makeRequest(endpoint);
      
      // Parse the response to extract reporters
      const reporters = this.parseCountryResponse(data, 'reporter');
      
      // Cache the result
      await this.cacheData(cacheKey, reporters);
      
      return reporters;
    } catch (error) {
      console.error(`Error fetching reporters: ${error.message}`);
      // Return empty array instead of throwing error
      return [];
    }
  }

  /**
   * Get available partner countries for a reporter
   * @param {Object} params - Query parameters
   * @param {string} params.reporterCode - Reporter country code
   * @param {string} params.year - Year
   * @param {boolean} params.useCache - Whether to use cached data
   * @returns {Promise<Array>} - Partner countries
   */
  async getPartners(params = {}) {
    const { reporterCode, year, useCache = true } = params;
    
    // If reporterCode and year are provided, get specific partners for that reporter-year
    if (reporterCode && year) {
      return this.getPartnersForReporter(reporterCode, year, useCache);
    }
    
    // Otherwise, get all possible partners
    const cacheKey = 'trains_partners';
    
    if (useCache) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Make request to get all partners
    const endpoint = `${this.metaEndpoint}/country/ALL`;
    
    try {
      const data = await this.makeRequest(endpoint);
      
      // Parse the response to extract partners
      const partners = this.parseCountryResponse(data, 'partner');
      
      // Cache the result
      await this.cacheData(cacheKey, partners);
      
      return partners;
    } catch (error) {
      console.error(`Error fetching partners: ${error.message}`);
      // Return empty array instead of throwing error
      return [];
    }
  }

  /**
   * Get available partners for a specific reporter and year
   * @param {string} reporterCode - Reporter country code
   * @param {string} year - Year
   * @param {boolean} useCache - Whether to use cached data
   * @returns {Promise<Array>} - Partner countries
   */
  async getPartnersForReporter(reporterCode, year, useCache = true) {
    // Check if we have cached data
    const cacheKey = `trains_partners_${reporterCode}_${year}`;
    
    if (useCache) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Make request to get data availability for this reporter-year
    const endpoint = `${this.metaEndpoint}/dataavailability/country/${reporterCode}/year/${year}`;
    
    try {
      const data = await this.makeRequest(endpoint);
      
      // Parse the response to extract available partners
      const partners = this.parseDataAvailabilityForPartners(data);
      
      // Cache the result
      await this.cacheData(cacheKey, partners);
      
      return partners;
    } catch (error) {
      console.error(`Error fetching partners for reporter: ${error.message}`);
      // Return empty array instead of throwing error
      return [];
    }
  }

  /**
   * Get available products
   * @param {Object} params - Query parameters
   * @param {boolean} params.useCache - Whether to use cached data
   * @returns {Promise<Array>} - Products
   */
  async getProducts(params = {}) {
    const { useCache = true } = params;
    const cacheKey = 'trains_products';
    
    if (useCache) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Make request to get all products
    const endpoint = `${this.metaEndpoint}/product/ALL`;
    
    try {
      const data = await this.makeRequest(endpoint);
      
      // Parse the response to extract products
      const products = this.parseProductResponse(data);
      
      // Cache the result
      await this.cacheData(cacheKey, products);
      
      return products;
    } catch (error) {
      console.error(`Error fetching products: ${error.message}`);
      // Return empty array instead of throwing error
      return [];
    }
  }

  /**
   * Parse country response
   * @param {string|Object} response - API response
   * @param {string} type - Type of countries to parse (reporter or partner)
   * @returns {Array} - Parsed countries
   */
  parseCountryResponse(response, type = 'reporter') {
    console.log('Parsing XML reporter response');
    try {
      // Check if response is XML
      if (typeof response === 'string' && response.includes('<?xml')) {
        const countries = [];
        
        // Extract country elements using regex that matches the actual XML structure
        // The XML has <wits:country countrycode="XXX" isreporter="X" ispartner="X">
        //              <wits:name>Country Name</wits:name>
        // </wits:country>
        const countryRegex = /<wits:country countrycode="([^"]+)"[^>]*isreporter="([^"]+)"[^>]*ispartner="([^"]+)"[^>]*>[\s\S]*?<wits:name>([^<]+)<\/wits:name>/g;
        let match;
        
        while ((match = countryRegex.exec(response)) !== null) {
          const countryCode = match[1];
          const isReporter = match[2] === "1";
          const isPartner = match[3] === "1";
          const countryName = match[4];
          
          // Filter by type if specified
          if ((type === 'reporter' && isReporter) || 
              (type === 'partner' && isPartner) || 
              type === 'all') {
            countries.push({
              id: countryCode,
              text: countryName
            });
          }
        }
        
        return countries;
      }
      
      // Handle JSON response
      if (typeof response === 'string') {
        response = JSON.parse(response);
      }
      
      if (response && Array.isArray(response.codes)) {
        return response.codes.map(country => ({
          id: country.id,
          text: country.description
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`Error parsing country response: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse product response
   * @param {string|Object} response - API response
   * @returns {Array} - Parsed products
   */
  parseProductResponse(response) {
    try {
      // Check if response is XML
      if (typeof response === 'string' && response.includes('<?xml')) {
        const products = [];
        
        // Extract product elements using regex
        const productRegex = /<Code id="([^"]+)"[^>]*><Description>([^<]+)<\/Description><\/Code>/g;
        let match;
        
        while ((match = productRegex.exec(response)) !== null) {
          const productCode = match[1];
          const productName = match[2];
          
          products.push({
            id: productCode,
            text: productName
          });
        }
        
        return products;
      }
      
      // Handle JSON response
      if (typeof response === 'string') {
        response = JSON.parse(response);
      }
      
      if (response && Array.isArray(response.codes)) {
        return response.codes.map(product => ({
          id: product.id,
          text: product.description
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`Error parsing product response: ${error.message}`);
      return [];
    }
  }

  /**
   * Get data availability for a reporter
   * @param {Object} params - Query parameters
   * @param {string} params.reporterCode - Reporter country code
   * @param {string} params.year - Year
   * @param {boolean} params.useCache - Whether to use cached data
   * @returns {Promise<Object>} - Data availability
   */
  async getDataAvailability(params = {}) {
    const { reporterCode, year, useCache = true } = params;
    
    if (!reporterCode || !year) {
      console.error('Reporter code and year are required for data availability');
      return { available: false, partners: [] };
    }
    
    // Check if we have cached data
    const cacheKey = `trains_availability_${reporterCode}_${year}`;
    
    if (useCache) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Make request to get data availability
    const endpoint = `${this.metaEndpoint}/dataavailability/country/${reporterCode}/year/${year}`;
    
    try {
      const data = await this.makeRequest(endpoint);
      
      // Parse the response to extract data availability
      const availability = this.parseDataAvailability(data);
      
      // Cache the result
      await this.cacheData(cacheKey, availability);
      
      return availability;
    } catch (error) {
      console.error(`Error fetching data availability: ${error.message}`);
      // Return default response instead of throwing error
      return { available: false, partners: [] };
    }
  }

  /**
   * Parse data availability response
   * @param {string|Object} response - API response
   * @returns {Object} - Parsed data availability
   */
  parseDataAvailability(response) {
    try {
      // Check if response is XML
      if (typeof response === 'string' && response.includes('<?xml')) {
        // Extract data availability from XML
        const reporterMatch = /<wits:reporter countrycode="([^"]+)"[^>]*>[\s\S]*?<wits:name>([^<]+)<\/wits:name>/i.exec(response);
        const yearMatch = /<wits:year>(\d+)<\/wits:year>/i.exec(response);
        const partnerListMatch = /<wits:partnerlist>([^<]+)<\/wits:partnerlist>/i.exec(response);
        
        if (!reporterMatch || !yearMatch) {
          return { available: false, partners: [] };
        }
        
        const reporterCode = reporterMatch[1];
        const reporterName = reporterMatch[2];
        const year = yearMatch[1];
        
        // Extract partners from the partner list
        const partners = [];
        if (partnerListMatch) {
          const partnerCodes = partnerListMatch[1].split(';').filter(code => code.trim() !== '');
          
          // For each partner code, create a partner object
          // In a real implementation, you would look up the partner names
          partnerCodes.forEach(code => {
            partners.push({
              id: code,
              text: `Partner ${code}` // Placeholder, would be replaced with actual names
            });
          });
        }
        
        return {
          available: partners.length > 0,
          reporterCode,
          reporterName,
          year,
          partners
        };
      }
      
      // Handle JSON response
      if (typeof response === 'string') {
        response = JSON.parse(response);
      }
      
      // Default structure if we can't parse the response
      return { available: false, partners: [] };
    } catch (error) {
      console.error(`Error parsing data availability: ${error.message}`);
      return { available: false, partners: [] };
    }
  }

  /**
   * Parse data availability response to extract partners
   * @param {string|Object} response - API response
   * @returns {Array} - Parsed partners
   */
  parseDataAvailabilityForPartners(response) {
    const availability = this.parseDataAvailability(response);
    return availability.partners || [];
  }

  /**
   * Make a request to the WITS API
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object|string>} - API response
   */
  async makeRequest(endpoint) {
    try {
      console.log(`Making request to: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Accept': 'application/xml, application/json',
          'User-Agent': 'TradeWizard/1.0'
        },
        timeout: 30000 // 30 seconds timeout
      });
      
      // Check if response is XML
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('xml')) {
        // Return the raw XML string for parsing by specific methods
        return response.data;
      }
      
      // Return JSON data
      return response.data;
    } catch (error) {
      console.error(`API request failed: ${error.message}`);
      
      // Check if we have an error response with data
      if (error.response && error.response.data) {
        console.error('Error response data:', error.response.data);
        
        // If it's XML, return it for parsing
        const contentType = error.response.headers['content-type'] || '';
        if (contentType.includes('xml')) {
          return error.response.data;
        }
      }
      
      throw error;
    }
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached data or null
   */
  async getCachedData(key) {
    if (!this.cache) {
      return null;
    }
    
    try {
      return await this.cache.get(key);
    } catch (error) {
      console.error(`Error getting cached data: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds (default: 1 day)
   * @returns {Promise<boolean>} - Success status
   */
  async cacheData(key, data, ttl = 86400) {
    if (!this.cache) {
      return false;
    }
    
    try {
      await this.cache.set(key, data, ttl);
      return true;
    } catch (error) {
      console.error(`Error caching data: ${error.message}`);
      return false;
    }
  }
}

module.exports = WITSTrainsProvider; 