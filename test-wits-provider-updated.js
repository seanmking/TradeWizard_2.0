/**
 * Test script for the updated WITS TRAINS provider
 */
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

/**
 * Run tests for the WITS TRAINS provider
 */
async function runTests() {
  console.log('Starting WITS TRAINS provider tests...');
  
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