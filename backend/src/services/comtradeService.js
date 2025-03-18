const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ComtradeService {
  constructor() {
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
   * Execute a Python script with arguments and return the result
   * @param {string} scriptPath - Path to the Python script
   * @param {Array<string>} args - Arguments to pass to the script
   * @returns {Promise<Object>} - Script output or error
   */
  async executePythonScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('/usr/local/bin/python3', [scriptPath, ...args]);
      
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
   * Get trade data for a specific reporter, flow, and period
   * @param {string} reporterCode - Reporter country code
   * @param {string} flowCode - Flow code (M=Import, X=Export)
   * @param {string} period - Period (YYYY for annual, YYYYMM for monthly)
   * @param {string} cmdCode - Commodity code (default: "TOTAL" for all commodities)
   * @returns {Promise<Object>} - Trade data
   */
  async getTradeData(reporterCode, flowCode, period, cmdCode = "TOTAL") {
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
    return this.executePythonScript(this.pythonScriptPath, scriptArgs);
  }

  /**
   * Convert CSV data to JSON
   * @param {string} csvData - CSV data string
   * @returns {Object} - Parsed JSON data
   */
  processCSV(csvData) {
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
  }

  /**
   * Get top trading partners for a specific reporter, flow, and period
   * @param {string} reporterCode - Reporter country code
   * @param {string} flowCode - Flow code (M=Import, X=Export)
   * @param {string} period - Period (YYYY for annual, YYYYMM for monthly)
   * @param {number} topN - Number of top partners to return
   * @returns {Promise<Object>} - Top trading partners data
   */
  async getTopTradingPartners(reporterCode, flowCode, period, topN = 10) {
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
  }

  /**
   * Get available reporter countries
   * @returns {Promise<Array>} - List of reporter countries
   */
  async getReporterCountries() {
    // Check if we have cached data
    const cachePath = path.join(this.cacheDir, 'reporters.csv');
    
    if (fs.existsSync(cachePath)) {
      const csvData = fs.readFileSync(cachePath, 'utf8');
      return this.processCSV(csvData);
    }
    
    // If not cached, execute the Python script to get reporters
    const scriptArgs = ['--get-reporters', '--output', 'json'];
    return this.executePythonScript(this.pythonScriptPath, scriptArgs);
  }
}

module.exports = new ComtradeService(); 