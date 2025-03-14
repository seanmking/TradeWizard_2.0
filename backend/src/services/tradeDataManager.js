const ComtradeProvider = require('./comtradeProvider');
const WITSTrainsProvider = require('./witsTrainsProvider');

/**
 * Manager for all trade data providers
 * Routes requests to the appropriate provider based on data type
 */
class TradeDataManager {
  constructor() {
    // Initialize providers
    this.providers = {
      comtrade: new ComtradeProvider(),
      wits_trains: new WITSTrainsProvider(),
      // Add more providers as they are implemented
      // wits_tradestats_trade: new WITSTradeStatsProvider(),
      // wits_tradestats_tariff: new WITSTradeStatsTariffProvider(),
      // wits_development: new WITSDevelopmentProvider(),
    };
    
    // Data type to provider mapping
    this.dataTypeMap = {
      // Trade flow data
      'trade_flows': ['comtrade'],
      'bilateral_flows': ['comtrade'],
      
      // Tariff data
      'preferential_tariffs': ['wits_trains'],
      'mfn_tariffs': ['wits_trains'],
      'tariff_data': ['wits_trains'],
      'tariff_rates': ['wits_trains'],
      
      // Partner data
      'top_partners': ['comtrade'],
      
      // Visualizations
      'trade_visualization': ['comtrade'],
      
      // Add more mappings as other providers are implemented
      // 'market_concentration': ['wits_tradestats_trade'],
      // 'market_penetration': ['wits_tradestats_trade'],
      // 'aggregate_tariffs': ['wits_tradestats_tariff'],
      // 'development_indicators': ['wits_development'],
    };
  }
  
  /**
   * Get the appropriate provider for the requested data type
   * @param {string} dataType - The type of data requested
   * @param {Object} preferences - Optional preferences (e.g., preferred provider)
   * @returns {Object} - Provider instance
   */
  getProviderForDataType(dataType, preferences = {}) {
    // Check if we have a preferred provider that supports this data type
    if (preferences.preferredProvider && 
        this.providers[preferences.preferredProvider] &&
        this.providers[preferences.preferredProvider].supportsDataType(dataType)) {
      return this.providers[preferences.preferredProvider];
    }
    
    // Otherwise use the first provider that supports this data type
    const supportedProviders = this.dataTypeMap[dataType] || [];
    for (const providerName of supportedProviders) {
      const provider = this.providers[providerName];
      if (provider && provider.supportsDataType(dataType)) {
        return provider;
      }
    }
    
    throw new Error(`No provider available for data type: ${dataType}`);
  }
  
  /**
   * Get trade flows data using the appropriate provider
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Trade flows data
   */
  async getTradeFlows(params) {
    const provider = this.getProviderForDataType('trade_flows', params.preferences);
    return provider.getTradeFlows(params);
  }
  
  /**
   * Get top trading partners using the appropriate provider
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Top trading partners data
   */
  async getTopPartners(params) {
    const provider = this.getProviderForDataType('top_partners', params.preferences);
    return provider.getTopPartners(params);
  }
  
  /**
   * Get tariff data using the appropriate provider
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Tariff data
   */
  async getTariffData(params) {
    const provider = this.getProviderForDataType('tariff_data', params.preferences);
    return provider.getTariffData(params);
  }
  
  /**
   * Generate visualization using the appropriate provider
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Visualization metadata
   */
  async generateVisualization(params) {
    const dataType = params.visualizationType || 'trade_visualization';
    const provider = this.getProviderForDataType(dataType, params.preferences);
    return provider.generateVisualization(params);
  }
  
  /**
   * Get reporters (countries) using the appropriate provider
   * @param {Object} params - Query parameters
   * @param {string} params.dataType - Type of data for which reporters are needed
   * @returns {Promise<Array>} - Reporters metadata
   */
  async getReporters(params) {
    const { dataType = 'trade_flows', ...otherParams } = params;
    const provider = this.getProviderForDataType(dataType, params.preferences);
    return provider.getReporters(otherParams);
  }
  
  /**
   * Get partners using the appropriate provider
   * @param {Object} params - Query parameters
   * @param {string} params.dataType - Type of data for which partners are needed
   * @returns {Promise<Array>} - Partners metadata
   */
  async getPartners(params) {
    const { dataType = 'trade_flows', ...otherParams } = params;
    const provider = this.getProviderForDataType(dataType, params.preferences);
    return provider.getPartners(otherParams);
  }
  
  /**
   * Get products using the appropriate provider
   * @param {Object} params - Query parameters
   * @param {string} params.dataType - Type of data for which products are needed
   * @returns {Promise<Array>} - Products metadata
   */
  async getProducts(params) {
    const { dataType = 'trade_flows', ...otherParams } = params;
    const provider = this.getProviderForDataType(dataType, params.preferences);
    return provider.getProducts(otherParams);
  }

  /**
   * Get development indicators data using the appropriate provider
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Development indicators data
   */
  async getDevelopmentIndicators(params) {
    try {
      const provider = this.getProviderForDataType('development_indicators', params.preferences);
      return provider.getDevelopmentIndicators(params);
    } catch (error) {
      // If no provider is found, provide a helpful error message
      if (error.message.includes('No provider available')) {
        throw new Error('Development indicators provider not yet implemented');
      }
      throw error;
    }
  }

  /**
   * Get a list of available providers
   * @returns {Array} - List of provider names
   */
  getAvailableProviders() {
    return Object.keys(this.providers);
  }

  /**
   * Get a list of supported data types
   * @returns {Array} - List of supported data types
   */
  getSupportedDataTypes() {
    return Object.keys(this.dataTypeMap);
  }
}

module.exports = new TradeDataManager(); 