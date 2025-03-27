require('dotenv').config();
const axios = require('axios');
const rateLimit = require('axios-rate-limit');
const { parseStringPromise } = require('xml2js');

// Create rate-limited axios instance (5 requests per second)
const http = rateLimit(axios.create(), { maxRPS: 5 });

class WITSApi {
  constructor(config) {
    this.baseUrl = config?.baseUrl || process.env.WITS_BASE_URL || 'https://wits.worldbank.org/API/V1';
    this.sdmxUrl = config?.sdmxUrl || process.env.WITS_SDMX_BASE_URL || 'https://wits.worldbank.org/API/V1/SDMX/V21';
    this.dataSource = config?.dataSource || process.env.WITS_DATA_SOURCE || 'TRN';
  }

  handleError(error) {
    const witsError = new Error(
      error?.message || 'An error occurred while fetching data from WITS API'
    );
    
    if (error?.response) {
      witsError.status = error.response?.status;
      witsError.data = error.response?.data;
    }
    
    throw witsError;
  }

  async parseXMLResponse(xml) {
    try {
      return await parseStringPromise(xml);
    } catch (error) {
      throw new Error('Failed to parse XML response from WITS API');
    }
  }

  async getReporters() {
    try {
      const response = await http.get(`${this.baseUrl}/wits/datasource/${this.dataSource}/country/ALL`);
      const reporters = response.data?.wits?.reporters || [];
      return reporters.map(reporter => ({
        countryCode: reporter.countryCode?.[0],
        iso3Code: reporter.iso3Code?.[0],
        name: reporter.name?.[0],
        isReporter: reporter.isReporter?.[0] === 'true',
        isPartner: reporter.isPartner?.[0] === 'true',
        isGroup: reporter.isGroup?.[0] === 'true',
        groupType: reporter.groupType?.[0],
        notes: reporter.notes?.[0]
      }));
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getProducts() {
    try {
      const response = await http.get(`${this.baseUrl}/wits/datasource/${this.dataSource}/product/all`);
      const products = response.data?.wits?.products || [];
      return products.map(product => ({
        productCode: product.productCode?.[0],
        description: product.description?.[0],
        isGroup: product.isGroup?.[0] === 'true',
        groupType: product.groupType?.[0],
        notes: product.notes?.[0]
      }));
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getTariffData(params) {
    try {
      const { reporter, partner, product, year, dataType = 'reported' } = params;
      const url = `${this.sdmxUrl}/datasource/${this.dataSource}/reporter/${reporter}/partner/${partner}/product/${product}/year/${year}/datatype/${dataType}`;
      
      const response = await http.get(url);
      const xmlData = await this.parseXMLResponse(response.data);
      
      // Extract data from SDMX format
      const series = xmlData?.['message:StructureSpecificData']?.['message:DataSet']?.[0]?.Series || [];
      
      return series.map(series => {
        const obs = series.Obs?.[0];
        return {
          simpleAverage: parseFloat(obs.$.OBS_VALUE || '0'),
          tariffType: obs.$.TARIFFTYPE || '',
          totalLines: parseInt(obs.$.TOTALNOOFLINES || '0', 10),
          prefLines: parseInt(obs.$.NBR_PREF_LINES || '0', 10),
          mfnLines: parseInt(obs.$.NBR_MFN_LINES || '0', 10),
          naLines: parseInt(obs.$.NBR_NA_LINES || '0', 10),
          sumOfRates: parseFloat(obs.$.SUM_OF_RATES || '0'),
          minRate: parseFloat(obs.$.MIN_RATE || '0'),
          maxRate: parseFloat(obs.$.MAX_RATE || '0'),
          nomenCode: obs.$.NOMENCODE || ''
        };
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async checkDataAvailability(params) {
    try {
      let url = `${this.baseUrl}/wits/datasource/${this.dataSource}/dataavailability`;
      
      if (params) {
        const { reporter, year } = params;
        if (reporter || year) {
          url += '/country/';
          url += reporter || 'ALL';
          url += '/year/';
          url += year || 'ALL';
        }
      }
      
      const response = await http.get(url);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Export singleton instance
const witsApi = new WITSApi();

// Export both the class and the singleton instance
module.exports = {
  WITSApi,
  witsApi
}; 