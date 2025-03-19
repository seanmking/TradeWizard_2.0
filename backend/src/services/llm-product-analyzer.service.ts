import OpenAI from 'openai';
import { ProductInfo } from '../types/index';

class LLMProductAnalyzerService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async classifyProduct(productDetails: ProductInfo): Promise<EnhancedProductClassification> {
    const prompt = this.buildClassificationPrompt(productDetails);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system", 
            content: "You are an expert trade analyst specializing in product classification and export readiness."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const classificationResult = JSON.parse(response.choices[0].message.content || '{}');
      return this.validateClassification(classificationResult);
    } catch (error) {
      console.error('LLM Product Classification Error:', error);
      throw new Error('Failed to classify product');
    }
  }

  private buildClassificationPrompt(productDetails: ProductInfo): string {
    return `
      Analyze the following product details and provide a comprehensive classification:

      Product Name: ${productDetails.name}
      Description: ${productDetails.description || 'Not provided'}
      Category: ${productDetails.category || 'Not provided'}
      Price: ${productDetails.price || 'Not provided'}
      HS Code (if known): ${productDetails.hsCode || 'Not provided'}

      For this product, please provide:
      1. Precise HS Code
      2. Industry Sector and Subsector
      3. Estimated Export Potential (Low/Medium/High)
      4. Potential Export Markets
      5. Potential Compliance Requirements

      Response must be in strict JSON format with the following structure:
      {
        "hsCode": string,
        "industrySector": string,
        "industrySubsector": string,
        "exportPotential": "Low" | "Medium" | "High",
        "potentialMarkets": string[],
        "complianceRequirements": string[]
      }
    `;
  }

  private validateClassification(result: any): EnhancedProductClassification {
    // Validate and ensure all required fields are present
    const validatedResult: EnhancedProductClassification = {
      hsCode: result.hsCode || 'Unknown',
      industrySector: result.industrySector || 'Unclassified',
      industrySubsector: result.industrySubsector || 'Unclassified',
      exportPotential: ['Low', 'Medium', 'High'].includes(result.exportPotential) 
        ? result.exportPotential 
        : 'Low',
      potentialMarkets: Array.isArray(result.potentialMarkets) 
        ? result.potentialMarkets 
        : [],
      complianceRequirements: Array.isArray(result.complianceRequirements)
        ? result.complianceRequirements
        : []
    };

    return validatedResult;
  }
}

interface EnhancedProductClassification {
  hsCode: string;
  industrySector: string;
  industrySubsector: string;
  exportPotential: 'Low' | 'Medium' | 'High';
  potentialMarkets: string[];
  complianceRequirements: string[];
}

export default LLMProductAnalyzerService;
