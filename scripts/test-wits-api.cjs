const { witsApi } = require('../src/lib/wits-api.cjs');

async function testWitsApiLib() {
  try {
    console.log('Testing WITS API Library...\n');

    // Test getReporters
    console.log('1. Testing getReporters()...');
    const reporters = await witsApi.getReporters();
    console.log(`Found ${reporters.length} reporters`);
    if (reporters.length > 0) {
      console.log('Sample reporter:', reporters[0]);
    }
    console.log();

    // Test getProducts
    console.log('2. Testing getProducts()...');
    const products = await witsApi.getProducts();
    console.log(`Found ${products.length} products`);
    if (products.length > 0) {
      console.log('Sample product:', products[0]);
    }
    console.log();

    // Test checkDataAvailability
    console.log('3. Testing checkDataAvailability()...');
    const availability = await witsApi.checkDataAvailability();
    console.log('Data availability:', availability);
    console.log();

    // Test getTariffData
    console.log('4. Testing getTariffData()...');
    const tariffData = await witsApi.getTariffData({
      reporter: '840', // USA
      partner: '000', // World
      product: '020110', // Sample product code
      year: 2020
    });
    console.log('Tariff data:', tariffData);
    console.log();

    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  }
}

testWitsApiLib(); 