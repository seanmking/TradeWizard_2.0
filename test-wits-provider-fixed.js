/**
 * Test script for the fixed WITS TRAINS provider
 * This directly tests the provider implementation with our fixes
 */

const fs = require('fs');
const path = require('path');

// Import the WITS TRAINS provider
try {
  // Adjust the path to your actual WITSTrainsProvider location
  const WITSTrainsProvider = require('./backend/src/services/witsTrainsProvider');
  const provider = new WITSTrainsProvider();

  // Run tests
  async function runTests() {
    console.log('Testing WITS TRAINS provider XML parsing functions...');
    
    try {
      // Test 1: Parse data availability XML
      console.log('\n--- Test 1: Parse Data Availability XML ---');
      const availabilityXmlPath = path.join(__dirname, 'wits_responses', 'wits_response__wits_datasource_trn_dataavailability_country_840_year_2020.xml');
      const availabilityXml = fs.readFileSync(availabilityXmlPath, 'utf8');
      const parsedAvailability = provider.parseDataAvailability(availabilityXml);
      console.log(`Successfully parsed data availability:`);
      console.log(JSON.stringify(parsedAvailability, null, 2));
      
      // Test 2: Parse countries XML
      console.log('\n--- Test 2: Parse Countries XML ---');
      const countriesXmlPath = path.join(__dirname, 'wits_responses', 'wits_response__wits_datasource_trn_country_ALL.xml');
      const countriesXml = fs.readFileSync(countriesXmlPath, 'utf8');
      const parsedCountries = provider.parseCountryResponse(countriesXml);
      console.log(`Successfully parsed ${parsedCountries.length} countries`);
      if (parsedCountries.length > 0) {
        console.log('First three countries:', JSON.stringify(parsedCountries.slice(0, 3), null, 2));
      }
      
      // Test 3: Parse tariff data XML
      console.log('\n--- Test 3: Parse Tariff Data XML ---');
      const tariffXmlPath = path.join(__dirname, 'wits_responses', 'wits_response__SDMX_V21_datasource_TRN_reporter_840_partner_000_product_010121_year_2020_datatype_reported.xml');
      const tariffXml = fs.readFileSync(tariffXmlPath, 'utf8');
      const parsedTariff = provider.parseTariffResponse(tariffXml);
      console.log(`Successfully parsed ${parsedTariff.length} tariff records`);
      if (parsedTariff.length > 0) {
        console.log('First tariff record:', JSON.stringify(parsedTariff[0], null, 2));
      }
      
      console.log('\nAll tests completed.');
    } catch (error) {
      console.error('Error running tests:', error);
    }
  }

  // Execute tests
  runTests();
} catch (error) {
  console.error('Failed to import WITS TRAINS provider:', error);
} 