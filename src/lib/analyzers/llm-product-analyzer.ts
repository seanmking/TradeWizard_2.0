/**
 * LLM Product Analyzer
 * 
 * This service uses Large Language Models to enhance product detection
 * when DOM-based methods are insufficient or uncertain.
 */

import { EnhancedProduct, ProductDetectionResult } from '../types/product-detection.types';

/**
 * Configuration for the LLM Product Analyzer
 */
export interface LLMProductAnalyzerConfig {
  // API key for the LLM service
  apiKey?: string;
  
  // Model to use
  model: string;
  
  // Maximum tokens to use in requests
  maxTokens: number;
  
  // Temperature setting for the model
  temperature: number;
  
  // Whether to use cache
  useCache: boolean;
  
  // Cache TTL in seconds
  cacheTtl: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: LLMProductAnalyzerConfig = {
  model: 'gpt-3.5-turbo', // Default to a more cost-effective model
  maxTokens: 1000,
  temperature: 0.2, // Low temperature for more deterministic results
  useCache: true,
  cacheTtl: 86400 // 24 hours
};

/**
 * LLM Product Analyzer
 * 
 * This class handles the integration with LLM services to:
 * 1. Identify products when DOM-based methods are uncertain
 * 2. Enhance product descriptions and attributes
 * 3. Categorize products according to standardized taxonomies
 */
export class LLMProductAnalyzer {
  private config: LLMProductAnalyzerConfig;
  
  constructor(config: Partial<LLMProductAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Validate API key
    if (!process.env.OPENAI_API_KEY && !this.config.apiKey) {
      console.warn('No API key provided for LLMProductAnalyzer. LLM analysis will be disabled.');
    }
  }
  
  /**
   * Analyze HTML content to detect products
   * 
   * @param html The HTML content to analyze
   * @param existingProducts Optional products already detected by DOM methods
   */
  public async analyzeHtml(
    html: string,
    existingProducts: EnhancedProduct[] = []
  ): Promise<ProductDetectionResult> {
    try {
      // Check if LLM analysis is enabled
      if (!process.env.OPENAI_API_KEY && !this.config.apiKey) {
        return {
          products: [],
          categories: [],
          metrics: {
            productCount: 0,
            tokensUsed: 0,
            error: 'LLM analysis is disabled due to missing API key'
          }
        };
      }
      
      // Prepare the HTML for analysis
      const preparedHtml = this.prepareHtmlForAnalysis(html);
      
      // If no valid content, return empty results
      if (!preparedHtml) {
        return {
          products: [],
          categories: [],
          metrics: {
            productCount: 0,
            tokensUsed: 0,
            error: 'Invalid HTML content for analysis'
          }
        };
      }
      
      // Generate a prompt for product detection
      const prompt = this.generateProductDetectionPrompt(preparedHtml, existingProducts);
      
      // Call the LLM API
      const llmResults = await this.callLlmApi(prompt);
      
      // Parse and process the results
      const products = this.parseProductsFromLlmResponse(llmResults.content);
      
      // Extract categories
      const categories = this.extractCategories(products);
      
      // Return the results
      return {
        products,
        categories,
        metrics: {
          productCount: products.length,
          tokensUsed: llmResults.tokensUsed,
          confidence: 0.85 // LLM results typically have high confidence
        }
      };
    } catch (error) {
      console.error('Error in LLM product analysis:', error);
      return {
        products: [],
        categories: [],
        metrics: {
          productCount: 0,
          tokensUsed: 0,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
  
  /**
   * Prepare HTML for LLM analysis
   * 
   * This simplifies the HTML to focus on product-relevant information
   * and reduce token usage.
   */
  private prepareHtmlForAnalysis(html: string): string {
    // Implementation would clean and simplify HTML
    // This is a placeholder - in a real implementation, we would:
    // 1. Remove scripts, styles, comments, etc.
    // 2. Focus on main content areas
    // 3. Simplify deeply nested structures
    // 4. Extract key sections that are likely to contain products
    
    return html;
  }
  
  /**
   * Generate a prompt for product detection
   */
  private generateProductDetectionPrompt(
    html: string,
    existingProducts: EnhancedProduct[]
  ): string {
    // Create a prompt that asks the LLM to identify products
    let prompt = `
You are a specialized product detection system for e-commerce websites.
Analyze the HTML content below and identify all products with their details.

Instructions:
1. Identify all products present in the HTML content.
2. For each product, extract: name, description, price, images, and any relevant attributes.
3. Output in a structured JSON format.
4. Focus on actual products for sale, not generic website elements.
5. Don't invent information - if some details are missing, leave them blank.

HTML Content:
\`\`\`html
${html.substring(0, 15000)} ${html.length > 15000 ? '... [truncated]' : ''}
\`\`\`
`;

    // Add information about products already detected via DOM methods
    if (existingProducts.length > 0) {
      prompt += `
Previously Detected Products (these may be incomplete or incorrect):
${JSON.stringify(existingProducts, null, 2)}

Please correct any errors in the previously detected products and identify any additional products.
`;
    }

    prompt += `
Output Format:
{
  "products": [
    {
      "name": "Product name",
      "description": "Product description",
      "price": "Product price",
      "images": ["URL1", "URL2"],
      "attributes": {
        "color": "value",
        "size": "value",
        "material": "value"
      },
      "category": "Best guess at product category"
    }
  ]
}

Only respond with valid JSON. Do not include any explanations or notes outside the JSON structure.
`;

    return prompt;
  }
  
  /**
   * Call the LLM API
   * 
   * This is a placeholder - in a real implementation, this would call
   * an actual LLM API like OpenAI's GPT or a similar service.
   */
  private async callLlmApi(prompt: string): Promise<{
    content: string;
    tokensUsed: number;
  }> {
    // This is a mock implementation - in production this would:
    // 1. Use the OpenAI SDK or similar to send the prompt
    // 2. Process the response
    // 3. Track token usage
    
    // For now, return a mock response
    return {
      content: JSON.stringify({
        products: []
      }),
      tokensUsed: Math.floor(prompt.length / 4) // Rough estimation
    };
  }
  
  /**
   * Parse products from the LLM response
   */
  private parseProductsFromLlmResponse(response: string): EnhancedProduct[] {
    try {
      // Attempt to parse JSON response
      const parsed = JSON.parse(response);
      
      // If the parsed object contains a products array, use it
      if (parsed && Array.isArray(parsed.products)) {
        // Map to ensure proper structure
        return parsed.products.map((product: any) => ({
          name: product.name || '',
          description: product.description || '',
          price: product.price || '',
          images: Array.isArray(product.images) ? product.images : [],
          attributes: product.attributes || {},
          category: product.category || null,
          confidence: 0.85,
          detectionMethod: 'llm'
        }));
      }
      
      // If response is an array directly, assume it's the products array
      if (parsed && Array.isArray(parsed)) {
        return parsed.map((product: any) => ({
          name: product.name || '',
          description: product.description || '',
          price: product.price || '',
          images: Array.isArray(product.images) ? product.images : [],
          attributes: product.attributes || {},
          category: product.category || null,
          confidence: 0.85,
          detectionMethod: 'llm'
        }));
      }
      
      console.warn('Failed to parse products from LLM response:', response);
      return [];
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      return [];
    }
  }
  
  /**
   * Extract categories from products
   */
  private extractCategories(products: EnhancedProduct[]): string[] {
    const categorySet = new Set<string>();
    
    products.forEach(product => {
      if (product.category) {
        categorySet.add(product.category);
      }
    });
    
    return Array.from(categorySet);
  }
}
