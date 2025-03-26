import { z } from 'zod';

// Compliance requirement types
export const ComplianceRequirementSchema = z.object({
  country: z.string(),
  hs_code: z.string(),
  certifications_required: z.array(z.string()),
  labeling_requirements: z.string(),
  tariff_rate: z.string(),
  shelf_life_months: z.number().optional(),
  import_permits: z.array(z.string()).optional(),
  special_requirements: z.array(z.string()).optional(),
  restricted_ingredients: z.array(z.string()).optional(),
  packaging_requirements: z.array(z.string()).optional()
});

export type ComplianceRequirement = z.infer<typeof ComplianceRequirementSchema>;

// Documentation requirement types
export const DocumentationRequirementSchema = z.object({
  product_type: z.string(),
  country: z.string(),
  required_documents: z.array(z.string()),
  document_templates: z.record(z.string()).optional(),
  submission_process: z.string().optional(),
  processing_time_days: z.number().optional(),
  fees: z.record(z.string()).optional()
});

export type DocumentationRequirement = z.infer<typeof DocumentationRequirementSchema>;

// Tariff calculation types
export const TariffCalculationSchema = z.object({
  country: z.string(),
  hs_code: z.string(),
  base_rate: z.string(),
  preferential_rates: z.record(z.string()).optional(),
  additional_duties: z.array(z.string()).optional(),
  vat_rate: z.string().optional(),
  calculation_notes: z.string().optional()
});

export type TariffCalculation = z.infer<typeof TariffCalculationSchema>; 