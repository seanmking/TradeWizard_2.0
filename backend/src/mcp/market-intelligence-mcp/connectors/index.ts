/**
 * Market Intelligence Connectors
 * 
 * This module exports all the connectors for market intelligence data sources.
 */

import { setupTradeMapConnector } from './trade-map';
import { setupComtradeConnector } from './comtrade';
import { setupWitsConnector } from './wits';

export interface MarketIntelligenceConfig {
  tradeMap: {
    apiKey: string;
    baseUrl: string;
  };
  comtrade: {
    apiKey: string;
    baseUrl: string;
  };
  wits: {
    apiKey: string;
    baseUrl: string;
  };
}

export interface MarketIntelligenceConnectors {
  tradeMap: ReturnType<typeof setupTradeMapConnector>;
  comtrade: ReturnType<typeof setupComtradeConnector>;
  wits: ReturnType<typeof setupWitsConnector>;
}

/**
 * Set up all market intelligence connectors
 * @param config Configuration for all connectors
 * @returns Object containing all initialized connectors
 */
export async function setupMarketIntelligenceConnectors(
  config: MarketIntelligenceConfig
): Promise<MarketIntelligenceConnectors> {
  // Initialize all connectors
  const tradeMap = setupTradeMapConnector(config.tradeMap);
  const comtrade = setupComtradeConnector(config.comtrade);
  const wits = setupWitsConnector(config.wits);
  
  return {
    tradeMap,
    comtrade,
    wits
  };
}

// Re-export individual connectors for direct use
export { setupTradeMapConnector, setupComtradeConnector, setupWitsConnector }; 