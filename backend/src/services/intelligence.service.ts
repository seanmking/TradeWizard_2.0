import logger from '../utils/logger';
import websiteExtractor, { ProductInfo, BusinessInfo } from './web-scraper.service';
import domProductDetector, { DetectedProduct } from './dom-product-detector.service';
import ProductCatalog from '../models/product-catalog.model';
import BusinessProfile from '../models/business-profile.model';
import ExtractionResult from '../models/extraction-result.model';

export interface ExtractionOptions {
  extractProducts?: boolean;
  extractBusinessInfo?: boolean;
  minConfidence?: number;
  maxResults?: number;
}

export interface ExtractionResponse {
  url: string;
  timestamp: Date;
  products?: ProductInfo[];
  businessInfo?: BusinessInfo;
  error?: string;
}

/**
 * Intelligence service that coordinates extraction of business and product data
 */
export class IntelligenceService {
  /**
   * Extract information from a website
   */
  public async extractFromWebsite(url: string, options: ExtractionOptions = {}): Promise<ExtractionResponse> {
    const timestamp = new Date();
    const result: ExtractionResponse = {
      url,
      timestamp
    };
    
    try {
      logger.info(`Extracting data from website: ${url}`);
      
      // Set default options
      const opts = {
        extractProducts: options.extractProducts !== false,
        extractBusinessInfo: options.extractBusinessInfo !== false,
        minConfidence: options.minConfidence || 0.5,
        maxResults: options.maxResults || 10
      };
      
      // Create extraction record
      const extraction = await ExtractionResult.create({
        source: 'website',
        sourceUrl: url,
        timestamp,
        status: 'processing'
      });
      
      // Extract business info if requested
      if (opts.extractBusinessInfo) {
        try {
          const businessInfo = await websiteExtractor.extractBusinessInfo(url);
          
          if (businessInfo && businessInfo.confidence >= opts.minConfidence) {
            result.businessInfo = businessInfo;
            
            // Store business info in database
            await BusinessProfile.findOneAndUpdate(
              { 'source.url': url },
              {
                name: businessInfo.name,
                description: businessInfo.description,
                logo: businessInfo.logo,
                location: businessInfo.location,
                contactInfo: businessInfo.contactInfo,
                socialMedia: businessInfo.socialMedia,
                industries: businessInfo.industries,
                source: {
                  type: 'website',
                  url: url,
                  confidence: businessInfo.confidence
                },
                lastUpdated: timestamp
              },
              { upsert: true, new: true }
            );
          }
        } catch (error) {
          logger.error(`Error extracting business info from ${url}:`, error);
        }
      }
      
      // Extract products if requested
      if (opts.extractProducts) {
        try {
          // First, get the full page content
          const content = await websiteExtractor.extractContent(url);
          
          // Then use DOM detector to find products
          const domProducts = domProductDetector.detectProducts(content.html, url);
          
          // Also get products from website extractor for comparison
          const scrapedProducts = await websiteExtractor.extractProducts(url);
          
          // Merge products from both methods, with DOM detector taking precedence
          const mergedProducts = this.mergeProductResults(domProducts, scrapedProducts);
          
          // Filter by confidence and limit results
          const filteredProducts = mergedProducts
            .filter(product => product.confidence >= opts.minConfidence)
            .slice(0, opts.maxResults);
          
          if (filteredProducts.length > 0) {
            result.products = filteredProducts;
            
            // Store products in database
            for (const product of filteredProducts) {
              await ProductCatalog.findOneAndUpdate(
                { 
                  'source.url': url,
                  name: product.name
                },
                {
                  name: product.name,
                  description: product.description || '',
                  images: product.images || [],
                  price: product.price,
                  currency: product.currency,
                  category: product.category,
                  specifications: product.specifications,
                  source: {
                    type: 'website',
                    url: url,
                    confidence: product.confidence
                  },
                  lastUpdated: timestamp
                },
                { upsert: true, new: true }
              );
            }
          }
        } catch (error) {
          logger.error(`Error extracting products from ${url}:`, error);
        }
      }
      
      // Update extraction status
      await ExtractionResult.findByIdAndUpdate(extraction._id, {
        status: 'completed',
        businessInfoExtracted: result.businessInfo != null,
        productsExtracted: result.products != null ? result.products.length : 0
      });
      
      return result;
    } catch (error) {
      logger.error(`Failed to extract from ${url}:`, error);
      
      // Try to update extraction record if it was created
      try {
        await ExtractionResult.findOneAndUpdate(
          { source: 'website', sourceUrl: url },
          { status: 'failed', error: error.message }
        );
      } catch (dbError) {
        logger.error('Could not update extraction status:', dbError);
      }
      
      result.error = error.message;
      return result;
    } finally {
      // Always close browser to prevent memory leaks
      try {
        await websiteExtractor.closeBrowser();
      } catch (error) {
        logger.error('Error closing browser:', error);
      }
    }
  }
  
  /**
   * Merge product results from different detection methods
   * Prioritizes products with higher confidence scores
   */
  private mergeProductResults(domProducts: DetectedProduct[], scrapedProducts: ProductInfo[]): ProductInfo[] {
    const productsMap = new Map<string, ProductInfo>();
    
    // First add DOM products as they are usually more accurate
    domProducts.forEach(product => {
      // Convert from DetectedProduct to ProductInfo
      productsMap.set(product.name, {
        name: product.name,
        description: product.description || '',
        images: product.imageUrl ? [product.imageUrl] : [],
        price: product.price,
        currency: product.currency,
        category: product.category,
        specifications: product.specifications,
        confidence: product.confidence
      });
    });
    
    // Add scraped products if they don't exist or have higher confidence
    scrapedProducts.forEach(product => {
      const existing = productsMap.get(product.name);
      
      if (!existing || product.confidence > existing.confidence) {
        productsMap.set(product.name, product);
      }
    });
    
    // Convert back to array and sort by confidence
    return Array.from(productsMap.values())
      .sort((a, b) => b.confidence - a.confidence);
  }
}

export default new IntelligenceService();
