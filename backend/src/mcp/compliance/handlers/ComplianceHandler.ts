import { MCPHandler, MCPResponse, MCPOutputMode } from '../../shared/schema';
import { mcpCache } from '../../shared/cache';
import { MCPTransformer } from '../../shared/transform';
import { ComplianceRequirement, ComplianceRequirementSchema } from '../types';
import axios from 'axios';

interface ComplianceHandlerParams {
  country: string;
  hs_code: string;
  product_type?: string;
}

export class ComplianceHandler implements MCPHandler<ComplianceRequirement> {
  private static readonly CACHE_TTL = 24 * 60 * 60; // 24 hours

  async handle(params: ComplianceHandlerParams): Promise<MCPResponse<ComplianceRequirement>> {
    const cacheConfig = this.getCacheConfig(params);
    const cachedData = await mcpCache.get<ComplianceRequirement>(cacheConfig.key);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      // Fetch data from multiple sources
      const [witsData, regulatoryData] = await Promise.all([
        this.fetchWITSData(params),
        this.fetchRegulatoryData(params)
      ]);

      // Combine and validate data
      const complianceData: ComplianceRequirement = {
        country: params.country,
        hs_code: params.hs_code,
        certifications_required: regulatoryData.certifications || [],
        labeling_requirements: regulatoryData.labeling || 'Standard labeling applies',
        tariff_rate: witsData.tariff_rate || 'N/A',
        shelf_life_months: regulatoryData.shelf_life,
        import_permits: regulatoryData.permits,
        special_requirements: regulatoryData.special_requirements,
        restricted_ingredients: regulatoryData.restricted_ingredients,
        packaging_requirements: regulatoryData.packaging_requirements
      };

      // Validate with zod schema
      const validatedData = ComplianceRequirementSchema.parse(complianceData);

      // Calculate confidence score based on data completeness
      const confidence_score = this.calculateConfidenceScore(validatedData);

      // Transform output based on mode
      const { ui_format, agent_format } = await MCPTransformer.transformOutput(
        validatedData,
        'both',
        { context: `Compliance requirements for ${params.hs_code} in ${params.country}` }
      );

      const response: MCPResponse<ComplianceRequirement> = {
        status: 'success',
        data: validatedData,
        ui_format,
        agent_format,
        confidence_score,
        metadata: {
          source: 'WITS + Regulatory DB',
          last_updated: new Date().toISOString(),
          source_quality_score: 0.95,
          data_completeness: this.determineDataCompleteness(validatedData)
        }
      };

      // Cache the response
      await mcpCache.set(cacheConfig.key, response, cacheConfig);

      return response;

    } catch (error) {
      console.error('Compliance MCP Error:', error);
      return {
        status: 'error',
        data: {} as ComplianceRequirement,
        confidence_score: 0,
        metadata: {
          source: 'Error',
          last_updated: new Date().toISOString(),
          data_completeness: 'partial'
        },
        known_gaps: ['Failed to fetch compliance data'],
        fallback_suggestions: [
          'Check official government websites',
          'Consult with a trade compliance expert'
        ]
      };
    }
  }

  getCacheConfig(params: ComplianceHandlerParams) {
    return {
      ttl: ComplianceHandler.CACHE_TTL,
      prefetch: true,
      key: mcpCache.generateKey('compliance', params)
    };
  }

  private async fetchWITSData(params: ComplianceHandlerParams) {
    // TODO: Implement actual WITS API integration
    // Mock response for now
    return {
      tariff_rate: '5%'
    };
  }

  private async fetchRegulatoryData(params: ComplianceHandlerParams) {
    // TODO: Implement actual regulatory database integration
    // Mock response for now
    return {
      certifications: ['ISO 9001', 'HACCP'],
      labeling: 'English required',
      shelf_life: 24,
      permits: ['Import License'],
      special_requirements: ['Temperature controlled storage'],
      restricted_ingredients: ['Artificial preservatives'],
      packaging_requirements: ['Recyclable materials']
    };
  }

  private calculateConfidenceScore(data: ComplianceRequirement): number {
    const requiredFields = ['certifications_required', 'labeling_requirements', 'tariff_rate'];
    const optionalFields = ['shelf_life_months', 'import_permits', 'special_requirements'];
    
    const requiredScore = requiredFields.reduce((score, field) => {
      return score + (data[field as keyof ComplianceRequirement] ? 1 : 0);
    }, 0) / requiredFields.length;

    const optionalScore = optionalFields.reduce((score, field) => {
      return score + (data[field as keyof ComplianceRequirement] ? 0.5 : 0);
    }, 0) / optionalFields.length;

    return Math.min(requiredScore * 0.7 + optionalScore * 0.3, 1);
  }

  private determineDataCompleteness(data: ComplianceRequirement): 'complete' | 'partial' | 'outdated' {
    const requiredFields = ['certifications_required', 'labeling_requirements', 'tariff_rate'];
    const hasAllRequired = requiredFields.every(field => 
      data[field as keyof ComplianceRequirement]
    );

    if (hasAllRequired) {
      return 'complete';
    }
    return 'partial';
  }
} 