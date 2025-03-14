/**
 * Test script for the WITS TRAINS provider using saved XML responses
 */
const fs = require('fs');
const WITSTrainsProvider = require('./backend/src/services/witsTrainsProvider');

// Simple in-memory cache for testing
const testCache = {
  cache: new Map(),
  async get(key) {
    return this.cache.get(key);
  },
  async set(key, value, ttl) {
    this.cache.set(key, value);
    return true;
  }
};

// Create provider instance with test cache
const provider = new WITSTrainsProvider({ cache: testCache });

// Mock the makeRequest method to return saved responses
provider.makeRequest = async (endpoint) => {
  console.log(`Mock request to: ${endpoint}`);
  
  // Determine which file to load based on the endpoint
  let filename;
  
  if (endpoint.includes('/country/ALL')) {
    filename = 'wits_response_country_ALL.xml';
  } else if (endpoint.includes('/product/ALL')) {
    filename = 'wits_response_product_ALL.xml';
  } else if (endpoint.includes('/dataavailability/country/840/year/2020')) {
    filename = 'wits_response_dataavailability_840_2020.xml';
  } else if (endpoint.includes('/datasource/TRN/reporter/840/partner/000/product/010121/year/2020')) {
    filename = 'wits_response_tariff_840_000_010121_2020.xml';
  } else {
    throw new Error(`No mock response available for endpoint: ${endpoint}`);
  }
  
  // Check if the file exists
  if (!fs.existsSync(filename)) {
    console.error(`Mock response file not found: ${filename}`);
    // Create a minimal XML response
    if (filename.includes('country')) {
      return `<?xml version="1.0" encoding="UTF-8"?>
      <CodeList>
        <Code id="840"><Description>United States</Description></Code>
        <Code id="124"><Description>Canada</Description></Code>
        <Code id="484"><Description>Mexico</Description></Code>
      </CodeList>`;
    } else if (filename.includes('product')) {
      return `<?xml version="1.0" encoding="UTF-8"?>
      <CodeList>
        <Code id="010121"><Description>Pure-bred breeding horses</Description></Code>
        <Code id="010129"><Description>Live horses, other than pure-bred breeding</Description></Code>
      </CodeList>`;
    } else if (filename.includes('dataavailability')) {
      return `<?xml version="1.0" encoding="UTF-8"?>
      <DataAvailability>
        <Reporter code="840">United States</Reporter>
        <Year>2020</Year>
        <Partner code="124">Canada</Partner>
        <Partner code="484">Mexico</Partner>
      </DataAvailability>`;
    } else if (filename.includes('tariff')) {
      return `<?xml version="1.0" encoding="UTF-8"?>
      <message:MessageGroup xmlns:message="http://www.SDMX.org/resources/SDMXML/schemas/v2_0/message">
        <message:DataSet>
          <Series PRODUCTCODE="010121" PARTNER="000" REPORTER="840" MEASURECODE="SimpleAverage" TARIFFTYPE="MFN" NOMENCLATURECODE="H5">
            <Obs TIME_PERIOD="2020" OBS_VALUE="0" />
          </Series>
        </message:DataSet>
      </message:MessageGroup>`;
    }
  }
  
  try {
    // Return the file contents
    return fs.readFileSync(filename, 'utf8');
  } catch (error) {
    console.error(`Error reading mock response file: ${error.message}`);
    throw error;
  }
};

/**
 * Run tests for the WITS TRAINS provider
 */
async function runTests() {
  console.log('Starting WITS TRAINS provider tests with saved responses...');
  
  try {
    // Test 1: Get reporters
    console.log('\n--- Test 1: Get Reporters ---');
    const reporters = await provider.getReporters();
    console.log(`Retrieved ${reporters.length} reporters`);
    if (reporters.length > 0) {
      console.log('First 3 reporters:', reporters.slice(0, 3));
    }
    
    // Test 2: Get products
    console.log('\n--- Test 2: Get Products ---');
    const products = await provider.getProducts();
    console.log(`Retrieved ${products.length} products`);
    if (products.length > 0) {
      console.log('First 3 products:', products.slice(0, 3));
    }
    
    // Test 3: Check data availability for US in 2020
    console.log('\n--- Test 3: Check Data Availability ---');
    const availability = await provider.getDataAvailability({
      reporterCode: '840', // USA
      year: '2020'
    });
    console.log('Data availability:', availability);
    
    // Test 4: Get partners for US in 2020
    console.log('\n--- Test 4: Get Partners for Reporter ---');
    const partners = await provider.getPartners({
      reporterCode: '840', // USA
      year: '2020'
    });
    console.log(`Retrieved ${partners.length} partners for USA in 2020`);
    if (partners.length > 0) {
      console.log('First 3 partners:', partners.slice(0, 3));
    }
    
    // Test 5: Get tariff data
    console.log('\n--- Test 5: Get Tariff Data ---');
    const tariffData = await provider.getTariffData({
      reporterCode: '840', // USA
      partnerCode: '000', // World
      productCode: '010121', // Pure-bred breeding horses
      year: '2020'
    });
    console.log(`Retrieved ${tariffData.length} tariff records`);
    if (tariffData.length > 0) {
      console.log('First tariff record:', tariffData[0]);
    }
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests(); 