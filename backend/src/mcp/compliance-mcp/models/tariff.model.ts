/**
 * Interface representing a tariff data record
 */
export interface TariffData {
  id?: number;
  importing_country_code: string;
  hs_code: string;
  exporting_country_code: string;
  tariff_rate?: number;
  tariff_type?: string;
  trade_agreement?: string;
  certificate_of_origin_required?: boolean;
  rules_of_origin_text?: string;
  quota_limit?: number;
  quota_unit?: string;
  quota_period?: string;
  non_tariff_measures?: string[];
  safeguard_measures?: string[];
  specific_duty_amount?: number;
  specific_duty_unit?: string;
  vat_rate?: number;
  documentation_requirements?: string[];
  effective_date?: string;
  expiry_date?: string;
  data_source?: string;
  last_verified_date?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface for a simplified tariff summary
 */
export interface TariffSummary {
  importing_country_code: string;
  importing_country_name?: string;
  hs_code: string;
  tariff_rate?: number;
  trade_agreement?: string;
  certificate_of_origin_required?: boolean;
  vat_rate?: number;
}

/**
 * Interface for aggregated tariff data across multiple countries
 */
export interface TariffComparison {
  hs_code: string;
  product_description?: string;
  exporting_country_code: string;
  tariffs: TariffSummary[];
}

/**
 * Interface representing a tariff calculation request
 */
export interface TariffCalculationRequest {
  importing_country_code: string;
  hs_code: string;
  exporting_country_code: string;
  value: number;
  quantity?: number;
  unit?: string;
  currency?: string;
  transport_cost?: number;
  insurance_cost?: number;
}

/**
 * Interface representing a tariff calculation result
 */
export interface TariffCalculationResult {
  value_zar: number;
  tariff_rate?: number;
  tariff_amount?: number;
  specific_duty_amount?: number;
  vat_rate?: number;
  vat_amount?: number;
  total_duties?: number;
  total_value_with_duties?: number;
  effective_tax_rate?: number;
  trade_agreement?: string;
  documentation_requirements?: string[];
} 