/**
 * DOM-based product detector for SME websites
 * 
 * This utility analyzes HTML content to detect products by identifying:
 * 1. Repeating patterns in the DOM structure
 * 2. Image-text pairs that likely represent products
 * 3. Price patterns and indicators
 */

import * as cheerio from 'cheerio';
import { EnhancedProduct } from '../types/product-detection.types';

/**
 * DOM Product Detector for SME websites
 * Focuses on detecting products in non-standard e-commerce websites
 */
export class DomProductDetector {
  /**
   * Detect products from HTML content
   */
  public detectProducts(html: string): {
    products: EnhancedProduct[];
    patterns: any[];
  } {
    const $ = cheerio.load(html);
    const products: EnhancedProduct[] = [];
    const patterns = [];
    
    // Apply detection strategies
    const repeatingPatterns = this.detectRepeatingPatterns($);
    const imageTextPairs = this.detectImageTextPairs($);
    const pricePatterns = this.detectPricePatterns($);
    
    // Process repeating patterns (likely product grids/lists)
    if (repeatingPatterns.length > 0) {
      patterns.push({ type: 'repeatingPatterns', count: repeatingPatterns.length });
      
      repeatingPatterns.forEach(pattern => {
        const elements = pattern.elements;
        for (const element of elements) {
          const $el = $(element);
          
          // Extract product details from the element
          const product = this.extractProductFromElement($, $el, 'pattern-based');
          if (product) {
            products.push(product);
          }
        }
      });
    }
    
    // Process image-text pairs if we found few or no products from patterns
    if (products.length < 3 && imageTextPairs.length > 0) {
      patterns.push({ type: 'imageTextPairs', count: imageTextPairs.length });
      
      imageTextPairs.forEach(pair => {
        // Extract product from image-text pair
        const imageEl = pair.imageElement;
        const textEl = pair.textElement;
        
        const $container = $(imageEl).parent();
        if ($container.length) {
          const product = this.extractProductFromElement($, $container, 'image-text');
          if (product) {
            products.push(product);
          }
        }
      });
    }
    
    // Enhance products with pricing if available
    if (pricePatterns.size > 0) {
      patterns.push({ type: 'pricePatterns', count: pricePatterns.size });
      
      products.forEach(product => {
        // Try to associate a price with this product based on DOM proximity
        const priceEl = this.findClosestPriceElement($, product.name);
        if (priceEl && pricePatterns.has(priceEl)) {
          product.price = pricePatterns.get(priceEl);
        }
      });
    }
    
    // Deduplicate products
    const uniqueProducts = this.deduplicateProducts(products);
    
    return {
      products: uniqueProducts,
      patterns
    };
  }
  
  /**
   * Detect repeating structural patterns that may indicate product grids or lists
   */
  private detectRepeatingPatterns($: cheerio.CheerioAPI): any[] {
    const patterns = [];
    
    // Find potential container elements
    $('div, section, ul, [class*="grid"], [class*="row"], [class*="products"], [class*="list"]').each((_, container) => {
      const $container = $(container);
      const children = $container.children();
      
      // Need at least 2 children to identify a pattern
      if (children.length < 2) return;
      
      // Check if children have similar structure
      const similarityScore = this.calculateStructuralSimilarity($, children);
      
      if (similarityScore > 0.7) {  // 70% similarity threshold
        const hasImages = this.containsImages($, children);
        const hasPrices = this.containsPricePatterns($, children);
        
        // Product indicators boost the confidence
        const confidence = similarityScore * (hasImages ? 1.2 : 0.8) * (hasPrices ? 1.3 : 0.9);
        
        if (confidence > 0.6) {
          patterns.push({
            container: container,
            elements: children.toArray(),
            confidence,
            hasImages,
            hasPrices
          });
        }
      }
    });
    
    // Sort by confidence (highest first)
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Detect image-text pairs that likely represent products
   */
  private detectImageTextPairs($: cheerio.CheerioAPI): any[] {
    const pairs = [];
    
    // Find images with certain characteristics
    $('img[src]:not([src=""])').each((_, img) => {
      const $img = $(img);
      const imgSize = this.estimateImageSize($img);
      
      // Skip tiny icons or very large images
      if (imgSize < 50 || imgSize > 800) return;
      
      // Find related text content close to the image
      const relatedText = this.findRelatedText($, $img);
      if (!relatedText) return;
      
      // Score the pair based on characteristics
      const confidence = this.scoreImageTextPair($, $img, relatedText);
      
      if (confidence > 0.5) {
        pairs.push({
          imageElement: img,
          textElement: relatedText,
          confidence
        });
      }
    });
    
    return pairs.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Detect price patterns in the document
   */
  private detectPricePatterns($: cheerio.CheerioAPI): Map<any, string> {
    const priceMap = new Map();
    
    // Common price patterns
    const priceRegex = /(?:USD|£|€|\$|ZAR|R)?\s*\d+(?:,\d{3})*(?:\.\d{2})?/gi;
    
    $('*:contains("$"), *:contains("USD"), *:contains("£"), *:contains("€"), *:contains("ZAR"), *:contains("R")').each((_, el) => {
      const text = $(el).text().trim();
      const matches = text.match(priceRegex);
      
      if (matches && matches[0]) {
        const price = this.normalizePrice(matches[0]);
        if (price) {
          priceMap.set(el, price);
        }
      }
    });
    
    return priceMap;
  }
  
  /**
   * Extract product details from a DOM element
   */
  private extractProductFromElement($: cheerio.CheerioAPI, $el: cheerio.Cheerio, detectionMethod: string): EnhancedProduct | null {
    // Extract product name (check multiple common selectors)
    let name = $el.find('h1, h2, h3, h4, .title, .name, .product-title, .product-name').first().text().trim();
    if (!name) {
      // Try getting text directly if no heading found
      name = $el.clone().children('img, button').remove().end().text().trim();
    }
    
    // If still no name, try the alt text of an image
    if (!name) {
      const $img = $el.find('img[alt]').first();
      if ($img.length) {
        name = $img.attr('alt')?.trim() || '';
      }
    }
    
    // If we couldn't find a name, it's probably not a product
    if (!name) return null;
    
    // Extract description
    let description = $el.find('p, .description, [class*="desc"]').first().text().trim();
    if (description === name) description = ''; // Avoid duplicate content
    
    // Extract image URLs
    const images: string[] = [];
    $el.find('img[src]').each((_, img) => {
      const src = $(img).attr('src');
      if (src && !src.includes('data:image')) {
        images.push(src);
      }
    });
    
    // Try to find a product URL
    let url = '';
    const $link = $el.find('a[href]').first();
    if ($link.length) {
      url = $link.attr('href') || '';
    }
    
    // Basic attributes
    const attributes: Record<string, string> = {};
    
    // Look for table rows or definition lists with attributes
    $el.find('tr, dt, .attribute, [class*="spec"]').each((_, attrEl) => {
      const $attrEl = $(attrEl);
      const key = $attrEl.find('th, dt, .label').text().trim();
      const value = $attrEl.find('td, dd, .value').text().trim();
      
      if (key && value) {
        attributes[key] = value;
      }
    });
    
    return {
      name,
      description,
      images,
      url,
      attributes,
      confidence: 0.7, // Base confidence score
      detectionMethod
    };
  }
  
  /**
   * Helper method to calculate structural similarity between elements
   */
  private calculateStructuralSimilarity($: cheerio.CheerioAPI, children: cheerio.Cheerio): number {
    if (children.length < 2) return 0;
    
    const firstChild = children.first();
    const firstSignature = this.generateStructureSignature($, firstChild);
    
    let similarityCount = 0;
    
    children.slice(1).each((_, child) => {
      const $child = $(child);
      const signature = this.generateStructureSignature($, $child);
      
      // Calculate similarity between signatures
      const similarity = this.compareSignatures(firstSignature, signature);
      if (similarity > 0.7) {
        similarityCount++;
      }
    });
    
    return similarityCount / (children.length - 1);
  }
  
  /**
   * Generate a structural signature for DOM comparison
   */
  private generateStructureSignature($: cheerio.CheerioAPI, $element: cheerio.Cheerio): string {
    // Create a signature based on element type, classes, and child structure
    const tagName = $element.prop('tagName')?.toLowerCase() || '';
    const hasImage = $element.find('img').length > 0;
    const hasHeading = $element.find('h1, h2, h3, h4, h5, h6').length > 0;
    const hasPrice = $element.text().match(/\$|USD|£|€|ZAR|R/) !== null;
    
    // Child elements count by type (simplified)
    let childSignature = '';
    $element.children().each((_, child) => {
      childSignature += $(child).prop('tagName')?.toLowerCase()[0] || '';
    });
    
    return `${tagName}-${hasImage ? 'i' : ''}-${hasHeading ? 'h' : ''}-${hasPrice ? 'p' : ''}-${childSignature}`;
  }
  
  /**
   * Compare two structure signatures for similarity
   */
  private compareSignatures(signature1: string, signature2: string): number {
    if (signature1 === signature2) return 1.0;
    
    // Simple similarity metric
    const parts1 = signature1.split('-');
    const parts2 = signature2.split('-');
    
    let matchCount = 0;
    const totalParts = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
      if (parts1[i] === parts2[i]) {
        matchCount++;
      }
    }
    
    return matchCount / totalParts;
  }
  
  /**
   * Check if a collection of elements contains images
   */
  private containsImages($: cheerio.CheerioAPI, children: cheerio.Cheerio): boolean {
    let imageCount = 0;
    
    children.each((_, child) => {
      if ($(child).find('img').length > 0) {
        imageCount++;
      }
    });
    
    return imageCount >= children.length * 0.5; // At least 50% have images
  }
  
  /**
   * Check if a collection of elements contains price patterns
   */
  private containsPricePatterns($: cheerio.CheerioAPI, children: cheerio.Cheerio): boolean {
    let priceCount = 0;
    const priceRegex = /(?:USD|£|€|\$|ZAR|R)?\s*\d+(?:,\d{3})*(?:\.\d{2})?/;
    
    children.each((_, child) => {
      if (priceRegex.test($(child).text())) {
        priceCount++;
      }
    });
    
    return priceCount >= children.length * 0.3; // At least 30% have prices
  }
  
  /**
   * Estimate the visual size of an image from its attributes
   */
  private estimateImageSize($img: cheerio.Cheerio): number {
    const width = parseInt($img.attr('width') || '0', 10);
    const height = parseInt($img.attr('height') || '0', 10);
    
    if (width > 0 && height > 0) {
      return Math.max(width, height);
    }
    
    // Check for inline style with width/height
    const style = $img.attr('style') || '';
    const widthMatch = style.match(/width:\s*(\d+)px/);
    const heightMatch = style.match(/height:\s*(\d+)px/);
    
    if (widthMatch && heightMatch) {
      return Math.max(parseInt(widthMatch[1], 10), parseInt(heightMatch[1], 10));
    }
    
    // Default to medium size if we can't determine
    return 200;
  }
  
  /**
   * Find text content related to an image
   */
  private findRelatedText($: cheerio.CheerioAPI, $img: cheerio.Cheerio): any {
    // Check for text in the same parent container
    const $parent = $img.parent();
    const parentText = $parent.clone().children('img').remove().end().text().trim();
    
    if (parentText) {
      return $parent[0];
    }
    
    // Check for adjacent heading or paragraph
    const $next = $img.next('h1, h2, h3, h4, p, .title, .name');
    if ($next.length && $next.text().trim()) {
      return $next[0];
    }
    
    // Check for elements in the grandparent container
    const $grandparent = $parent.parent();
    if ($grandparent.length) {
      const $heading = $grandparent.find('h1, h2, h3, h4, .title, .name').first();
      if ($heading.length && $heading.text().trim()) {
        return $heading[0];
      }
      
      const $paragraph = $grandparent.find('p').first();
      if ($paragraph.length && $paragraph.text().trim()) {
        return $paragraph[0];
      }
    }
    
    return null;
  }
  
  /**
   * Score an image-text pair for product likelihood
   */
  private scoreImageTextPair($: cheerio.CheerioAPI, $img: cheerio.Cheerio, textElement: any): number {
    const $text = $(textElement);
    let score = 0.5; // Base score
    
    // Image with good dimensions is more likely a product image
    const imgSize = this.estimateImageSize($img);
    if (imgSize >= 100 && imgSize <= 500) {
      score += 0.1;
    }
    
    // Image with an alt attribute is more likely a product
    if ($img.attr('alt')) {
      score += 0.1;
    }
    
    // Text in a heading is more likely a product name
    if (textElement.tagName && /^h[1-6]$/i.test(textElement.tagName)) {
      score += 0.15;
    }
    
    // Text containing price patterns is more likely a product
    const text = $text.text();
    if (/(?:USD|£|€|\$|ZAR|R)?\s*\d+(?:,\d{3})*(?:\.\d{2})?/.test(text)) {
      score += 0.2;
    }
    
    // Common product indicator words
    const productWords = /buy|add to cart|product|item|purchase|order|shop/i;
    if (productWords.test(text) || productWords.test($text.parent().text())) {
      score += 0.15;
    }
    
    return Math.min(1.0, score); // Cap at 1.0
  }
  
  /**
   * Find the closest price element to a product name
   */
  private findClosestPriceElement($: cheerio.CheerioAPI, productName: string): any {
    // This is a simplified implementation
    // A real implementation would use DOM traversal to find the closest price element
    return null;
  }
  
  /**
   * Normalize price format
   */
  private normalizePrice(priceStr: string): string {
    // Remove non-numeric characters except decimal point
    return priceStr.trim();
  }
  
  /**
   * Deduplicate products based on name similarity
   */
  private deduplicateProducts(products: EnhancedProduct[]): EnhancedProduct[] {
    const uniqueProducts: EnhancedProduct[] = [];
    const nameMap = new Map<string, boolean>();
    
    for (const product of products) {
      // Create a normalized name for comparison
      const normalizedName = product.name.toLowerCase().trim();
      
      // Skip if we've seen a very similar name
      let isDuplicate = false;
      nameMap.forEach((_, existingName) => {
        if (this.calculateStringSimilarity(normalizedName, existingName) > 0.8) {
          isDuplicate = true;
        }
      });
      
      if (!isDuplicate) {
        nameMap.set(normalizedName, true);
        uniqueProducts.push(product);
      }
    }
    
    return uniqueProducts;
  }
  
  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    
    // Simple case: direct substring
    if (str1.includes(str2) || str2.includes(str1)) {
      const longerLength = Math.max(str1.length, str2.length);
      const shorterLength = Math.min(str1.length, str2.length);
      return shorterLength / longerLength;
    }
    
    // For more complex cases, a proper Levenshtein implementation would go here
    // This is simplified for brevity
    return 0.0;
  }
}
