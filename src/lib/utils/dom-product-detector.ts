/**
 * DOM-based product detector for SME websites
 * 
 * This utility analyzes HTML content to detect products by identifying:
 * 1. Repeating patterns in the DOM structure
 * 2. Image-text pairs that likely represent products
 * 3. Price patterns and indicators
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import { EnhancedProduct } from '../types/product-detection.types';

interface ProductPattern {
  element: Element;
  frequency: number;
}

interface ImageTextPair {
  image: Element;
  text: string;
  score: number;
}

interface DetectedPattern {
  type: string;
  count: number;
}

type CheerioRoot = ReturnType<typeof cheerio.load>;
type PatternType = 'repeatingPatterns' | 'imageTextPairs' | 'pricePatterns';

interface TagElement {
  type: 'tag' | 'script' | 'style';
  tagName: string;
  name: string;
  attribs: { [attr: string]: string };
  children: Element[];
  parent: Element | null;
  prev: Element | null;
  next: Element | null;
  nodeValue: string;
}

function isTagElement(element: Element): element is TagElement & Element {
  return (element.type === 'tag' || element.type === 'script' || element.type === 'style') &&
         'tagName' in element &&
         'name' in element &&
         'attribs' in element;
}

/**
 * DOM Product Detector for SME websites
 * Focuses on detecting products in non-standard e-commerce websites
 */
export class DOMProductDetector {
  private $: CheerioAPI;

  constructor(html: string) {
    this.$ = cheerio.load(html);
  }

  public detectProducts(): {
    products: EnhancedProduct[];
    patterns: DetectedPattern[];
  } {
    const products: EnhancedProduct[] = [];
    const patterns: DetectedPattern[] = [];
    
    // Apply detection strategies
    const repeatingPatterns = this.detectRepeatingPatterns();
    const imageTextPairs = this.detectImageTextPairs();
    const pricePatterns = this.detectPricePatterns();
    
    // Process repeating patterns (likely product grids/lists)
    if (repeatingPatterns.length > 0) {
      patterns.push({ type: 'repeatingPatterns', count: repeatingPatterns.length });
      
      repeatingPatterns.forEach(pattern => {
        const $el = cheerio.load(pattern.element);
        const product = this.extractProductFromElement($el, 'pattern-based');
        if (product) {
          products.push(product);
        }
      });
    }
    
    // Process image-text pairs if we found few or no products from patterns
    if (products.length < 3 && imageTextPairs.length > 0) {
      patterns.push({ type: 'imageTextPairs', count: imageTextPairs.length });
      
      imageTextPairs.forEach(pair => {
        const $container = cheerio.load(pair.image).parent();
        if ($container.length) {
          const product = this.extractProductFromElement($container, 'image-text');
          if (product) {
            products.push(product);
          }
        }
      });
    }
    
    // Enhance products with pricing if available
    if (pricePatterns.length > 0) {
      patterns.push({ type: 'pricePatterns', count: pricePatterns.length });
      
      products.forEach(product => {
        const priceEl = this.findClosestPriceElement(product.name);
        if (priceEl && pricePatterns.includes(priceEl)) {
          product.price = pricePatterns.find(el => el === priceEl);
        }
      });
    }
    
    return {
      products: this.deduplicateProducts(products),
      patterns
    };
  }
  
  /**
   * Detect repeating structural patterns that may indicate product grids or lists
   */
  public detectRepeatingPatterns(): ProductPattern[] {
    const patterns: ProductPattern[] = [];
    const elementSignatures = new Map<string, number>();

    this.$('*').each(function(this: Element): void {
      const signature = generateStructureSignature(this);
      elementSignatures.set(signature, (elementSignatures.get(signature) || 0) + 1);
    });

    // Convert to array and sort by frequency
    Array.from(elementSignatures.entries())
      .filter(([_, freq]) => freq > 1)
      .sort(([_, a], [_, b]) => b - a)
      .forEach(([signature, frequency]) => {
        // Find first element matching this signature
        this.$('*').each(function(this: Element): boolean {
          if (generateStructureSignature(this) === signature) {
            patterns.push({ element: this, frequency });
            return false; // Break the loop
          }
          return true;
        });
      });

    return patterns;
  }
  
  /**
   * Detect image-text pairs that likely represent products
   */
  public detectImageTextPairs(): ImageTextPair[] {
    const pairs: ImageTextPair[] = [];

    this.$('img').each(function(this: Element): void {
      const imgElement = this;
      const relatedText = findClosestText(imgElement);
      
      if (relatedText) {
        const score = scoreImageTextPair(imgElement);
        pairs.push({
          image: imgElement,
          text: relatedText,
          score
        });
      }
    });

    return pairs.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Detect price patterns in the document
   */
  public detectPricePatterns(): Element[] {
    return this.$('*')
      .filter(function(this: Element): boolean {
        const text = this.type === 'tag' ? this.children.map(c => c.data).join('').trim() : '';
        return /\$\d+(\.\d{2})?|\d+(\.\d{2})?\s*(USD|EUR|GBP)/.test(text);
      })
      .toArray();
  }
  
  /**
   * Extract product details from a DOM element
   */
  private extractProductFromElement($el: Cheerio<Element>, detectionMethod: string): EnhancedProduct | null {
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
    $el.find('img[src]').each((index: number, img: Element) => {
      const src = cheerio.load(img).attr('src');
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
    $el.find('tr, dt, .attribute, [class*="spec"]').each((index: number, attrEl: Element) => {
      const $attrEl = cheerio.load(attrEl);
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
      confidence: 0.8,
      detectionMethod
    };
  }
  
  /**
   * Calculate structural similarity between elements
   */
  private calculateStructuralSimilarity($container: Cheerio<Element>): number {
    const children = $container.children();
    if (children.length < 2) return 0;

    const firstSignature = generateStructureSignature($container.children()[0]);
    const similarities = children.toArray().map((element: Element) => {
      const signature = generateStructureSignature(cheerio.load(element));
      return calculateJaccardSimilarity(firstSignature, signature);
    });

    return similarities.reduce((sum: number, sim: number) => sum + sim, 0) / similarities.length;
  }
  
  /**
   * Generate a signature for DOM structure comparison
   */
  private generateStructureSignature(element: Element): string {
    const tagName = element.tagName?.toLowerCase() || '';
    const classes = element.attribs?.class?.split(/\s+/).filter(Boolean) || [];
    return `${tagName}${classes.length ? '.' + classes.join('.') : ''}`;
  }
  
  /**
   * Calculate Jaccard similarity between two arrays
   */
  private calculateJaccardSimilarity(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }
  
  /**
   * Check if a collection of elements contains images
   */
  public containsImages(): boolean {
    const images = this.$('img');
    let hasImages = false;

    images.each(function(this: Element, _i: number, _el: Element): void {
      if (this.tagName === 'img') {
        hasImages = true;
        return false; // Break the loop
      }
    });

    return images.length > 0 || hasImages;
  }
  
  /**
   * Check if a collection of elements contains price patterns
   */
  public containsPricePatterns(): boolean {
    const priceElements = this.$('*').filter(function(this: Element): boolean {
      const text = this.type === 'tag' ? this.children.map(c => c.data).join('').trim() : '';
      return /\$\d+(\.\d{2})?|\d+(\.\d{2})?\s*(USD|EUR|GBP)/.test(text);
    });

    return priceElements.length > 0;
  }
  
  /**
   * Estimate the visual size of an image from its attributes
   */
  private estimateImageSize($img: Cheerio<Element>): number {
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
  public findRelatedText(selector: string): string[] {
    const results: string[] = [];

    this.$(selector).each(function(this: Element): void {
      const parentEl = this.parent;
      if (parentEl && parentEl.type === 'tag') {
        const text = parentEl.children.map(c => c.data).join('').trim();
        if (text) {
          results.push(text);
        }
      }
    });

    return results;
  }
  
  /**
   * Score an image-text pair for product likelihood
   */
  private scoreImageTextPair(image: Element): number {
    let score = 0;

    // Score based on image attributes
    const alt = image.attribs?.alt || '';
    const title = image.attribs?.title || '';
    const src = image.attribs?.src || '';

    // Check if attributes contain meaningful content
    if (alt && !/^(image|photo|picture|img|\d+)$/i.test(alt)) score += 2;
    if (title && !/^(image|photo|picture|img|\d+)$/i.test(title)) score += 2;
    if (src && !/icon|logo|banner/i.test(src)) score += 1;

    // Score based on parent element characteristics
    if (image.parent?.type === 'tag') {
      const parentClasses = image.parent.attribs?.class || '';
      if (/product|item|thumbnail/i.test(parentClasses)) score += 2;
    }

    return score;
  }
  
  /**
   * Find the closest price element to a product name
   */
  private findClosestPriceElement(productName: string): Element | null {
    // Implementation would go here
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
   * Deduplicate products based on name and URL similarity
   */
  private deduplicateProducts(products: EnhancedProduct[]): EnhancedProduct[] {
    const uniqueProducts = new Map<string, EnhancedProduct>();
    
    products.forEach(product => {
      const key = `${product.name}-${product.url}`;
      if (!uniqueProducts.has(key) || 
          (product.confidence || 0) > (uniqueProducts.get(key)?.confidence || 0)) {
        uniqueProducts.set(key, product);
      }
    });
    
    return Array.from(uniqueProducts.values());
  }
}

// Helper functions
function findClosestText(element: Element): string {
  if (!element.parent || element.parent.type !== 'tag') {
    return '';
  }

  const siblings = element.parent.children.filter(node => 
    node.type === 'text' || (node.type === 'tag' && node !== element)
  );

  let closestText = '';
  let minDistance = Infinity;

  siblings.forEach(sibling => {
    if (sibling.type === 'text' && sibling.data) {
      const text = sibling.data.trim();
      if (text) {
        const distance = Math.abs(
          element.parent!.children.indexOf(element) - 
          element.parent!.children.indexOf(sibling)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestText = text;
        }
      }
    }
  });

  return closestText;
}
