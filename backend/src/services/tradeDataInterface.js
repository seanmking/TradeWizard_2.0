/**
 * Interface for all trade data providers
 * Defines the common methods that all providers must implement
 */
class TradeDataProvider {
  /**
   * Get basic trade flow data 
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Trade flow data
   */
  async getTradeFlows(params) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get top trading partners
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Top trading partners data
   */
  async getTopPartners(params) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get tariff data if available
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Tariff data
   */
  async getTariffData(params) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Check if this provider supports a specific data type
   * @param {string} dataType - Type of data requested
   * @returns {boolean} - Whether this provider supports the data type
   */
  supportsDataType(dataType) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Generate data visualization
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Visualization metadata
   */
  async generateVisualization(params) {
    throw new Error('Method not implemented');
  }

  /**
   * Get metadata about available reporters/countries
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Reporter metadata
   */
  async getReporters(params) {
    throw new Error('Method not implemented');
  }

  /**
   * Get metadata about available partners
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Partner metadata
   */
  async getPartners(params) {
    throw new Error('Method not implemented');
  }

  /**
   * Get metadata about available products
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Product metadata
   */
  async getProducts(params) {
    throw new Error('Method not implemented');
  }

  /**
   * Get development indicators data
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Development indicators data
   */
  async getDevelopmentIndicators(params) {
    throw new Error('Method not implemented');
  }
}

module.exports = TradeDataProvider; 