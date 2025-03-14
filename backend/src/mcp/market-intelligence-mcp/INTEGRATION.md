# Market Intelligence MCP Integration Guide

This document outlines how to integrate the Market Intelligence MCP (Managed Component) into the TradeWizard 2.0 platform.

## Overview

The Market Intelligence MCP provides access to international trade data sources, allowing TradeWizard 2.0 to analyze trade flows, market opportunities, and trade barriers for different products and markets.

## Architecture

The MCP follows a layered architecture:

1. **Core Layer**: The main entry point (`index.ts`) that exposes unified methods for market intelligence.
2. **Connector Layer**: Individual connectors for different data sources (`trade-map.ts`, `comtrade.ts`, `wits.ts`).
3. **Utility Layer**: Shared utilities for caching, error handling, and data standardization.

## Integration Steps

### 1. Prerequisites

Ensure that the following dependencies are available in your project:

```json
{
  "dependencies": {
    "axios": "^1.4.0",
    "dotenv": "^16.3.1"
  }
}
```

### 2. Set Up Environment Variables

Create or update your `.env` file with the necessary API keys:

```
TRADE_MAP_API_KEY=your-trade-map-api-key
TRADE_MAP_BASE_URL=https://api.trademap.org/api/v1

COMTRADE_API_KEY=your-comtrade-api-key
COMTRADE_BASE_URL=https://comtrade.un.org/api

WITS_API_KEY=your-wits-api-key
WITS_BASE_URL=https://wits.worldbank.org/API/V1
```

### 3. Directory Structure

Ensure that the MCP is placed in the correct directory structure:

```
backend/
  src/
    mcp/
      market-intelligence-mcp/
        index.ts                # Main entry point
        README.md               # Documentation
        INTEGRATION.md          # This integration guide
        connectors/
          trade-map.ts          # Trade Map connector
          comtrade.ts           # UN Comtrade connector
          wits.ts               # WITS connector
```

### 4. Integrate with TradeWizard 2.0

#### 4.1 Import and Initialize

In your application code (e.g., in the business analysis module), import and initialize the MCP:

```typescript
import setupMarketIntelligenceMcp from '../mcp/market-intelligence-mcp';
import { StandardDataStructures } from '../utils/data-standards';

async function initializeMarketIntelligence() {
  const marketIntelligence = await setupMarketIntelligenceMcp();
  return marketIntelligence;
}
```

#### 4.2 Use in Business Analysis Module

```typescript
import { TradeWizardBusinessAnalysis } from '../types';

export async function analyzeMarketOpportunities(
  hsCode: string,
  exporterCountry: string,
  targetMarkets: string[]
): Promise<TradeWizardBusinessAnalysis> {
  const marketIntelligence = await initializeMarketIntelligence();
  
  // Get market access analysis for target markets
  const marketAccess = await marketIntelligence.getMarketAccessAnalysis(
    hsCode,
    exporterCountry,
    targetMarkets
  );
  
  // Transform the market access data into the TradeWizard business analysis format
  const analysis: TradeWizardBusinessAnalysis = {
    product: {
      hsCode,
      description: await getProductDescription(hsCode)
    },
    exporter: exporterCountry,
    markets: marketAccess.map(market => ({
      country: market.market,
      tariffRate: market.tariffRate,
      marketSize: market.marketSize,
      growthRate: market.growthRate,
      competitiveness: market.competitiveness.score,
      recommendation: market.recommendation,
      potentialScore: calculatePotentialScore(market)
    })),
    summary: generateSummary(marketAccess)
  };
  
  return analysis;
}

// Helper function to calculate potential score
function calculatePotentialScore(market) {
  // Calculate a score between 0-100 based on market metrics
  let score = 0;
  
  // Higher score for lower tariffs
  if (market.tariffRate === 0) score += 30;
  else if (market.tariffRate < 5) score += 20;
  else if (market.tariffRate < 10) score += 10;
  
  // Higher score for better competitiveness
  score += Math.round(market.competitiveness.score * 25);
  
  // Higher score for positive growth rate
  if (market.growthRate > 10) score += 25;
  else if (market.growthRate > 5) score += 20;
  else if (market.growthRate > 0) score += 15;
  
  // Higher score for larger market size
  if (market.marketSize > 1000000000) score += 20;
  else if (market.marketSize > 500000000) score += 15;
  else if (market.marketSize > 100000000) score += 10;
  
  return Math.min(score, 100);
}

// Helper function to generate summary
function generateSummary(marketAccess) {
  const bestMarket = [...marketAccess].sort((a, b) => 
    calculatePotentialScore(b) - calculatePotentialScore(a)
  )[0];
  
  return `Analysis suggests ${bestMarket.market} as the most promising market with a ${bestMarket.tariffRate?.toFixed(1) || 'N/A'}% tariff rate and ${bestMarket.growthRate.toFixed(1)}% growth rate.`;
}
```

#### 4.3 Integrate with Frontend

Update your API endpoints to expose the market intelligence functionality:

```typescript
// In your API routes file
import express from 'express';
import { analyzeMarketOpportunities } from '../business-analysis/market-opportunities';

const router = express.Router();

router.post('/market-opportunities', async (req, res) => {
  try {
    const { hsCode, exporterCountry, targetMarkets } = req.body;
    
    if (!hsCode || !exporterCountry || !targetMarkets) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const analysis = await analyzeMarketOpportunities(
      hsCode,
      exporterCountry,
      targetMarkets
    );
    
    return res.status(200).json(analysis);
  } catch (error) {
    console.error('Error analyzing market opportunities:', error);
    return res.status(500).json({ error: 'Failed to analyze market opportunities' });
  }
});

export default router;
```

### 5. Performance Monitoring

The MCP includes built-in performance monitoring. Use it to track API call performance:

```typescript
import { getPerformanceSummary } from '../utils/monitoring';

// After making several calls
const performanceMetrics = getPerformanceSummary();
console.log('API Performance:', performanceMetrics);
```

### 6. Error Handling

The MCP includes standardized error handling. Integrate it into your application:

```typescript
import { ApiError } from '../utils/error-handling';

try {
  // Use the MCP
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error (${error.statusCode}): ${error.message}`);
    // Handle based on status code
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### 7. Testing the Integration

Run the example script to test the integration:

```bash
npx ts-node src/examples/market-intelligence-example.ts
```

If this runs successfully, your integration is working correctly.

## Extending the MCP

### Adding a New Connector

To add a new data source connector:

1. Create a new file in the `connectors` directory (e.g., `my-new-source.ts`)
2. Implement the connector following the pattern of existing connectors
3. Update the `index.ts` file to include your new connector
4. Add new environment variables for your connector's API keys

Example:

```typescript
// my-new-source.ts
import axios from 'axios';
import { TradeFlowData } from '../../types';
import { ApiError } from '../../utils/error-handling';
import { memoryCache } from '../../utils/cache';

export interface MyNewSourceConfig {
  apiKey: string;
  baseUrl?: string;
}

export async function setupMyNewSourceConnector(config: MyNewSourceConfig) {
  const api = axios.create({
    baseURL: config.baseUrl || 'https://api.mynewsource.com',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  return {
    // Implement connector methods here
  };
}
```

### Adding New Functionality

To add new functionality to the MCP:

1. Define the new function signature in the `MarketIntelligenceMcp` interface in `index.ts`
2. Implement the function in the `setupMarketIntelligenceMcp` function
3. Update the README to document the new functionality

## Troubleshooting

### API Key Issues

If you encounter authentication errors:
- Verify that your API keys are correct
- Check that environment variables are properly loaded
- Ensure API keys have the necessary permissions

### Rate Limiting

The connectors implement caching to minimize API calls, but you may still encounter rate limits:
- Implement backoff strategies for retries
- Contact the data provider to increase your rate limits
- Add more comprehensive caching for frequently accessed data

### Data Format Changes

If a data provider changes their API format:
1. Update the corresponding connector
2. Add appropriate type transformations
3. Test thoroughly before deploying to production

## Support and Resources

- Trade Map API Documentation: [https://www.trademap.org/API/](https://www.trademap.org/API/)
- UN Comtrade API Documentation: [https://comtrade.un.org/data/doc/api/](https://comtrade.un.org/data/doc/api/)
- WITS API Documentation: [https://wits.worldbank.org/API/V1/SDMX/V21/rest/](https://wits.worldbank.org/API/V1/SDMX/V21/rest/) 