# Market Intelligence MCP

This Market Intelligence MCP provides access to various trade data sources to analyze international trade flows, market opportunities, and trade barriers.

## Features

- **Trade Flow Analysis**: Retrieve trade flow data for specific products, countries, and time periods
- **Top Exporters/Importers**: Identify leading countries in specific product markets
- **Market Trends**: Analyze historical trends and growth rates in target markets
- **Tariff Analysis**: Access tariff data for specific products and markets
- **Non-Tariff Measures**: Retrieve information about non-tariff barriers
- **Market Access Analysis**: Comprehensive analysis of market access conditions for specific products

## Data Sources

The MCP integrates with the following data sources:

- **Trade Map**: Provides detailed trade statistics for international business development
- **UN Comtrade**: United Nations International Trade Statistics Database
- **WITS**: World Integrated Trade Solution by the World Bank

## Getting Started

### Prerequisites

- API keys for Trade Map, UN Comtrade, and WITS
- Environment variables configured or direct configuration

### Installation

```bash
# Install required dependencies
npm install axios dotenv
```

### Configuration

Set up environment variables in your `.env` file:

```
TRADE_MAP_API_KEY=your-trade-map-api-key
TRADE_MAP_BASE_URL=https://api.trademap.org/api/v1

COMTRADE_API_KEY=your-comtrade-api-key
COMTRADE_BASE_URL=https://comtrade.un.org/api

WITS_API_KEY=your-wits-api-key
WITS_BASE_URL=https://wits.worldbank.org/API/V1
```

Or configure directly in your code:

```typescript
const marketIntelligence = await setupMarketIntelligenceMcp({
  tradeMap: {
    apiKey: 'your-trade-map-api-key',
    baseUrl: 'https://api.trademap.org/api/v1'
  },
  comtrade: {
    apiKey: 'your-comtrade-api-key',
    baseUrl: 'https://comtrade.un.org/api'
  },
  wits: {
    apiKey: 'your-wits-api-key',
    baseUrl: 'https://wits.worldbank.org/API/V1'
  }
});
```

## Usage

```typescript
import setupMarketIntelligenceMcp from './mcp/market-intelligence-mcp';
import { StandardDataStructures } from './utils/data-standards';

async function main() {
  // Initialize the MCP
  const marketIntelligence = await setupMarketIntelligenceMcp();
  
  // HS code for coffee (090111: Coffee, not roasted, not decaffeinated)
  const hsCode = '090111';
  
  // Get trade flow data
  const tradeFlowData = await marketIntelligence.getTradeFlowData(
    hsCode,
    'BRA', // Brazil
    'USA', // United States
    { 
      year: 2022,
      source: 'tradeMap', // or 'comtrade'
      flowType: StandardDataStructures.TradeFlowType.EXPORT
    }
  );
  
  // Get top exporters
  const topExporters = await marketIntelligence.getTopExporters(
    hsCode,
    5, // limit
    2022 // year
  );
  
  // Get market trends in Germany
  const marketTrends = await marketIntelligence.getMarketTrends(
    hsCode,
    'DEU', // Germany
    3 // years to analyze
  );
  
  // Get tariff data
  const tariffData = await marketIntelligence.getTariffData(
    hsCode,
    'EU', // European Union
    'COL' // Colombia
  );
  
  // Get market access analysis
  const marketAccess = await marketIntelligence.getMarketAccessAnalysis(
    hsCode,
    'ZAF', // South Africa
    ['USA', 'EU', 'CHN', 'JPN'] // Target markets
  );
}
```

See `examples/market-intelligence-example.ts` for a complete example.

## API Reference

### `getTradeFlowData(hsCode, exporterCountry, importerCountry, options)`

Returns trade flow data for a specific product between countries.

### `getTopExporters(hsCode, limit, year)`

Returns the top exporters for a specific product.

### `getMarketTrends(hsCode, marketCountry, years)`

Returns market trends for a specific product in a target market.

### `getTariffData(hsCode, importerCountry, exporterCountry, year)`

Returns tariff data for a specific product.

### `getMarketAccessAnalysis(hsCode, exporterCountry, targetMarkets)`

Returns market access analysis for a specific product in target markets.

### `getHistoricalTradeData(hsCode, countryCode, startYear, endYear, isExport)`

Returns historical trade data for a specific product and country.

## Performance Monitoring

The MCP uses the `monitoring` utility to track performance of all API calls. You can access performance metrics using:

```typescript
import { getPerformanceSummary } from './utils/monitoring';

// After making some API calls
const performanceMetrics = getPerformanceSummary();
console.log(performanceMetrics);
```

## Caching

All API responses are cached to improve performance and reduce API usage. The default cache TTL is:

- Trade flow data: 1 hour
- Market trends: 1 hour
- Tariff data: 24 hours
- Historical data: 24 hours

## Error Handling

The MCP implements robust error handling. All API errors are wrapped in an `ApiError` with appropriate status codes and error messages. 