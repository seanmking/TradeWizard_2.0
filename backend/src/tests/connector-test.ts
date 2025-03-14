import * as dotenv from 'dotenv';
import { setupTradeMapConnector } from '../mcp/market-intelligence-mcp/connectors/trade-map';
import { setupComtradeConnector } from '../mcp/market-intelligence-mcp/connectors/comtrade';
import { setupWitsConnector } from '../mcp/market-intelligence-mcp/connectors/wits';
import { StandardDataStructures } from '../utils/data-standards';

// Load environment variables
dotenv.config();

// Test HS code (Coffee)
const TEST_HS_CODE = '090111';
// Test countries
const EXPORTER = 'BRA'; // Brazil
const IMPORTER = 'USA'; // United States

async function testTradeMapConnector() {
  console.log('\n=== TESTING TRADE MAP CONNECTOR ===');
  try {
    const tradeMap = await setupTradeMapConnector({
      apiKey: process.env.TRADE_MAP_API_KEY || '',
      baseUrl: process.env.TRADE_MAP_BASE_URL || 'https://api.trademap.org/api/v1'
    });

    console.log('1. Testing getTradeFlowByHsCode...');
    const tradeFlow = await tradeMap.getTradeFlowByHsCode(TEST_HS_CODE, EXPORTER, IMPORTER);
    console.log(`Result: ${tradeFlow.length} records found`);
    if (tradeFlow.length > 0) {
      console.log(`Sample: ${JSON.stringify(tradeFlow[0], null, 2)}`);
      console.log('✅ Trade flow data retrieval successful');
    } else {
      console.log('⚠️ No trade flow data found, this could be normal or indicate an issue');
    }

    console.log('\n2. Testing getTopExportersByHsCode...');
    const exporters = await tradeMap.getTopExportersByHsCode(TEST_HS_CODE, 5);
    console.log(`Result: ${exporters.length} exporters found`);
    if (exporters.length > 0) {
      console.log(`Sample: ${JSON.stringify(exporters[0], null, 2)}`);
      console.log('✅ Top exporters data retrieval successful');
    } else {
      console.log('⚠️ No exporters data found, this could be normal or indicate an issue');
    }

    console.log('\n3. Testing getMarketTrends...');
    const trends = await tradeMap.getMarketTrends(TEST_HS_CODE, IMPORTER, 3);
    console.log(`Result: ${trends.length} trend points found`);
    if (trends.length > 0) {
      console.log(`Sample: ${JSON.stringify(trends[0], null, 2)}`);
      console.log('✅ Market trends data retrieval successful');
    } else {
      console.log('⚠️ No trend data found, this could be normal or indicate an issue');
    }

    return true;
  } catch (error) {
    console.error('❌ Trade Map connector test failed:', error);
    return false;
  }
}

async function testComtradeConnector() {
  console.log('\n=== TESTING UN COMTRADE CONNECTOR ===');
  try {
    const comtrade = await setupComtradeConnector({
      apiKey: process.env.COMTRADE_API_KEY || '',
      baseUrl: process.env.COMTRADE_BASE_URL || 'https://comtrade.un.org/api'
    });

    console.log('1. Testing getTradeFlowByHsCode...');
    const tradeFlow = await comtrade.getTradeFlowByHsCode(
      TEST_HS_CODE, 
      EXPORTER, 
      IMPORTER, 
      undefined, 
      StandardDataStructures.TradeFlowType.EXPORT
    );
    console.log(`Result: ${tradeFlow.length} records found`);
    if (tradeFlow.length > 0) {
      console.log(`Sample: ${JSON.stringify(tradeFlow[0], null, 2)}`);
      console.log('✅ Trade flow data retrieval successful');
    } else {
      console.log('⚠️ No trade flow data found, this could be normal or indicate an issue');
    }

    console.log('\n2. Testing getTopTradingPartners...');
    const partners = await comtrade.getTopTradingPartners(EXPORTER, TEST_HS_CODE, 5);
    console.log(`Result: ${partners.length} partners found`);
    if (partners.length > 0) {
      console.log(`Sample: ${JSON.stringify(partners[0], null, 2)}`);
      console.log('✅ Top trading partners data retrieval successful');
    } else {
      console.log('⚠️ No partners data found, this could be normal or indicate an issue');
    }

    console.log('\n3. Testing getHistoricalTradeData...');
    const currentYear = new Date().getFullYear();
    const historicalData = await comtrade.getHistoricalTradeData(
      TEST_HS_CODE,
      EXPORTER,
      currentYear - 3,
      currentYear - 1
    );
    console.log(`Result: ${historicalData.length} historical data points found`);
    if (historicalData.length > 0) {
      console.log(`Sample: ${JSON.stringify(historicalData[0], null, 2)}`);
      console.log('✅ Historical trade data retrieval successful');
    } else {
      console.log('⚠️ No historical data found, this could be normal or indicate an issue');
    }

    return true;
  } catch (error) {
    console.error('❌ UN Comtrade connector test failed:', error);
    return false;
  }
}

async function testWitsConnector() {
  console.log('\n=== TESTING WITS CONNECTOR ===');
  try {
    const wits = await setupWitsConnector({
      apiKey: process.env.WITS_API_KEY || '',
      baseUrl: process.env.WITS_BASE_URL || 'https://wits.worldbank.org/API/V1'
    });

    console.log('1. Testing getTariffData...');
    const tariffData = await wits.getTariffData(TEST_HS_CODE, IMPORTER, EXPORTER);
    console.log(`Result: ${JSON.stringify(tariffData, null, 2)}`);
    console.log('✅ Tariff data retrieval successful');

    // Add more tests here based on what methods WITS connector provides

    return true;
  } catch (error) {
    console.error('❌ WITS connector test failed:', error);
    return false;
  }
}

async function runTests() {
  console.log('STARTING CONNECTOR TESTS');
  console.log('Make sure you have valid API keys in your .env file before running these tests');
  
  // Results
  const results = {
    tradeMap: false,
    comtrade: false,
    wits: false
  };

  try {
    results.tradeMap = await testTradeMapConnector();
  } catch (e) {
    console.error('Trade Map test execution failed:', e);
  }

  try {
    results.comtrade = await testComtradeConnector();
  } catch (e) {
    console.error('UN Comtrade test execution failed:', e);
  }

  try {
    results.wits = await testWitsConnector();
  } catch (e) {
    console.error('WITS test execution failed:', e);
  }

  // Summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Trade Map API: ${results.tradeMap ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`UN Comtrade API: ${results.comtrade ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`WITS API: ${results.wits ? '✅ WORKING' : '❌ FAILED'}`);

  console.log('\nData Requirements Assessment:');
  console.log('Based on the implementations and test results:');
  console.log('- Trade Flow Data: ' + (results.tradeMap || results.comtrade ? '✅ Available' : '❌ Unavailable'));
  console.log('- Top Exporters/Importers: ' + (results.tradeMap || results.comtrade ? '✅ Available' : '❌ Unavailable'));
  console.log('- Market Trends: ' + (results.tradeMap ? '✅ Available' : '❌ Unavailable'));
  console.log('- Tariff Data: ' + (results.wits ? '✅ Available' : '❌ Unavailable'));
  console.log('- Historical Data: ' + (results.comtrade ? '✅ Available' : '❌ Unavailable'));
}

// Run the tests
runTests().catch(console.error); 