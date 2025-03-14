const fs = require('fs');
const path = require('path');
const https = require('https');

// URLs for testing WITS API endpoints
const testEndpoints = [
  {
    name: 'countries',
    url: 'https://wits.worldbank.org/API/V1/wits/datasource/trn/country/ALL',
    saveFilename: 'wits_response__wits_datasource_trn_country_ALL.xml'
  },
  {
    name: 'data_availability',
    url: 'https://wits.worldbank.org/API/V1/wits/datasource/trn/dataavailability/country/840/year/2020',
    saveFilename: 'wits_response__wits_datasource_trn_dataavailability_country_840_year_2020.xml'
  },
  {
    name: 'tariff_data',
    url: 'https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN/reporter/840/partner/000/product/010121/year/2020/datatype/reported',
    saveFilename: 'wits_response__SDMX_V21_datasource_TRN_reporter_840_partner_000_product_010121_year_2020_datatype_reported.xml'
  }
];

// Ensure the response directory exists
const responseDir = path.join(__dirname, 'wits_responses');
if (!fs.existsSync(responseDir)) {
  fs.mkdirSync(responseDir);
}

// Function to fetch an API response and save it to file
function fetchAndSaveResponse(endpoint) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching ${endpoint.name} from: ${endpoint.url}`);
    
    const outputPath = path.join(responseDir, endpoint.saveFilename);
    
    https.get(endpoint.url, (res) => {
      let data = '';
      
      // Log status code
      console.log(`Status code: ${res.statusCode}`);
      
      // A chunk of data has been received.
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // The whole response has been received.
      res.on('end', () => {
        try {
          // Save the raw response
          fs.writeFileSync(outputPath, data);
          console.log(`Response saved to: ${outputPath}`);
          
          // Check if the response is XML
          const isXml = data.trim().startsWith('<?xml') || data.includes('<');
          console.log(`Response type: ${isXml ? 'XML' : 'Non-XML'}`);
          
          // Log a snippet
          const snippet = data.length > 200 ? data.substring(0, 200) + '...' : data;
          console.log(`Response snippet: ${snippet}`);
          
          resolve({
            endpoint: endpoint.name,
            url: endpoint.url,
            filename: outputPath,
            isXml,
            size: data.length
          });
        } catch (error) {
          console.error(`Error saving response: ${error.message}`);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error(`Error fetching ${endpoint.name}: ${error.message}`);
      reject(error);
    });
  });
}

// Run all tests
async function runTests() {
  console.log('Starting WITS API response tests...');
  
  for (const endpoint of testEndpoints) {
    try {
      await fetchAndSaveResponse(endpoint);
      console.log('-----------------------------------');
    } catch (error) {
      console.error(`Test for ${endpoint.name} failed:`, error);
    }
  }
  
  console.log('All WITS API response tests completed');
}

runTests(); 