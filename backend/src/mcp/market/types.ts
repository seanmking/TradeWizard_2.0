import { z } from 'zod';

// Trade flow data types
export const TradeFlowSchema = z.object({
  hs_code: z.string(),
  market: z.string(),
  total_import_value: z.number(),
  total_export_value: z.number(),
  year: z.number(),
  growth_rate: z.number(),
  top_exporters: z.array(z.object({
    country: z.string(),
    value: z.number(),
    market_share: z.number()
  })),
  top_importers: z.array(z.object({
    country: z.string(),
    value: z.number(),
    market_share: z.number()
  })),
  trade_balance: z.number(),
  historical_trend: z.array(z.object({
    year: z.number(),
    import_value: z.number(),
    export_value: z.number()
  }))
});

export type TradeFlow = z.infer<typeof TradeFlowSchema>;

// Buyer information types
export const BuyerSchema = z.object({
  company_name: z.string(),
  country: z.string(),
  industry: z.string(),
  import_volume: z.number().optional(),
  contact_info: z.object({
    website: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional()
  }).optional(),
  product_interests: z.array(z.string()).optional(),
  certification_requirements: z.array(z.string()).optional(),
  reliability_score: z.number().min(0).max(1).optional()
});

export type Buyer = z.infer<typeof BuyerSchema>;

export const BuyerListSchema = z.object({
  industry: z.string(),
  country: z.string(),
  buyers: z.array(BuyerSchema),
  total_count: z.number(),
  market_coverage: z.number().min(0).max(1)
});

export type BuyerList = z.infer<typeof BuyerListSchema>;

// Market size analysis types
export const MarketSizeSchema = z.object({
  product: z.string(),
  country: z.string(),
  total_market_size: z.number(),
  market_growth_rate: z.number(),
  market_share_distribution: z.array(z.object({
    segment: z.string(),
    share: z.number(),
    value: z.number()
  })),
  forecast: z.array(z.object({
    year: z.number(),
    projected_size: z.number(),
    growth_rate: z.number()
  })),
  key_trends: z.array(z.string()),
  competitive_landscape: z.object({
    market_concentration: z.number(),
    key_players: z.array(z.object({
      name: z.string(),
      market_share: z.number()
    }))
  })
});

export type MarketSize = z.infer<typeof MarketSizeSchema>;

export interface TradeFlowData {
  hs_code: string;
  market: string;
  total_export_value: number;
  total_import_value: number;
  year: number;
  growth_rate: number;
  top_exporters: TradingPartner[];
  top_importers: TradingPartner[];
  trade_balance: number;
  historical_trend: HistoricalTrendData[];
}

export interface TariffData {
  simple_average: number;
  weighted_average: number;
  minimum_rate: number;
  maximum_rate: number;
  number_of_tariff_lines: number;
}

export interface HistoricalTrendData {
  year: number;
  export_value: number;
  import_value: number;
}

export interface TradingPartner {
  country: string;
  value: number;
  market_share: number;
}

export interface TopTradingPartnersData {
  top_exporters: TradingPartner[];
  top_importers: TradingPartner[];
} 