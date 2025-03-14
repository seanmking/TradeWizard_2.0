/**
 * Trade flow data structure
 */
export interface TradeFlowData {
  exporterCountry: string;
  importerCountry: string;
  hsCode: string;
  year: number;
  value: number;
  quantity?: number;
  unit?: string;
  weight?: number;
  growth?: number;
  marketShare?: number;
  flowType?: string;
} 