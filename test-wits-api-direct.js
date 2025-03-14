/**
 * Direct WITS API Test Script
 * Tests the raw WITS API endpoints without using our wrapper code
 */

const axios = require('axios');
const fs = require('fs');

// Base URL for WITS API
const baseUrl = 'https://wits.worldbank.org/API/V1';

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', params = {}) {
  try {
    console.log(`Making request to: ${baseUrl}${endpoint}`);
    
    const response = await axios({
      method,
      url: `${baseUrl}${endpoint}`,
      params,
      headers: {
        'Accept': 'application/xml, text/xml',
      },
      timeout: 30000, // 30 seconds timeout
    });
    
    // Save response to file for inspection
    const filename = `wits_response_${endpoint.replace(/\//g, '_')}.xml`;
    fs.writeFileSync(filename, response.data);
    console.log(`Response saved to ${filename}`);
    
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      console.log(`Error response status: ${error.response.status}`);
      console.log(`Error response data:`, error.response.data);
      
      return { 
        success: false, 
        status: error.response.status,
        data: error.response.data,
        message: `API Error: ${error.response.status}`
      };
    } else if (error.request) {
      // The request was made but no response was received
      console.log('No response received from API');
      return { 
        success: false, 
        message: 'No response received from API',
        error: error.request
      };
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log(`Request failed: ${error.message}`);
      return { 
        success: false, 
        message: `Request failed: ${error.message}`,
        error: error
      };
    }
  }
}

// Test functions
async function testMetadataEndpoints() {
  console.log('\n=== Testing Metadata Endpoints ===');
  
  // Test 1: Get all countries (both reporters and partners)
  console.log('\n--- Test 1: Get All Countries ---');
  await makeRequest('/wits/datasource/trn/country/ALL');
  
  // Test 2: Get all products
  console.log('\n--- Test 2: Get All Products ---');
  await makeRequest('/wits/datasource/trn/product/all');
  
  // Test 3: Get data availability for US in 2020
  console.log('\n--- Test 3: Data Availability ---');
  await makeRequest('/wits/datasource/trn/dataavailability/country/840/year/2020');
}

async function testTariffDataEndpoints() {
  console.log('\n=== Testing Tariff Data Endpoints ===');
  
  // Test 4: Get tariff data for a specific product
  console.log('\n--- Test 4: Get Tariff Data (Specific Product) ---');
  await makeRequest('/SDMX/V21/datasource/TRN/reporter/840/partner/000/product/010121/year/2020/datatype/reported');
  
  // Test 5: Try a different product code
  console.log('\n--- Test 5: Get Tariff Data (Different Product) ---');
  await makeRequest('/SDMX/V21/datasource/TRN/reporter/840/partner/000/product/100199/year/2020/datatype/reported');
  
  // Test 6: Try a different partner
  console.log('\n--- Test 6: Get Tariff Data (Different Partner) ---');
  await makeRequest('/SDMX/V21/datasource/TRN/reporter/840/partner/036/product/100199/year/2020/datatype/reported');
}

// Run all tests
async function runAllTests() {
  try {
    await testMetadataEndpoints();
    await testTariffDataEndpoints();
    console.log('\n=== All Tests Completed ===');
  } catch (error) {
    console.error('Test runner failed:', error);
  }
}

// Execute tests
runAllTests(); 