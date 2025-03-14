/**
 * Direct WITS API Test Script
 * Tests the raw WITS API endpoints without using our wrapper code
 */

const http = require('http');

const TEST_ENDPOINTS = [
  // Test WITS-specific endpoints
  '/api/trade/data-types?provider=wits_trains',
  '/api/trade/reporters?dataType=tariff_data&provider=wits_trains',
  '/api/trade/partners?dataType=tariff_data&provider=wits_trains&reporter=840&year=2020',
  '/api/trade/tariffs?reporter=840&partner=000&product=010121&year=2020&dataType=reported&provider=wits_trains'
];

const config = {
  port: 5002,
  host: 'localhost'
};

function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    console.log(`\nTesting endpoint: ${endpoint}`);
    
    const options = {
      hostname: config.host,
      port: config.port,
      path: endpoint,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      console.log(`Status: ${res.statusCode}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Try to parse as JSON
          const parsedData = JSON.parse(data);
          console.log('Response data:', JSON.stringify(parsedData, null, 2));
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch (e) {
          // If not JSON, return raw data but trimmed
          const trimmedData = data.length > 200 ? 
            data.substring(0, 200) + '...(truncated)' : 
            data;
          console.log('Raw response:', trimmedData);
          resolve({ statusCode: res.statusCode, data: trimmedData });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error with request: ${error.message}`);
      reject(error);
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('Testing WITS API endpoints...');
  console.log(`Server: http://${config.host}:${config.port}`);
  
  for (const endpoint of TEST_ENDPOINTS) {
    try {
      await testEndpoint(endpoint);
    } catch (error) {
      console.error(`Failed to test ${endpoint}:`, error);
    }
  }
  
  console.log('\nAll WITS tests completed.');
}

runTests(); 