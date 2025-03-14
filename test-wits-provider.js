/**
 * Test script for the WITS TRAINS provider
 * This directly tests the provider implementation without going through the API
 */

// Import the provider and manager
const WITSTrainsProvider = require('./backend/src/services/witsTrainsProvider');
const tradeDataManager = require('./backend/src/services/tradeDataManager');

// Create an instance of the provider for direct testing
const witsProvider = new WITSTrainsProvider();

// Function to run tests
async function runTests() {
  console.log('Testing WITS TRAINS Provider...');
  
  try {
    // Test 1: Check supported data types
    console.log('\n--- Test 1: Supported Data Types ---');
    const supportsPreferentialTariffs = witsProvider.supportsDataType('preferential_tariffs');
    const supportsMfnTariffs = witsProvider.supportsDataType('mfn_tariffs');
    const supportsTradeFlows = witsProvider.supportsDataType('trade_flows');
    
    console.log(`Supports preferential_tariffs: ${supportsPreferentialTariffs}`);
    console.log(`Supports mfn_tariffs: ${supportsMfnTariffs}`);
    console.log(`Supports trade_flows: ${supportsTradeFlows}`);
    
    // Test 2: Get available providers through the manager
    console.log('\n--- Test 2: Available Providers ---');
    const providers = tradeDataManager.getAvailableProviders();
    console.log('Available providers:', providers);
    
    // Test 3: Get supported data types through the manager
    console.log('\n--- Test 3: Supported Data Types ---');
    const dataTypes = tradeDataManager.getSupportedDataTypes();
    console.log('Supported data types:', dataTypes);
    
    // Test 4: Try to fetch reporters
    console.log('\n--- Test 4: Get Reporters ---');
    console.log('Fetching reporters...');
    try {
      const reporters = await witsProvider.getReporters();
      console.log(`Retrieved ${reporters.length} reporters`);
      if (reporters.length > 0) {
        console.log('First 3 reporters:', reporters.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching reporters:', error.message);
    }
    
    // Test 5: Try to check data availability
    console.log('\n--- Test 5: Check Data Availability ---');
    console.log('Checking data availability for US (840) in 2020...');
    try {
      const availability = await witsProvider.checkDataAvailability({
        reporterCode: '840', 
        year: '2020'
      });
      console.log('Data availability:', JSON.stringify(availability, null, 2));
    } catch (error) {
      console.error('Error checking data availability:', error.message);
    }
    
    // Test 6: Try to get tariff data
    console.log('\n--- Test 6: Get Tariff Data ---');
    console.log('Getting tariff data for US (840), World (000), 2020, all products...');
    try {
      const tariffData = await witsProvider.getTariffData({
        reporterCode: '840',
        partnerCode: '000',
        year: '2020',
        productCode: 'TOTAL',
        dataType: 'reported'
      });
      console.log(`Retrieved ${tariffData.length} tariff records`);
      if (tariffData.length > 0) {
        console.log('First tariff record:', tariffData[0]);
      }
    } catch (error) {
      console.error('Error fetching tariff data:', error.message);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
  
  console.log('\nAll tests completed.');
}

// Run the tests
runTests(); 