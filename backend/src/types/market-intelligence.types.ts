/**
 * Market Intelligence Service Type Definitions
 */

import { BaseRequestParams } from './api.types';

/**
 * Market Intelligence Request Type Enum
 */
export enum MarketIntelligenceRequestType {
  TRADE_FLOW = 'trade_flow',
  TARIFF = 'tariff',
  MARKET_SIZE = 'market_size',
  BUYERS = 'buyers',
  COMPETITIVE_LANDSCAPE = 'competitive_landscape',
}

/**
 * Base Market Intelligence Request Parameters
 */
export interface MarketIntelligenceBaseParams extends BaseRequestParams {
  type: MarketIntelligenceRequestType;
}

/**
 * Trade Flow Request Parameters
 */
export interface TradeFlowParams extends MarketIntelligenceBaseParams {
  type: MarketIntelligenceRequestType.TRADE_FLOW;
  /** HS Code for the product */
  hs_code: string;
  /** Target market country code */
  market: string;
  /** Optional year for historical data */
  year?: number;
}

/**
 * Tariff Request Parameters
 */
export interface TariffParams extends MarketIntelligenceBaseParams {
  type: MarketIntelligenceRequestType.TARIFF;
  /** HS Code for the product */
  hs_code: string;
  /** Origin country code */
  origin: string;
  /** Destination country code */
  destination: string;
}

/**
 * Market Size Request Parameters
 */
export interface MarketSizeParams extends MarketIntelligenceBaseParams {
  type: MarketIntelligenceRequestType.MARKET_SIZE;
  /** Product identifier */
  product: string;
  /** Target country code */
  country: string;
}

/**
 * Buyers Request Parameters
 */
export interface BuyersParams extends MarketIntelligenceBaseParams {
  type: MarketIntelligenceRequestType.BUYERS;
  /** Industry sector */
  industry: string;
  /** Target country code */
  country: string;
}

/**
 * Union type of all possible Market Intelligence request parameters
 */
export type MarketIntelligenceParams =
  | TradeFlowParams
  | TariffParams
  | MarketSizeParams
  | BuyersParams;

/**
 * Type guards for parameter types
 */
export function isTradeFlowParams(params: MarketIntelligenceParams): params is TradeFlowParams {
  return params.type === MarketIntelligenceRequestType.TRADE_FLOW;
}

export function isTariffParams(params: MarketIntelligenceParams): params is TariffParams {
  return params.type === MarketIntelligenceRequestType.TARIFF;
}

export function isMarketSizeParams(params: MarketIntelligenceParams): params is MarketSizeParams {
  return params.type === MarketIntelligenceRequestType.MARKET_SIZE;
}

export function isBuyersParams(params: MarketIntelligenceParams): params is BuyersParams {
  return params.type === MarketIntelligenceRequestType.BUYERS;
}

/**
 * Response data for Trade Flow requests
 */
export interface TradeFlowData {
  hs_code: string;
  market: string;
  total_import_value: number;
  total_export_value: number;
  year: number;
  growth_rate: number;
  top_exporters: Array<{ country: string; value: number; market_share: number }>;
  top_importers: Array<{ country: string; value: number; market_share: number }>;
  trade_balance: number;
  historical_trend: Array<{ year: number; import_value: number; export_value: number }>;
}

/**
 * Response data for Tariff requests
 */
export interface TariffData {
  simple_average: number;
  weighted_average: number;
  minimum_rate: number;
  maximum_rate: number;
  number_of_tariff_lines: number;
}

/**
 * Response data for Market Size requests
 */
export interface MarketSizeData {
  total_market_value: number;
  growth_rate: number;
  market_share_distribution: Array<{ segment: string; share: number }>;
  forecast: Array<{ year: number; value: number }>;
}

/**
 * Response data for Buyers requests
 */
export interface BuyersData {
  total_buyers: number;
  key_buyers: Array<{
    name: string;
    contact: string;
    annual_volume: number;
  }>;
  market_segments: Array<{
    name: string;
    buyer_count: number;
  }>;
}

/**
 * Union type for all possible market intelligence response data
 */
export type MarketIntelligenceData =
  | TradeFlowData
  | TariffData
  | MarketSizeData
  | BuyersData; 