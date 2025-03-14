/**
 * Example script for using the Market Intelligence MCP
 * 
 * This script demonstrates how to use the market intelligence connectors
 * to analyze trade data for a specific HS code.
 */

import * as dotenv from 'dotenv';
import setupMarketIntelligenceMcp from '../mcp/market-intelligence-mcp';
import { StandardDataStructures } from '../utils/data-standards';
import { getPerformanceSummary, clearPerformanceMetrics } from '../utils/monitoring';

// Load environment variables
dotenv.config();

/**
 * Example: Analyze trade data for coffee exports
 * 
 * This example shows how to use the Market Intelligence MCP
 * to gather data about Brazilian coffee exports.
 */
async function analyzeMarketIntelligence() {
  console.log('Starting Market Intelligence Analysis...');
  
  // Initialize the MCP - in a real application, this would use API keys from environment variables
  // For demonstration purposes, we'll use mock/placeholder data
  const marketIntelligence = await setupMarketIntelligenceMcp({
    tradeMap: {
      apiKey: process.env.TRADE_MAP_API_KEY || 'demo-key'
    },
    comtrade: {
      apiKey: process.env.COMTRADE_API_KEY || 'demo-key'
    },
    wits: {
      apiKey: process.env.WITS_API_KEY || 'demo-key'
    }
  });
  
  // Clear any existing performance metrics to start fresh
  clearPerformanceMetrics();
  
  // HS code for coffee (090111: Coffee, not roasted, not decaffeinated)
  const hsCode = '090111';
  
  // Exporter country (Brazil)
  const exporterCountry = 'BRA';
  
  // Target markets to analyze
  const targetMarkets = ['USA', 'DEU', 'ITA', 'FRA', 'JPN'];
  
  console.log(`\n===== Analyzing Brazilian coffee exports (HS code: ${hsCode}) =====\n`);
  
  // 1. Get trade flow data between Brazil and USA
  try {
    console.log('1. Trade Flow Data (Brazil to USA):');
    const tradeFlow = await marketIntelligence.getTradeFlowData(
      hsCode,
      exporterCountry,
      'USA',
      {
        year: 2022,
        source: 'tradeMap',
        flowType: StandardDataStructures.TradeFlowType.EXPORT
      }
    );
    console.log(`   - Trade value: $${(tradeFlow.value / 1000000).toFixed(2)} million`);
    console.log(`   - Quantity: ${((tradeFlow.quantity || 0) / 1000).toFixed(2)} thousand ${tradeFlow.unit}`);
    console.log(`   - Year: ${tradeFlow.year}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('   - Error retrieving trade flow data:', errorMessage);
  }
  
  // 2. Get top coffee exporters globally
  try {
    console.log('\n2. Top Global Coffee Exporters:');
    const topExporters = await marketIntelligence.getTopExporters(hsCode, 5, 2022);
    topExporters.forEach((exporter, index) => {
      console.log(`   ${index + 1}. ${exporter.country}: $${(exporter.value / 1000000).toFixed(2)} million (${exporter.share?.toFixed(1) || 'N/A'}%)`);
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('   - Error retrieving top exporters:', errorMessage);
  }
  
  // 3. Get market trends for coffee in Germany
  try {
    console.log('\n3. Coffee Market Trends in Germany (DEU):');
    const marketTrends = await marketIntelligence.getMarketTrends(hsCode, 'DEU', 5);
    marketTrends.forEach(trend => {
      const growthInfo = trend.growthRate ? ` (growth: ${trend.growthRate.toFixed(1)}%)` : '';
      console.log(`   ${trend.year}: $${(trend.value / 1000000).toFixed(2)} million${growthInfo}`);
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('   - Error retrieving market trends:', errorMessage);
  }
  
  // 4. Get tariff data for Brazilian coffee in the EU
  try {
    console.log('\n4. Tariff Data for Brazilian Coffee in EU:');
    const tariffData = await marketIntelligence.getTariffData(hsCode, 'EU', exporterCountry, 2022);
    console.log(`   - MFN Rate: ${tariffData.mfnRate?.toFixed(2) || 'N/A'}%`);
    console.log(`   - Preferential Rate: ${tariffData.preferentialRate?.toFixed(2) || 'N/A'}%`);
    console.log(`   - Notes: ${tariffData.notes || 'None'}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('   - Error retrieving tariff data:', errorMessage);
  }
  
  // 5. Get market access analysis for all target markets
  try {
    console.log('\n5. Market Access Analysis:');
    const marketAccess = await marketIntelligence.getMarketAccessAnalysis(hsCode, exporterCountry, targetMarkets);
    
    marketAccess.forEach(market => {
      console.log(`   \n   === ${market.market} ===`);
      console.log(`   - Market Size: $${(market.marketSize / 1000000).toFixed(2)} million`);
      console.log(`   - Growth Rate: ${market.growthRate.toFixed(1)}%`);
      console.log(`   - Tariff Rate: ${market.tariffRate?.toFixed(2) || 'N/A'}%`);
      console.log(`   - Competitiveness: ${(market.competitiveness.score * 100).toFixed(1)}% (rank ${market.competitiveness.rank})`);
      console.log(`   - Recommendation: ${market.recommendation}`);
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('   - Error retrieving market access analysis:', errorMessage);
  }
  
  // 6. Get historical trade data
  try {
    console.log('\n6. Historical Export Data (Brazil coffee exports, 2018-2022):');
    const historicalData = await marketIntelligence.getHistoricalTradeData(
      hsCode,
      exporterCountry,
      2018,
      2022,
      true // exports
    );
    
    historicalData.forEach(data => {
      console.log(`   ${data.year}: $${(data.value / 1000000).toFixed(2)} million`);
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('   - Error retrieving historical data:', errorMessage);
  }
  
  // Print performance metrics
  console.log('\n===== Performance Metrics =====');
  const metrics = getPerformanceSummary();
  Object.keys(metrics).forEach(operation => {
    console.log(`\n${operation}:`);
    console.log(`  - Calls: ${metrics[operation].count}`);
    console.log(`  - Avg Duration: ${metrics[operation].averageDuration.toFixed(2)}ms`);
    console.log(`  - Min Duration: ${metrics[operation].minDuration.toFixed(2)}ms`);
    console.log(`  - Max Duration: ${metrics[operation].maxDuration.toFixed(2)}ms`);
  });
}

// Run the example
analyzeMarketIntelligence()
  .then(() => {
    console.log('\nAnalysis complete!');
    console.log('\nNote: This example uses mock data since real API keys are not provided.');
    console.log('To use real data, set the following environment variables:');
    console.log('- TRADE_MAP_API_KEY');
    console.log('- COMTRADE_API_KEY');
    console.log('- WITS_API_KEY');
  })
  .catch(error => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in Market Intelligence analysis:', errorMessage);
  });

/**
 * NOTE: This example uses mock data since the actual API keys would be required
 * to connect to the real services. In a production environment, you would need to:
 * 
 * 1. Set up the environment variables:
 *    - TRADE_MAP_API_KEY
 *    - TRADE_MAP_BASE_URL
 *    - COMTRADE_API_KEY
 *    - COMTRADE_BASE_URL
 *    - WITS_API_KEY
 *    - WITS_BASE_URL
 * 
 * 2. Or pass the configuration directly:
 *    const marketIntelligence = await setupMarketIntelligenceMcp({
 *      tradeMap: {
 *        apiKey: 'your-trade-map-api-key',
 *        baseUrl: 'https://api.trademap.org/api/v1'
 *      },
 *      comtrade: {
 *        apiKey: 'your-comtrade-api-key',
 *        baseUrl: 'https://comtrade.un.org/api'
 *      },
 *      wits: {
 *        apiKey: 'your-wits-api-key',
 *        baseUrl: 'https://wits.worldbank.org/API/V1'
 *      }
 *    });
 */ 