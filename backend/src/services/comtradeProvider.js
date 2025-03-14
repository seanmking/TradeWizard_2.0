const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const TradeDataProvider = require('./tradeDataInterface');

/**
 * Provider for UN Comtrade API data
 * Provides access to trade flows using the Python wrapper
 */
class ComtradeProvider extends TradeDataProvider {
  constructor() {
    super();
    // Path to the Python wrapper script
    this.pythonScriptPath = path.join(__dirname, '../../../un_comtrade_poc_wrapper.py');
    
    // Make sure the script exists
    if (!fs.existsSync(this.pythonScriptPath)) {
      console.error(`Error: Python script not found at ${this.pythonScriptPath}`);
    }
    
    // Cache directory for storing data
    this.cacheDir = path.join(__dirname, '../../../comtrade_cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Check if this provider supports a specific data type
   * @param {string} dataType - Type of data requested
   * @returns {boolean} - Whether this provider supports the data type
   */
  supportsDataType(dataType) {
    const supportedTypes = [
      'trade_flows',
      'bilateral_flows',
      'top_partners',
      'trade_visualization'
    ];
    
    return supportedTypes.includes(dataType);
  }

  /**
   * Execute a Python script with arguments and return the result
   * @param {string} scriptPath - Path to the Python script
   * @param {Array<string>} args - Arguments to pass to the script
   * @returns {Promise<Object>} - Script output or error
   */
  async executePythonScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath, ...args]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          reject(new Error(`Python script error: ${stderr}`));
        } else {
          try {
            // Try to parse the output as JSON
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (e) {
            // If not JSON, return the raw output
            resolve({ output: stdout });
          }
        }
      });
    });
  }

  /**
   * Get trade flows data
   * @param {Object} params - Query parameters
   * @param {string} params.reporterCode - Reporter country code
   * @param {string} params.flowCode - Flow code (M=Import, X=Export)
   * @param {string} params.period - Period (YYYY for annual, YYYYMM for monthly)
   * @param {string} params.cmdCode - Commodity code (default: "TOTAL" for all commodities)
   * @returns {Promise<Object>} - Trade data
   */
  async getTradeFlows(params) {
    const {
      reporterCode,
      flowCode,
      period,
      cmdCode = "TOTAL"
    } = params;
    
    // Validate required parameters
    if (!reporterCode || !flowCode || !period) {
      throw new Error('Reporter code, flow code, and period are required');
    }
    
    return this.getTradeData(reporterCode, flowCode, period, cmdCode);
  }

  /**
   * Get trade data for a specific reporter, flow, and period
   * @param {string} reporterCode - Reporter country code
   * @param {string} flowCode - Flow code (M=Import, X=Export)
   * @param {string} period - Period (YYYY for annual, YYYYMM for monthly)
   * @param {string} cmdCode - Commodity code (default: "TOTAL" for all commodities)
   * @returns {Promise<Object>} - Trade data
   */
  async getTradeData(reporterCode, flowCode, period, cmdCode = "TOTAL") {
    try {
      // Check if we have cached data
      const cacheKey = `preview_C_A_HS_${reporterCode}_${flowCode}_${period}_${cmdCode}.csv`;
      const cachePath = path.join(this.cacheDir, cacheKey);
      
      if (fs.existsSync(cachePath)) {
        // Read the CSV file
        const csvData = fs.readFileSync(cachePath, 'utf8');
        // Process CSV and convert to JSON
        return this.processCSV(csvData);
      }

      // Create a command to execute our Python wrapper with arguments
      const scriptArgs = [
        '--reporter', reporterCode,
        '--flow', flowCode,
        '--period', period,
        '--commodity', cmdCode,
        '--output', 'json'
      ];
      
      // Execute the Python script as a child process
      return await this.executePythonScript(this.pythonScriptPath, scriptArgs);
    } catch (error) {
      console.error(`Error getting trade data: ${error.message}`);
      throw new Error(`Failed to get trade data: ${error.message}`);
    }
  }

  /**
   * Convert CSV data to JSON
   * @param {string} csvData - CSV data string
   * @returns {Object} - Parsed JSON data
   */
  processCSV(csvData) {
    try {
      // Simple CSV to JSON conversion (can be improved with a proper CSV parser)
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',');
      
      const result = [];
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        const item = {};
        
        for (let j = 0; j < headers.length; j++) {
          // Try to convert to number if possible
          const value = row[j];
          item[headers[j]] = isNaN(value) ? value : Number(value);
        }
        
        result.push(item);
      }
      
      return result;
    } catch (error) {
      console.error(`Error processing CSV data: ${error.message}`);
      return [];
    }
  }

  /**
   * Get top trading partners for a specific reporter, flow, and period
   * @param {Object} params - Query parameters
   * @param {string} params.reporterCode - Reporter country code
   * @param {string} params.flowCode - Flow code (M=Import, X=Export)
   * @param {string} params.period - Period (YYYY for annual, YYYYMM for monthly)
   * @param {number} params.topN - Number of top partners to return
   * @returns {Promise<Object>} - Top trading partners data
   */
  async getTopPartners(params) {
    try {
      const {
        reporterCode,
        flowCode,
        period,
        topN = 10
      } = params;
      
      // Validate required parameters
      if (!reporterCode || !flowCode || !period) {
        throw new Error('Reporter code, flow code, and period are required');
      }
      
      const tradeData = await this.getTradeData(reporterCode, flowCode, period);
      
      // Group by partner and sum trade values
      const partnerTotals = {};
      
      tradeData.forEach(item => {
        const partner = item.partnerCode;
        const partnerDesc = item.partnerDesc;
        const value = item.primaryValue || 0;
        
        if (!partnerTotals[partner]) {
          partnerTotals[partner] = {
            partnerCode: partner,
            partnerDesc: partnerDesc,
            totalValue: 0
          };
        }
        
        partnerTotals[partner].totalValue += value;
      });
      
      // Convert to array, sort by total value, and take top N
      const sortedPartners = Object.values(partnerTotals)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, topN);
      
      return sortedPartners;
    } catch (error) {
      console.error(`Error getting top partners: ${error.message}`);
      throw new Error(`Failed to get top partners: ${error.message}`);
    }
  }

  /**
   * Generate a visualization of trade data
   * @param {Object} params - Query parameters
   * @param {string} params.reporterCode - Reporter country code
   * @param {string} params.flowCode - Flow code (M=Import, X=Export)
   * @param {string} params.period - Period (YYYY for annual, YYYYMM for monthly)
   * @param {string} params.cmdCode - Commodity code (default: "TOTAL" for all commodities)
   * @param {number} params.topN - Number of top results to display
   * @returns {Promise<Object>} - Visualization metadata
   */
  async generateVisualization(params) {
    try {
      const {
        reporterCode,
        flowCode,
        period,
        cmdCode = 'TOTAL',
        topN = 10
      } = params;
      
      // Validate required parameters
      if (!reporterCode || !flowCode || !period) {
        throw new Error('Reporter code, flow code, and period are required');
      }
      
      // Generate a unique filename for the visualization
      const timestamp = Date.now();
      const filename = `visualization_${reporterCode}_${flowCode}_${period}_${cmdCode}_${timestamp}.png`;
      const visualizationsDir = path.join(__dirname, '../../../public/visualizations');
      const filePath = path.join(visualizationsDir, filename);
      
      // Make sure the visualizations directory exists
      if (!fs.existsSync(visualizationsDir)) {
        fs.mkdirSync(visualizationsDir, { recursive: true });
      }
      
      // Execute the Python script with visualization arguments
      const scriptArgs = [
        '--visualize',
        '--reporter', reporterCode,
        '--flow', flowCode,
        '--period', period,
        '--commodity', cmdCode,
        '--top-n', topN.toString(),
        '--image-file', filePath
      ];
      
      await this.executePythonScript(this.pythonScriptPath, scriptArgs);
      
      // Return the URL to the generated image
      return {
        success: true,
        imageUrl: `/visualizations/${filename}`
      };
    } catch (error) {
      console.error(`Error generating visualization: ${error.message}`);
      throw new Error(`Failed to generate visualization: ${error.message}`);
    }
  }

  /**
   * Get available reporter countries
   * @returns {Promise<Array>} - List of reporter countries
   */
  async getReporters() {
    try {
      // Check if we have cached data
      const cachePath = path.join(this.cacheDir, 'reporters.csv');
      
      if (fs.existsSync(cachePath)) {
        const csvData = fs.readFileSync(cachePath, 'utf8');
        return this.processCSV(csvData);
      }
      
      // If not cached, execute the Python script to get reporters
      const scriptArgs = ['--get-reporters', '--output', 'json'];
      return await this.executePythonScript(this.pythonScriptPath, scriptArgs);
    } catch (error) {
      console.error(`Error getting reporters: ${error.message}`);
      throw new Error(`Failed to get reporters: ${error.message}`);
    }
  }

  /**
   * Get available partners
   * This is a placeholder implementation - for Comtrade, partners are the same as reporters
   * @returns {Promise<Array>} - List of partner countries
   */
  async getPartners() {
    // For UN Comtrade, partners are the same as reporters
    return this.getReporters();
  }

  /**
   * Get available products
   * This is a placeholder implementation for the Comtrade provider
   * @returns {Promise<Array>} - List of products
   */
  async getProducts() {
    try {
      // Execute the Python script to get commodities
      const scriptArgs = ['--get-commodities', '--output', 'json'];
      return await this.executePythonScript(this.pythonScriptPath, scriptArgs);
    } catch (error) {
      console.error(`Error getting products: ${error.message}`);
      throw new Error(`Failed to get products: ${error.message}`);
    }
  }

  /**
   * Get tariff data - not supported by Comtrade
   * @returns {Promise<null>} - Always null
   */
  async getTariffData() {
    return null;
  }

  /**
   * Get development indicators - not supported by Comtrade
   * @returns {Promise<null>} - Always null
   */
  async getDevelopmentIndicators() {
    return null;
  }
}

module.exports = ComtradeProvider; 