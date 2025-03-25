import puppeteer, { Browser, Page } from 'puppeteer';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import logger from '../utils/logger';

export interface ScrapedContent {
  title: string;
  excerpt: string;
  content: string;
  html: string;
  url: string;
  metadata: Record<string, string>;
}

export interface ProductInfo {
  name: string;
  description: string;
  images: string[];
  price?: string;
  currency?: string;
  category?: string;
  specifications?: Record<string, string>;
  confidence: number;
}

export interface BusinessInfo {
  name: string;
  logo?: string;
  description?: string;
  location?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  socialMedia?: Record<string, string>;
  industries?: string[];
  confidence: number;
}

export class WebsiteExtractor {
  private browser: Browser | null = null;
  
  /**
   * Initialize the browser instance
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      logger.info('Initializing browser for website extraction');
      this.browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Extract the main content from a webpage
   */
  public async extractContent(url: string): Promise<ScrapedContent> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      logger.info(`Navigating to ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Extract metadata
      const metadata = await this.extractMetadata(page);
      
      // Get page content
      const html = await page.content();
      
      // Use Readability to extract main content
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (!article) {
        throw new Error('Failed to parse article content');
      }
      
      return {
        title: article.title,
        excerpt: article.excerpt || '',
        content: article.textContent,
        html: article.content,
        url,
        metadata
      };
    } catch (error) {
      logger.error(`Error extracting content from ${url}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Extract metadata from the page
   */
  private async extractMetadata(page: Page): Promise<Record<string, string>> {
    return page.evaluate(() => {
      const metadata: Record<string, string> = {};
      const metaTags = document.querySelectorAll('meta');
      
      metaTags.forEach(tag => {
        const name = tag.getAttribute('name') || tag.getAttribute('property');
        const content = tag.getAttribute('content');
        
        if (name && content) {
          metadata[name] = content;
        }
      });
      
      return metadata;
    });
  }

  /**
   * Extract product information from a webpage
   */
  public async extractProducts(url: string): Promise<ProductInfo[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      logger.info(`Extracting products from ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Common product selectors to try
      const products = await page.evaluate(() => {
        const extractedProducts: Array<Partial<ProductInfo>> = [];
        
        // Common product containers
        const productSelectors = [
          '.product', 
          '[data-product]', 
          '.product-item', 
          '.product-card',
          '.item', 
          '.product-container'
        ];
        
        // Try to find product containers
        for (const selector of productSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach(element => {
              // Extract product details
              const nameEl = element.querySelector('h2, h3, h4, .product-name, .product-title');
              const descEl = element.querySelector('.description, .product-description, p');
              const priceEl = element.querySelector('.price, .product-price');
              const imgEl = element.querySelector('img');
              
              const product: Partial<ProductInfo> = {
                name: nameEl?.textContent?.trim() || '',
                description: descEl?.textContent?.trim() || '',
                price: priceEl?.textContent?.trim() || '',
                images: imgEl ? [imgEl.getAttribute('src') || ''] : [],
              };
              
              // Only add if we have at least a name
              if (product.name) {
                extractedProducts.push(product);
              }
            });
            
            // If we found products with this selector, break
            if (extractedProducts.length > 0) {
              break;
            }
          }
        }
        
        return extractedProducts;
      });
      
      // Assign confidence scores based on completeness
      return products.map(product => {
        const completeProduct = product as ProductInfo;
        
        // Calculate confidence based on available fields
        let confidenceScore = 0.5; // Base confidence
        
        if (completeProduct.name) confidenceScore += 0.1;
        if (completeProduct.description && completeProduct.description.length > 20) confidenceScore += 0.1;
        if (completeProduct.images && completeProduct.images.length > 0) confidenceScore += 0.1;
        if (completeProduct.price) confidenceScore += 0.1;
        
        return {
          ...completeProduct,
          confidence: parseFloat(confidenceScore.toFixed(2))
        };
      });
    } catch (error) {
      logger.error(`Error extracting products from ${url}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Extract business information from a webpage
   */
  public async extractBusinessInfo(url: string): Promise<BusinessInfo> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      logger.info(`Extracting business info from ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const businessInfo = await page.evaluate(() => {
        // Extract name from title or header
        const nameElement = document.querySelector('h1, .company-name, .business-name, header h1, header h2');
        const name = nameElement?.textContent?.trim() || document.title.split('|')[0].trim();
        
        // Extract logo
        const logoElement = document.querySelector('header img, .logo img, .site-logo img');
        const logo = logoElement ? logoElement.getAttribute('src') : null;
        
        // Extract description
        const descriptionElement = document.querySelector('meta[name="description"]');
        const descFromMeta = descriptionElement ? descriptionElement.getAttribute('content') : null;
        
        const aboutElement = document.querySelector('.about, .about-us, #about, #about-us');
        const descFromAbout = aboutElement?.textContent?.trim();
        
        // Extract contact info
        const email = document.querySelector('a[href^="mailto:"]')?.getAttribute('href')?.replace('mailto:', '');
        const phone = document.querySelector('a[href^="tel:"]')?.getAttribute('href')?.replace('tel:', '');
        
        // Extract social media
        const socialMedia: Record<string, string> = {};
        const socialLinks = document.querySelectorAll('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"]');
        
        socialLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (href) {
            if (href.includes('facebook.com')) socialMedia['facebook'] = href;
            if (href.includes('twitter.com')) socialMedia['twitter'] = href;
            if (href.includes('instagram.com')) socialMedia['instagram'] = href;
            if (href.includes('linkedin.com')) socialMedia['linkedin'] = href;
          }
        });
        
        // Extract address
        const addressElement = document.querySelector('.address, .contact-address, address');
        const address = addressElement?.textContent?.trim();
        
        return {
          name,
          logo,
          description: descFromMeta || descFromAbout || '',
          contactInfo: {
            email,
            phone,
            address
          },
          socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : undefined
        };
      });
      
      // Calculate confidence based on fields extracted
      let confidenceScore = 0.5; // Base confidence
      
      if (businessInfo.name) confidenceScore += 0.1;
      if (businessInfo.logo) confidenceScore += 0.1;
      if (businessInfo.description) confidenceScore += 0.1;
      if (businessInfo.contactInfo?.email || businessInfo.contactInfo?.phone) confidenceScore += 0.1;
      if (businessInfo.socialMedia && Object.keys(businessInfo.socialMedia).length > 0) confidenceScore += 0.1;
      
      return {
        ...businessInfo,
        confidence: parseFloat(confidenceScore.toFixed(2))
      };
    } catch (error) {
      logger.error(`Error extracting business info from ${url}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }
}

export default new WebsiteExtractor();
