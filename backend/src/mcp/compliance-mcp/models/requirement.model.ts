/**
 * Interface representing a compliance requirement in the system
 */
export interface ComplianceRequirement {
  id?: number;
  country_code: string;
  industry: string;
  hs_code: string;
  requirement_name: string;
  requirement_description: string;
  required: boolean;
  documentation_link?: string;
  issuing_authority?: string;
  estimated_processing_time_days?: number;
  estimated_cost_zar?: number;
  documentation_language?: string;
  validity_period_months?: number;
  renewal_process?: string;
  legal_reference?: string;
  verification_method?: string;
  priority_level?: 'low' | 'medium' | 'high' | 'critical';
  created_at?: string;
  updated_at?: string;
  // Enhanced fields for export requirements
  sector?: string;
  subsector?: string;
  certification_required?: string[];
  documentation_required?: string[];
  tariff_rate?: number;
  labeling_requirements?: string;
  shelf_life_restrictions?: number;
  ingredient_restrictions?: string;
  compliance_notes?: string;
  special_subsector_requirements?: string;
  minimum_order_quantity?: string;
  regulatory_authority?: string;
  regulatory_reference?: string;
  official_source_url?: string;
  last_official_update?: string;
  data_source?: string;
  version?: string;
  active?: boolean;
  last_sync_at?: string;
}

/**
 * Interface for simplified requirement information used in summaries
 */
export interface RequirementSummary {
  id: number;
  requirement_name: string;
  required: boolean;
  priority_level?: 'low' | 'medium' | 'high' | 'critical';
  estimated_cost_zar?: number;
  estimated_processing_time_days?: number;
}

/**
 * Interface for grouping requirements by country
 */
export interface CountryRequirements {
  country_code: string;
  country_name?: string;
  requirements: ComplianceRequirement[];
}

/**
 * Interface for grouping requirements by industry
 */
export interface IndustryRequirements {
  industry: string;
  requirements: ComplianceRequirement[];
}

/**
 * Interface for compliance requirement update request
 */
export interface RequirementUpdateRequest {
  requirement_name?: string;
  requirement_description?: string;
  required?: boolean;
  documentation_link?: string;
  issuing_authority?: string;
  estimated_processing_time_days?: number;
  estimated_cost_zar?: number;
  documentation_language?: string;
  validity_period_months?: number;
  renewal_process?: string;
  legal_reference?: string;
  verification_method?: string;
  priority_level?: 'low' | 'medium' | 'high' | 'critical';
  // Enhanced fields for export requirements
  sector?: string;
  subsector?: string;
  certification_required?: string[];
  documentation_required?: string[];
  tariff_rate?: number;
  labeling_requirements?: string;
  shelf_life_restrictions?: number;
  ingredient_restrictions?: string;
  compliance_notes?: string;
  special_subsector_requirements?: string;
  minimum_order_quantity?: string;
  regulatory_authority?: string;
  regulatory_reference?: string;
  official_source_url?: string;
}

/**
 * Interface for compliance requirement status
 */
export interface RequirementStatus {
  requirementId: number;
  status: 'pending' | 'in-progress' | 'completed' | 'not-required';
  completedDate?: Date;
  notes?: string;
  attachments?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Interface for export requirement regulatory source information
 */
export interface RegulatorySource {
  id?: number;
  country_code: string;
  sector: string;
  authority_name: string;
  official_website: string;
  contact_information?: string;
  regulatory_framework?: string;
  last_checked?: string;
  has_updates?: boolean;
  notes?: string;
}

/**
 * Interface for certification requirements
 */
export interface CertificationRequirement {
  id?: number;
  name: string;
  country_code: string;
  sector: string;
  description?: string;
  issuing_authority?: string;
  validity_period_months?: number;
  estimated_cost?: number;
  processing_time_days?: number;
  required_documents?: string[];
  renewal_process?: string;
  official_website?: string;
}

/**
 * Interface for documentation requirements
 */
export interface DocumentationRequirement {
  id?: number;
  name: string;
  country_code: string;
  sector: string;
  description?: string;
  issuing_authority?: string;
  language_requirements?: string;
  translation_needed?: boolean;
  authentication_needed?: boolean;
  template_available?: boolean;
  template_url?: string;
} 