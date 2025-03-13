'use server';

/**
 * Web scraper service for extracting structured business information
 * from websites to reduce token usage in AI analysis
 */

import * as cheerio from 'cheerio';
import axios from 'axios';
import { parse as parseUrl } from 'url';
import { 
  WebsiteData, 
  ProductService, 
  ExportInfo, 
  ContactInfo, 
  Location,
  ScraperOptions 
} from '../models/website-data.model';

// Default scraper options
const DEFAULT_OPTIONS: ScraperOptions = {
  maxPages: 20,
  timeout: 10000, // 10 seconds
  followRobotsTxt: true,
  userAgent: 'TradeWizard-WebAnalyzer/1.0 (+https://tradewizard.com/bot)'
};

/**
 * Unified web scraper service
 */
export class WebScraperService {
  private cache: Map<string, { data: WebsiteData, timestamp: number }> = new Map();
  private cacheValidityMs = 24 * 60 * 60 * 1000; // 24 hours
  
  /**
   * Main function to scrape a website and extract business information
   */
  async scrapeWebsite(url: string, options: ScraperOptions = {}): Promise<WebsiteData> {
    // Normalize URL
    const normalizedUrl = this.normalizeUrl(url);
    
    // Check cache first
    const cachedData = this.getCachedData(normalizedUrl);
    if (cachedData) {
      console.log(`Using cached data for ${normalizedUrl}`);
      return cachedData;
    }
    
    // Merge default options with provided options
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    
    try {
      console.log(`Starting web scraping for ${normalizedUrl}`);
      
      // Map of URLs already visited
      const visitedUrls = new Set<string>();
      
      // Initialize website data
      const websiteData: WebsiteData = {
        url: normalizedUrl,
        scrapedAt: new Date(),
        businessName: '',
        description: '',
        products: [],
        services: [],
        certifications: [],
        exportInfo: {
          mentionedMarkets: [],
          exportStatements: []
        },
        contactInfo: {},
        locations: [],
        businessSizeIndicators: [],
        customerSegments: [],
        rawTextBySection: {}
      };
      
      // Start with the homepage
      await this.scrapePage(normalizedUrl, websiteData, visitedUrls, mergedOptions);
      
      // Try to find and scrape important pages
      const pagesToVisit = [
        '/about', '/about-us', '/company', '/products', '/services', 
        '/contact', '/contact-us', '/locations', '/global', '/international', 
        '/exports', '/clients', '/customers', '/certificates', '/certifications'
      ];
      
      const baseUrl = this.getBaseUrl(normalizedUrl);
      
      for (const page of pagesToVisit) {
        if (visitedUrls.size >= mergedOptions.maxPages!) break;
        
        const pageUrl = `${baseUrl}${page}`;
        if (!visitedUrls.has(pageUrl)) {
          try {
            await this.scrapePage(pageUrl, websiteData, visitedUrls, mergedOptions);
          } catch (error) {
            // Skip failed pages silently
            console.log(`Failed to scrape ${pageUrl}: ${error.message}`);
          }
        }
      }
      
      // Post-processing to clean and enhance data
      this.postProcessData(websiteData);
      
      // Cache the results
      this.cacheData(normalizedUrl, websiteData);
      
      console.log(`Completed scraping ${normalizedUrl}, found ${websiteData.products.length} products, ${websiteData.certifications.length} certifications`);
      
      return websiteData;
    } catch (error) {
      console.error(`Error scraping website ${url}:`, error);
      throw new Error(`Failed to scrape website: ${error.message}`);
    }
  }
  
  /**
   * Scrape a single page and update the website data
   */
  private async scrapePage(
    url: string, 
    websiteData: WebsiteData, 
    visitedUrls: Set<string>,
    options: ScraperOptions
  ): Promise<void> {
    // Mark as visited early to prevent loops
    visitedUrls.add(url);
    
    try {
      // Fetch the page content
      const response = await axios.get(url, {
        headers: { 'User-Agent': options.userAgent! },
        timeout: options.timeout
      });
      
      // Skip non-HTML responses
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        return;
      }
      
      // Load the HTML into cheerio
      const $ = cheerio.load(response.data);
      
      // Extract page title for context
      const pageTitle = $('title').text().trim();
      const pageType = this.identifyPageType(url, pageTitle, $);
      
      // Store raw text by section for AI processing if needed
      const bodyText = $('body').text().trim().replace(/\s+/g, ' ');
      websiteData.rawTextBySection![pageType] = bodyText;
      
      // Extract business name if not found yet
      if (!websiteData.businessName) {
        websiteData.businessName = this.extractBusinessName($, url);
      }
      
      // Extract data based on page type
      switch (pageType) {
        case 'homepage':
          this.extractHomePageData($, websiteData);
          break;
        case 'about':
          this.extractAboutPageData($, websiteData);
          break;
        case 'products':
          this.extractProductsData($, websiteData);
          break;
        case 'services':
          this.extractServicesData($, websiteData);
          break;
        case 'contact':
          this.extractContactData($, websiteData);
          break;
        case 'global':
          this.extractInternationalData($, websiteData);
          break;
        default:
          // For other pages, do general extraction
          this.extractGeneralData($, websiteData);
      }
      
      // Always look for these on any page
      this.extractCertifications($, websiteData);
      this.extractLocationData($, websiteData);
      this.extractExportInfo($, websiteData);
      this.extractContactInfo($, websiteData);
      
    } catch (error) {
      console.warn(`Error scraping page ${url}: ${error.message}`);
      // Continue with other pages
    }
  }
  
  /**
   * Identify the type of page based on URL and content
   */
  private identifyPageType(url: string, title: string, $: cheerio.CheerioAPI): string {
    const path = parseUrl(url).pathname || '';
    const lowerPath = path.toLowerCase();
    const lowerTitle = title.toLowerCase();
    
    if (path === '/' || path === '') return 'homepage';
    
    if (lowerPath.includes('about') || lowerTitle.includes('about us')) return 'about';
    if (lowerPath.includes('product') || lowerTitle.includes('product')) return 'products';
    if (lowerPath.includes('service') || lowerTitle.includes('service')) return 'services';
    if (lowerPath.includes('contact') || lowerTitle.includes('contact')) return 'contact';
    if (
      lowerPath.includes('international') || 
      lowerPath.includes('global') || 
      lowerPath.includes('export') || 
      lowerTitle.includes('global presence')
    ) return 'global';
    
    // Default to other
    return 'other';
  }
  
  /**
   * Helper functions for data extraction
   */
  
  // Extract business name
  private extractBusinessName($: cheerio.CheerioAPI, url: string): string {
    // Try logo alt text first
    const logoAlt = $('img[id*="logo"], img[class*="logo"], a[id*="logo"] img, a[class*="logo"] img').attr('alt');
    if (logoAlt && logoAlt.length > 2 && !logoAlt.toLowerCase().includes('logo')) {
      return logoAlt.trim();
    }
    
    // Try header/title
    const headerText = $('h1').first().text().trim();
    if (headerText && headerText.length > 2) {
      return headerText;
    }
    
    // Try site title
    const titleText = $('title').text().split('|')[0].split('-')[0].trim();
    if (titleText) {
      return titleText;
    }
    
    // Fallback to domain name
    const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  
  // Extract homepage data
  private extractHomePageData($: cheerio.CheerioAPI, websiteData: WebsiteData): void {
    // Extract description/tagline
    const metas = $('meta[name="description"], meta[property="og:description"]');
    metas.each((_, el) => {
      const content = $(el).attr('content');
      if (content && content.length > websiteData.description.length) {
        websiteData.description = content.trim();
      }
    });
    
    // If no meta description, try to get first paragraph
    if (!websiteData.description) {
      $('main p, #main p, .main p, body > p').slice(0, 3).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 50 && text.length < 300) {
          websiteData.description = text;
          return false; // break
        }
      });
    }
  }
  
  // Extract about page data
  private extractAboutPageData($: cheerio.CheerioAPI, websiteData: WebsiteData): void {
    // Look for year founded
    const content = $('body').text();
    
    // Look for year founded with regex
    const foundedRegex = /founded\s+in\s+(\d{4})|established\s+in\s+(\d{4})|since\s+(\d{4})/i;
    const foundedMatch = content.match(foundedRegex);
    if (foundedMatch) {
      const year = foundedMatch[1] || foundedMatch[2] || foundedMatch[3];
      websiteData.yearFounded = year;
    }
    
    // Look for team size indicators
    const teamSizeRegex = /(\d+(?:\+|\s*\+)?\s*employees|\d+(?:\+|\s*\+)?\s*staff|\d+(?:\+|\s*\+)?\s*team\s+members)/i;
    const teamSizeMatch = content.match(teamSizeRegex);
    if (teamSizeMatch) {
      websiteData.teamSize = teamSizeMatch[1];
      websiteData.businessSizeIndicators.push(teamSizeMatch[1]);
    }
    
    // Extract about text
    let aboutText = '';
    $('main p, #main p, .main p, section p').each((_, el) => {
      aboutText += $(el).text().trim() + ' ';
    });
    
    if (aboutText) {
      websiteData.about = aboutText.trim();
    }
  }
  
  // Extract product data
  private extractProductsData($: cheerio.CheerioAPI, websiteData: WebsiteData): void {
    // Look for product listings in common formats
    $('.product, [class*="product-item"], [class*="product-list"] > div, [class*="product-grid"] > div').each((_, el) => {
      const name = $(el).find('h2, h3, h4, .title, .name').first().text().trim();
      let description = $(el).find('p, .description').first().text().trim();
      
      // If description is too short, try to find more text
      if (description.length < 30) {
        description = $(el).text().replace(name, '').trim();
      }
      
      if (name) {
        const imageUrl = $(el).find('img').attr('src') || '';
        
        websiteData.products.push({
          name: name,
          description: description,
          images: imageUrl ? [imageUrl] : []
        });
      }
    });
    
    // If no products found, try a more general approach
    if (websiteData.products.length === 0) {
      $('h2, h3, h4').each((_, el) => {
        const name = $(el).text().trim();
        if (name && name.length > 3 && name.length < 60) {
          let description = '';
          let currentEl = $(el).next();
          
          // Try to find description in the next elements
          for (let i = 0; i < 3; i++) {
            if (currentEl.length && currentEl.is('p')) {
              description += currentEl.text().trim() + ' ';
              currentEl = currentEl.next();
            } else {
              break;
            }
          }
          
          if (description) {
            websiteData.products.push({
              name: name,
              description: description.trim()
            });
          }
        }
      });
    }
  }
  
  // Extract services data (similar to products)
  private extractServicesData($: cheerio.CheerioAPI, websiteData: WebsiteData): void {
    // Similar to product extraction but for services
    $('.service, [class*="service-item"], [class*="service-list"] > div').each((_, el) => {
      const name = $(el).find('h2, h3, h4, .title, .name').first().text().trim();
      let description = $(el).find('p, .description').first().text().trim();
      
      if (description.length < 30) {
        description = $(el).text().replace(name, '').trim();
      }
      
      if (name) {
        websiteData.services.push({
          name: name,
          description: description
        });
      }
    });
  }
  
  // Extract contact information
  private extractContactData($: cheerio.CheerioAPI, websiteData: WebsiteData): void {
    // Extract email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const bodyText = $('body').text();
    const emails = bodyText.match(emailRegex) || [];
    
    if (emails.length > 0) {
      // Filter out common fake emails used in examples
      const validEmails = emails.filter(email => 
        !email.includes('example.com') && 
        !email.includes('domain.com') &&
        !email.includes('yourcompany')
      );
      
      if (validEmails.length > 0) {
        const contactInfo = websiteData.contactInfo || {};
        contactInfo.email = validEmails[0]; // Use the first email found
        websiteData.contactInfo = contactInfo;
      }
    }
    
    // Extract phone numbers
    const phoneRegex = /(\+\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/g;
    const phones = bodyText.match(phoneRegex) || [];
    
    if (phones.length > 0) {
      const contactInfo = websiteData.contactInfo || {};
      contactInfo.phone = phones[0]; // Use the first phone found
      websiteData.contactInfo = contactInfo;
    }
    
    // Extract address
    $('address, .address, [itemtype*="PostalAddress"]').each((_, el) => {
      const addressText = $(el).text().trim().replace(/\s+/g, ' ');
      if (addressText.length > 10) {
        const contactInfo = websiteData.contactInfo || {};
        contactInfo.address = addressText;
        websiteData.contactInfo = contactInfo;
      }
    });
  }
  
  // Extract contact info from any page
  private extractContactInfo($: cheerio.CheerioAPI, websiteData: WebsiteData): void {
    // Only extract if we don't already have contact info
    if (!websiteData.contactInfo.email || !websiteData.contactInfo.phone) {
      this.extractContactData($, websiteData);
    }
    
    // Extract social media
    const socialMedia: {[key: string]: string} = {};
    
    $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="instagram.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        if (href.includes('facebook.com')) socialMedia.facebook = href;
        else if (href.includes('twitter.com')) socialMedia.twitter = href;
        else if (href.includes('linkedin.com')) socialMedia.linkedin = href;
        else if (href.includes('instagram.com')) socialMedia.instagram = href;
      }
    });
    
    if (Object.keys(socialMedia).length > 0) {
      const contactInfo = websiteData.contactInfo || {};
      contactInfo.socialMedia = socialMedia;
      websiteData.contactInfo = contactInfo;
    }
  }
  
  // Extract international/global presence data
  private extractInternationalData($: cheerio.CheerioAPI, websiteData: WebsiteData): void {
    // Look for statements about international business
    const bodyText = $('body').text();
    
    // Common export phrases
    const exportPhrases = [
      'we export to', 'exporting to', 'exported to', 'global presence', 
      'international markets', 'international presence', 'global markets',
      'export markets', 'overseas markets', 'foreign markets'
    ];
    
    // Check for export-related statements
    for (const phrase of exportPhrases) {
      const regex = new RegExp(`(${phrase}[^.]*\\.)`, 'gi');
      const matches = bodyText.match(regex);
      
      if (matches) {
        websiteData.exportInfo.exportStatements.push(...matches);
      }
    }
    
    // Extract country names
    const countries = [
      'UAE', 'United Arab Emirates', 'Dubai', 'UK', 'United Kingdom', 'Britain', 
      'England', 'USA', 'United States', 'America', 'Canada', 'Australia', 
      'Germany', 'France', 'Spain', 'Italy', 'Japan', 'China', 'India', 'Brazil',
      'South Africa', 'Kenya', 'Nigeria', 'Ghana', 'Egypt', 'Morocco', 'Europe',
      'Asia', 'Middle East', 'North America', 'South America', 'Africa'
    ];
    
    for (const country of countries) {
      const regex = new RegExp(`\\b${country}\\b`, 'gi');
      if (regex.test(bodyText)) {
        // Only add unique entries
        if (!websiteData.exportInfo.mentionedMarkets.includes(country)) {
          websiteData.exportInfo.mentionedMarkets.push(country);
        }
      }
    }
  }
  
  // Extract location data
  private extractLocationData($: cheerio.CheerioAPI, websiteData: WebsiteData): void {
    // Try to find location information
    $('.location, [class*="office-location"], [class*="branch"]').each((_, el) => {
      const locationText = $(el).text().trim();
      
      // Simple heuristic to determine location type
      let type: Location['type'] = 'office';
      const lowerText = locationText.toLowerCase();
      
      if (lowerText.includes('hq') || lowerText.includes('headquarters')) {
        type = 'headquarters';
      } else if (lowerText.includes('factory') || lowerText.includes('plant')) {
        type = 'factory';
      } else if (lowerText.includes('warehouse')) {
        type = 'warehouse';
      } else if (lowerText.includes('distribution')) {
        type = 'distribution';
      }
      
      // Try to extract country
      const lowerLocation = locationText.toLowerCase();
      const countries = [
        'UAE', 'UK', 'USA', 'Canada', 'Australia', 'Germany', 'France', 
        'Spain', 'Italy', 'Japan', 'China', 'India', 'Brazil', 'South Africa'
      ];
      
      let country = '';
      for (const c of countries) {
        if (lowerLocation.includes(c.toLowerCase())) {
          country = c;
          break;
        }
      }
      
      websiteData.locations.push({
        name: locationText.substring(0, 100), // Limit length
        type,
        country,
        address: locationText
      });
    });
  }
  
  // Extract certifications
  private extractCertifications($: cheerio.CheerioAPI, websiteData: WebsiteData): void {
    // Common certification terms
    const certTerms = [
      'ISO', 'HACCP', 'GMP', 'FDA', 'USDA', 'Organic', 'Fair Trade', 
      'Halal', 'Kosher', 'CE', 'REACH', 'RoHS', 'FSSC', 'BRC', 'IFS', 
      'GlobalGAP', 'Sedex', 'QS', 'EU Organic', 'GOTS', 'Certified'
    ];
    
    // Look for certifications in text
    const bodyText = $('body').text();
    
    for (const cert of certTerms) {
      const regex = new RegExp(`\\b${cert}\\b[\\s-]?\\d*`, 'g');
      const matches = bodyText.match(regex);
      
      if (matches) {
        // Add only unique certifications
        for (const match of matches) {
          if (!websiteData.certifications.includes(match)) {
            websiteData.certifications.push(match);
          }
        }
      }
    }
    
    // Also look for specific certification images
    $('img[alt*="certification"], img[alt*="certified"], img[alt*="ISO"], img[alt*="certificate"]').each((_, el) => {
      const alt = $(el).attr('alt');
      if (alt && !websiteData.certifications.includes(alt)) {
        websiteData.certifications.push(alt);
      }
    });
  }
  
  // Extract export info from any page
  private extractExportInfo($: cheerio.CheerioAPI, websiteData: WebsiteData): void {
    const bodyText = $('body').text();
    
    // Look for customer segments
    const segmentTerms = [
      'B2B', 'B2C', 'business to business', 'business to consumer',
      'wholesale', 'retail', 'distributor', 'manufacturer', 'supplier',
      'industrial', 'commercial', 'consumer', 'end user'
    ];
    
    for (const term of segmentTerms) {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      if (regex.test(bodyText) && !websiteData.customerSegments.includes(term)) {
        websiteData.customerSegments.push(term);
      }
    }
  }
  
  // Extract general data from any page
  private extractGeneralData($: cheerio.CheerioAPI, websiteData: WebsiteData): void {
    // This is a catch-all for any page that doesn't fit into specific categories
    
    // Look for business size indicators
    const bodyText = $('body').text();
    
    const sizeIndicators = [
      /(\d+)\s+employees/i,
      /team\s+of\s+(\d+)/i,
      /staff\s+of\s+(\d+)/i,
      /(\d+)\s+offices/i,
      /(\d+)\s+locations/i,
      /annual\s+revenue\s+of\s+[\$£€](\d+\s*[kmbt])/i,
      /turnover\s+of\s+[\$£€](\d+\s*[kmbt])/i
    ];
    
    for (const regex of sizeIndicators) {
      const match = bodyText.match(regex);
      if (match && match[0]) {
        websiteData.businessSizeIndicators.push(match[0]);
      }
    }
  }
  
  /**
   * Post-process data to clean and enhance
   */
  private postProcessData(data: WebsiteData): void {
    // Remove duplicates
    data.certifications = [...new Set(data.certifications)];
    data.exportInfo.mentionedMarkets = [...new Set(data.exportInfo.mentionedMarkets)];
    data.exportInfo.exportStatements = [...new Set(data.exportInfo.exportStatements)];
    data.businessSizeIndicators = [...new Set(data.businessSizeIndicators)];
    data.customerSegments = [...new Set(data.customerSegments)];
    
    // Check if any products are actually services or vice versa
    const serviceTerms = ['service', 'support', 'assistance', 'consulting', 'solution'];
    
    // Move misclassified products to services
    for (let i = data.products.length - 1; i >= 0; i--) {
      const product = data.products[i];
      const isService = serviceTerms.some(term => 
        product.name.toLowerCase().includes(term) || 
        product.description.toLowerCase().includes(`${term} for `)
      );
      
      if (isService) {
        data.services.push(product);
        data.products.splice(i, 1);
      }
    }
    
    // Deduplicate location data
    const locationMap = new Map<string, Location>();
    data.locations.forEach(location => {
      locationMap.set(location.name, location);
    });
    
    data.locations = Array.from(locationMap.values());
    
    // Determine customer segments if none were explicitly found
    if (data.customerSegments.length === 0) {
      const allText = Object.values(data.rawTextBySection || {}).join(' ');
      
      if (allText.includes('wholesale') || allText.includes('retailer')) {
        data.customerSegments.push('B2B');
      }
      
      if (allText.includes('consumer') || allText.includes('customer') || 
          allText.includes('shop now') || allText.includes('buy now')) {
        data.customerSegments.push('B2C');
      }
    }
  }
  
  /**
   * Cache management functions
   */
  private getCachedData(url: string): WebsiteData | null {
    const cached = this.cache.get(url);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.cacheValidityMs) {
      return cached.data;
    }
    
    return null;
  }
  
  private cacheData(url: string, data: WebsiteData): void {
    this.cache.set(url, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * URL helper functions
   */
  private normalizeUrl(url: string): string {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    return url;
  }
  
  private getBaseUrl(url: string): string {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  }
}

// Export singleton instance
export const webScraperService = new WebScraperService();
export default webScraperService; 