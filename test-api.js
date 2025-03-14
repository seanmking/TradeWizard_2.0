const http = require('http');

// Available API endpoints to test
const endpoints = [
  '/api/trade/providers',
  '/api/trade/data-types',
  '/api/trade/reporters?dataType=trade_flows',
  '/api/trade/reporters?dataType=tariff_data',
];

// Configuration
const port = 5001;
const host = 'localhost';

// Function to make a GET request to an endpoint
function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      host,
      port,
      path: endpoint,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n--- Response from ${endpoint} ---`);
        console.log(`Status: ${res.statusCode}`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('Data:', JSON.stringify(jsonData, null, 2));
          resolve(jsonData);
        } catch (e) {
          console.log('Raw response:', data);
          resolve(data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error for ${endpoint}:`, error.message);
      reject(error);
    });
    
    req.end();
  });
}

// Run tests for all endpoints
async function runTests() {
  console.log('Testing API endpoints...');
  console.log(`Server: http://${host}:${port}`);
  
  for (const endpoint of endpoints) {
    try {
      await testEndpoint(endpoint);
    } catch (error) {
      console.error(`Test failed for ${endpoint}`);
    }
  }
  
  console.log('\nAll tests completed.');
}

// Start the tests
runTests(); 