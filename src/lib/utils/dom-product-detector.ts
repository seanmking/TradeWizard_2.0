/**
 * DOM-based product detector for SME websites
 * 
 * This utility analyzes HTML content to detect products by identifying:
 * 1. Repeating patterns in the DOM structure
 * 2. Image-text pairs that likely represent products
 * 3. Price patterns and indicators
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI, Cheerio, Element, AnyNode } from 'cheerio';
import type { Element as DomHandlerElement } from 'domhandler';
import { EnhancedProduct } from '../types/product-detection.types';

interface ProductPattern {
  element: DomHandlerElement;
  frequency: number;
}

interface ImageTextPair {
  image: DomHandlerElement;
  text: string;
  score: number;
}

interface DetectedPattern {
  type: string;
  count: number;
}

interface TagElement extends DomHandlerElement {
  type: 'tag' | 'script' | 'style';
  tagName: string;
  name: string;
  attribs: { [attr: string]: string };
  children: DomHandlerElement[];
  parent: DomHandlerElement | null;
  prev: DomHandlerElement | null;
  next: DomHandlerElement | null;
  nodeValue: string;
}

function isTagElement(element: DomHandlerElement): element is TagElement {
  return (element.type === 'tag' || element.type === 'script' || element.type === 'style') &&
         'tagName' in element &&
         'name' in element &&
         'attribs' in element;
}

/**
 * Generate a structure signature for DOM elements
 */
function generateStructureSignature(element: DomHandlerElement): string {
  if (!isTagElement(element)) return '';
  
  const tagName = element.tagName?.toLowerCase() || '';
  const classes = element.attribs?.class?.split(/\s+/).filter(Boolean) || [];
  return `${tagName}${classes.length ? '.' + classes.join('.') : ''}`;
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
        const $el = cheerio.load(pattern.element as any);
        const product = this.extractProductFromElement($el.root(), 'pattern-based');
        if (product) {
          products.push(product);
        }
      });
    }
    
    // Process image-text pairs if we found few or no products from patterns
    if (products.length < 3 && imageTextPairs.length > 0) {
      patterns.push({ type: 'imageTextPairs', count: imageTextPairs.length });
      
      imageTextPairs.forEach(pair => {
        const $parent = this.$(pair.image).parent();
        if ($parent.length) {
          const product = this.extractProductFromElement($parent, 'image-text');
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

    this.$('*').each((_index: number, element: DomHandlerElement) => {
      const signature = generateStructureSignature(element);
      elementSignatures.set(signature, (elementSignatures.get(signature) || 0) + 1);
    });

    // Convert to array and sort by frequency
    Array.from(elementSignatures.entries())
      .filter(([_, freq]) => freq > 1)
      .sort(([_s1, a], [_s2, b]) => b - a)
      .forEach(([signature, frequency]) => {
        // Find first element matching this signature
        let found = false;
        this.$('*').each((_index: number, element: DomHandlerElement) => {
          if (!found && generateStructureSignature(element) === signature) {
            patterns.push({ element, frequency });
            found = true;
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

    this.$('img').each((_index: number, element: DomHandlerElement) => {
      const imgElement = element;
      const relatedText = findClosestText(imgElement);
      
      if (relatedText) {
        const score = this.scoreImageTextPair(imgElement);
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
  public detectPricePatterns(): DomHandlerElement[] {
    return this.$('*')
      .filter((_index: number, element: DomHandlerElement) => {
        if (!isTagElement(element)) return false;
        
        let text = '';
        if (element.children) {
          text = element.children
            .filter(child => child.type === 'text' && child.data)
            .map(child => (child as any).data || '')
            .join('')
            .trim();
        }
        
        return /\$\d+(\.\d{2})?|\d+(\.\d{2})?\s*(USD|EUR|GBP)/.test(text);
      })
      .toArray();
  }
  
  /**
   * Extract product details from a DOM element
   */
  private extractProductFromElement($el: Cheerio<AnyNode>, detectionMethod: string): EnhancedProduct | null {
    // Extract product name (check multiple common selectors)
    let name = $el.find('h1, h2, h3, h4, .title, .name, .product-title, .product-name').first().text().trim();
    if (!name) {
      // Try getting text directly if no heading found
      const $clone = $el.clone();
      $clone.find('img, button').remove();
      name = $clone.text().trim();
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
    $el.find('img[src]').each((_index: number, img: DomHandlerElement) => {
      const src = this.$(img).attr('src');
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
    $el.find('tr, dt, .attribute, [class*="spec"]').each((_index: number, attrEl: DomHandlerElement) => {
      const $attrEl = this.$(attrEl);
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

    const childElements = children.toArray();
    if (childElements.length === 0) return 0;

    const firstSignature = generateStructureSignature(childElements[0]);
    const similarities = childElements.map((element: DomHandlerElement) => {
      const signature = generateStructureSignature(element);
      return this.calculateJaccardSimilarity(firstSignature.split('.'), signature.split('.'));
    });

    return similarities.reduce((sum: number, sim: number) => sum + sim, 0) / similarities.length;
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

    images.each((_index: number, element: DomHandlerElement) => {
      if (isTagElement(element) && element.tagName === 'img') {
        hasImages = true;
        return false; // Break the loop
      }
      return true;
    });

    return images.length > 0 || hasImages;
  }
  
  /**
   * Check if a collection of elements contains price patterns
   */
  public containsPricePatterns(): boolean {
    const priceElements = this.$('*').filter((_index: number, element: DomHandlerElement) => {
      if (!isTagElement(element)) return false;
      
      let text = '';
      if (element.children) {
        text = element.children
          .filter(child => child.type === 'text' && (child as any).data)
          .map(child => (child as any).data || '')
          .join('')
          .trim();
      }
      
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

    this.$(selector).each((_index: number, element: DomHandlerElement) => {
      if (!element.parent || !isTagElement(element.parent)) return;
      
      const parentEl = element.parent;
      
      const textNodes = parentEl.children.filter(child => 
        child.type === 'text' && (child as any).data
      );
      
      const text = textNodes.map(node => (node as any).data || '').join('').trim();
      if (text) {
        results.push(text);
      }
    });

    return results;
  }
  
  /**
   * Score an image-text pair for product likelihood
   */
  private scoreImageTextPair(image: DomHandlerElement): number {
    if (!isTagElement(image)) return 0;
    
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
    if (image.parent && isTagElement(image.parent)) {
      const parentClasses = image.parent.attribs?.class || '';
      if (/product|item|thumbnail/i.test(parentClasses)) score += 2;
    }

    return score;
  }
  
  /**
   * Find the closest price element to a product name
   */
  private findClosestPriceElement(productName: string): DomHandlerElement | null {
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
function findClosestText(element: DomHandlerElement): string {
  if (!element.parent || !isTagElement(element.parent)) {
    return '';
  }

  const siblings = element.parent.children.filter(node => 
    node.type === 'text' || (node.type === 'tag' && node !== element)
  );

  let closestText = '';
  let minDistance = Infinity;

  siblings.forEach(sibling => {
    if (sibling.type === 'text' && (sibling as any).data) {
      const text = (sibling as any).data.trim();
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
