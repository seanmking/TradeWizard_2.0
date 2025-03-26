import { PrismaClient } from '@prisma/client';

export interface HSCodeMatch {
  name: string;
  description: string;
  hsCode: string;
}

export interface ComplianceData {
  requirements: string[];
  certifications: string[];
  documentation: string[];
  restrictions: string[];
}

interface HSCodeMappingResult {
  name: string;
  description: string;
  code: string;
}

interface ComplianceRequirementResult {
  requirements: string[];
  certifications: string[];
  documentation: string[];
  restrictions: string[];
}

export class HSCodeDatabase {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = new PrismaClient();
  }
  
  async findSimilarProducts(name: string, description: string): Promise<HSCodeMatch[]> {
    const keywords = [...name.split(' '), ...description.split(' ')]
      .filter(word => word.length > 3)
      .map(word => word.toLowerCase());
    
    const results = await this.prisma.hsCodeMapping.findMany({
      where: {
        OR: keywords.map(keyword => ({
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } }
          ]
        }))
      },
      take: 10,
      select: {
        name: true,
        description: true,
        code: true
      }
    }) as HSCodeMappingResult[];
    
    return results.map((result: HSCodeMappingResult) => ({
      name: result.name,
      description: result.description,
      hsCode: result.code
    }));
  }
  
  async validateHsCode(hsCode: string): Promise<string | null> {
    try {
      const result = await this.prisma.hsCode.findUnique({
        where: { code: hsCode },
        select: { code: true }
      });
      
      return result?.code || null;
    } catch (error) {
      console.error('Error validating HS code:', error);
      return null;
    }
  }
  
  async getComplianceRequirements(hsCode: string, market: string): Promise<ComplianceData | null> {
    try {
      const requirements = await this.prisma.complianceRequirement.findMany({
        where: {
          hsCodePrefix: { startsWith: hsCode.substring(0, 4) },
          market
        },
        select: {
          requirements: true,
          certifications: true,
          documentation: true,
          restrictions: true
        }
      }) as ComplianceRequirementResult[];
      
      if (requirements.length === 0) {
        return null;
      }
      
      // Combine all requirements if there are multiple matches
      return {
        requirements: [...new Set(requirements.flatMap(r => r.requirements))],
        certifications: [...new Set(requirements.flatMap(r => r.certifications))],
        documentation: [...new Set(requirements.flatMap(r => r.documentation))],
        restrictions: [...new Set(requirements.flatMap(r => r.restrictions))]
      };
    } catch (error) {
      console.error('Error fetching compliance requirements:', error);
      return null;
    }
  }
} 