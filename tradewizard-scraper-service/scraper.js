const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('./logger');
const domProductDetector = require('./dom-product-detector');
const llmProductAnalyzer = require('./llm-product-analyzer');
const hybridProductDetector = require('./hybrid-product-detector');
const crawler = require('./crawler');
const pageExtractor = require('./page-extractor');
const supabaseService = require('./supabase-service');
const enhancedLlmAnalyzer = require('./enhanced-llm-analyzer');

// Define timeout for requests
const TIMEOUT = 30000; // 30 seconds

/**
 * Scrape a website to extract business information and products
 * @param {string} url - The website URL to scrape
 * @param {Object} options - Scraping options
 * @returns {Promise<Object>} - Scraped data
 */
async function scrapeWebsite(url, options = {}) {
  const startTime = Date.now();
  const scraperOptions = {
    maxPages: options.maxPages || 10,
    maxDepth: options.maxDepth || 3,
    useCache: options.useCache !== false,
    forceFresh: options.forceFresh === true,
    cacheMaxAge: options.cacheMaxAge || 7 * 24 * 60 * 60, // Default to 7 days
    ...options
  };
  
  logger.info(`Starting scrape of ${url}`, { options: scraperOptions });
  
  // Format the URL properly
  const formattedUrl = formatUrl(url);
  
  // Create a scrape job if Supabase is available
  let jobId = null;
  if (supabaseService.initSupabase()) {
    jobId = await supabaseService.createScrapeJob(formattedUrl, scraperOptions);
    if (jobId) {
      logger.info(`Created scrape job ${jobId} for ${formattedUrl}`);
    }
  }
  
  try {
    // Check if we have cached data in Supabase
    if (scraperOptions.useCache && !scraperOptions.forceFresh) {
      const cachedData = await supabaseService.getCachedData(formattedUrl);
      
      if (cachedData) {
        logger.info(`Using cached data for ${formattedUrl}`, { 
          lastScraped: cachedData.last_scraped 
        });
        
        // Update job status if available
        if (jobId) {
          await supabaseService.updateScrapeJob(jobId, 'completed', { usedCache: true });
        }
        
        return {
          ...cachedData.full_data,
          dataSource: 'cache',
          lastUpdated: cachedData.last_scraped
        };
      }
    }
    
    // Update job status if available
    if (jobId) {
      await supabaseService.updateScrapeJob(jobId, 'in-progress');
    }
    
    // If no cache hit, proceed with crawling
    const pageData = await crawler.crawlWebsite(formattedUrl, {
      maxPages: scraperOptions.maxPages,
      maxDepth: scraperOptions.maxDepth
    });
    
    if (!pageData || !pageData.pages || pageData.pages.length === 0) {
      logger.warn(`No pages could be crawled for ${formattedUrl}`);
      
      const errorResult = {
        businessName: "Unknown Business",
        businessSize: "unknown",
        description: "",
        productCategories: [],
        productDetails: [],
        customerSegments: [],
        certifications: [],
        geographicPresence: [],
        exportMarkets: [],
        exportReadiness: 0,
        dataSource: 'error',
        error: 'Failed to crawl website'
      };
      
      // Update job status if available
      if (jobId) {
        await supabaseService.updateScrapeJob(jobId, 'failed', { 
          error: 'Failed to crawl website' 
        });
      }
      
      return errorResult;
    }
    
    // Extract data from pages
    logger.info(`Extracting data from ${pageData.pages.length} pages`);
    const extractedData = extractDataFromPages(pageData);
    
    // Detect products using the hybrid approach
    logger.info(`Starting hybrid product detection for ${formattedUrl}`);
    const detectedProducts = await hybridProductDetector.detectProducts(formattedUrl, pageData);
    
    // Use enhanced LLM analyzer to get better business information
    logger.info(`Extracting enhanced business info using LLM for ${formattedUrl}`);
    const enhancedBusinessInfo = await enhancedLlmAnalyzer.extractBusinessInfo({
      pages: pageData,
      url: formattedUrl
    });
    
    // Analyze export readiness
    logger.info(`Analyzing export readiness for ${formattedUrl}`);
    const exportReadinessAnalysis = await enhancedLlmAnalyzer.analyzeExportReadiness({
      pages: pageData,
      businessInfo: enhancedBusinessInfo,
      products: detectedProducts
    });
    
    // Combine all the data
    const result = {
      url: formattedUrl,
      businessName: enhancedBusinessInfo?.businessName || extractedData.businessName || "Unknown Business",
      businessSize: enhancedBusinessInfo?.businessSize || extractedData.businessSize || "unknown",
      description: enhancedBusinessInfo?.description || extractedData.description || "",
      foundedYear: enhancedBusinessInfo?.foundedYear || extractedData.foundedYear,
      employeeCount: enhancedBusinessInfo?.employeeCount || extractedData.employeeCount,
      productCategories: detectedProducts.categories || extractedData.productCategories || [],
      productDetails: detectedProducts.products || [],
      customerSegments: enhancedBusinessInfo?.customerSegments || extractedData.customerSegments || [],
      certifications: enhancedBusinessInfo?.certifications || extractedData.certifications || [],
      geographicPresence: enhancedBusinessInfo?.locations || extractedData.locations || [],
      exportMarkets: exportReadinessAnalysis?.exportMarkets || enhancedBusinessInfo?.exportMarkets || [],
      exportReadiness: exportReadinessAnalysis?.exportReadiness || 0,
      strengths: exportReadinessAnalysis?.strengths || [],
      weaknesses: exportReadinessAnalysis?.weaknesses || [],
      recommendations: exportReadinessAnalysis?.recommendations || [],
      industries: enhancedBusinessInfo?.industries || [],
      dataSource: 'fresh',
      lastUpdated: new Date().toISOString(),
      
      // Add crawl metadata
      crawlStats: {
        pagesVisited: pageData.pages.length,
        pageTypes: pageData.pageTypes || {},
        timeMs: Date.now() - startTime
      }
    };
    
    // Store the data in Supabase
    if (supabaseService.initSupabase()) {
      logger.info(`Saving scraped data for ${formattedUrl} to database`);
      await supabaseService.saveScrapedData(formattedUrl, result);
    }
    
    // Update job status if available
    if (jobId) {
      await supabaseService.updateScrapeJob(jobId, 'completed', { 
        pagesVisited: pageData.pages.length,
        productsFound: detectedProducts.products.length,
        timeMs: Date.now() - startTime
      });
    }
    
    const endTime = Date.now();
    logger.info(`Scraping completed for ${formattedUrl} in ${endTime - startTime}ms`);
    
    return result;
  } catch (error) {
    logger.error(`Error scraping ${formattedUrl}`, { error: error.message, stack: error.stack });
    
    // Update job status if available
    if (jobId) {
      await supabaseService.updateScrapeJob(jobId, 'failed', { error: error.message });
    }
    
    return {
      url: formattedUrl,
      businessName: "Unknown Business",
      businessSize: "unknown",
      description: "",
      productCategories: [],
      productDetails: [],
      customerSegments: [],
      certifications: [],
      geographicPresence: [],
      exportReadiness: 0,
      dataSource: 'error',
      error: error.message,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Ensure URL has proper format
 */
function formatUrl(url) {
  if (!url.startsWith('http') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

/**
 * Extract business name from website
 */
function extractBusinessName($) {
  // Look for common business name locations
  let name = $('title').text().split('|')[0].trim();
  
  // Try other common elements if title isn't specific enough
  if (name.includes('Home') || name.length > 30) {
    const logoAlt = $('img[alt][src*="logo"]').attr('alt');
    if (logoAlt && logoAlt.length < 30) {
      name = logoAlt;
    } else {
      // Try to find company name in header
      name = $('header h1, .header h1, .logo-text, .brand').first().text().trim();
    }
  }
  
  return name || 'Unknown Business';
}

/**
 * Extract business description
 */
function extractDescription($) {
  // Look for meta description
  let description = $('meta[name="description"]').attr('content') || '';
  
  // Look for about us content
  const aboutContent = $('section:contains("About"), div:contains("About Us"), #about, .about')
    .find('p')
    .map((i, el) => $(el).text().trim())
    .get()
    .join(' ');
  
  if (aboutContent.length > description.length) {
    description = aboutContent;
  }
  
  // Look for main content if still empty
  if (description.length < 50) {
    description = $('main p, .main p, #content p')
      .slice(0, 3)
      .map((i, el) => $(el).text().trim())
      .get()
      .join(' ');
  }
  
  return description;
}

/**
 * Extract products or services using advanced detection patterns
 */
function extractProducts($) {
  const products = [];
  const detectedProducts = new Map(); // Use map to prevent duplicates
  
  // Define list of common navigation and UI elements to exclude
  const excludeTerms = [
    'click', 'watch', 'view', 'read', 'learn', 'explore', 'menu', 'navigation',
    'submit', 'login', 'register', 'contact', 'about', 'more', 'details',
    'cart', 'search', 'home', 'sign up', 'sign in', 'subscribe'
  ];
  
  // 1. Look for specific product names by splitting compound titles
  $('h1, h2, h3, .title, .product-title').each((i, el) => {
    const text = $(el).text().trim();
    
    // Check for titles that might contain multiple products
    if (text.includes(' And ') || text.includes(' & ') || text.includes(',')) {
      const parts = text.split(/\s+(?:And|&|,)\s+/);
      
      for (const part of parts) {
        const cleanName = part.trim().replace(/Order\s+Your\s+|Today$|Get\s+|Buy\s+/gi, '');
        
        // Skip if name is in exclude list or too short
        const nameLower = cleanName.toLowerCase();
        if (excludeTerms.some(term => nameLower === term || nameLower.startsWith(term + ' '))) {
          continue;
        }
        
        if (cleanName && cleanName.length > 3 && cleanName.length < 50 && !detectedProducts.has(cleanName.toLowerCase())) {
          const nearbyText = $(el).next('p, .description').text().trim();
          
          detectedProducts.set(cleanName.toLowerCase(), {
            name: cleanName,
            description: nearbyText || '',
            confidence: 'medium'
          });
        }
      }
    }
  });
  
  // 2. Pattern 1: Standard product containers
  $('div.product, .product-item, article.product, .item, .service-item, section.products, section.services, [class*="product-"], [class*="item-"], [class*="service-"], [id*="product-"]')
    .each((i, el) => {
      const $el = $(el);
      const name = $el.find('h2, h3, h4, .title, .name, .product-title, .product-name').first().text().trim();
      let description = $el.find('p, .description, .product-description, .summary, .details').first().text().trim();
      
      const cleanName = name.replace(/Order\s+Your\s+|Today$|Get\s+|Buy\s+/gi, '');
      const nameLower = cleanName.toLowerCase();
      
      // Skip if name is in exclude list or too short
      if (excludeTerms.some(term => nameLower === term || nameLower.startsWith(term + ' '))) {
        return;
      }
      
      if (cleanName && cleanName.length > 3 && !detectedProducts.has(cleanName.toLowerCase())) {
        detectedProducts.set(cleanName.toLowerCase(), {
          name: cleanName,
          description: description || '',
          confidence: 'high'
        });
      }
    });
  
  // 3. Pattern 2: Product listings with prices (common e-commerce pattern)
  $('*').filter(function() {
    const text = $(this).text();
    // Look for price patterns near product-like elements
    return /\$\s?\d+(\.\d{2})?|\d+\s?USD|\d+\s?EUR|\d+\s?GBP|€\s?\d+|£\s?\d+/i.test(text);
  }).each((i, el) => {
    const $el = $(el);
    const $parent = $el.parent();
    const $container = $parent.parent(); // Go up two levels to find the product container
    
    const name = $container.find('h2, h3, h4, .title, .name, strong, b').first().text().trim() ||
                 $parent.find('h2, h3, h4, .title, .name, strong, b').first().text().trim();
    
    const description = $container.find('p, .description, .summary').first().text().trim() ||
                        $parent.find('p, .description, .summary').first().text().trim();
    
    const cleanName = name.replace(/Order\s+Your\s+|Today$|Get\s+|Buy\s+/gi, '');
    const nameLower = cleanName.toLowerCase();
    
    // Skip if name is in exclude list or too short
    if (excludeTerms.some(term => nameLower === term || nameLower.startsWith(term + ' '))) {
      return;
    }
    
    if (cleanName && cleanName.length > 3 && !detectedProducts.has(cleanName.toLowerCase())) {
      detectedProducts.set(cleanName.toLowerCase(), {
        name: cleanName,
        description: description || '',
        confidence: 'medium'
      });
    }
  });
  
  // 4. Pattern 3: Detection by product headings and their following content
  $('h2:contains("Product"), h2:contains("Service"), h3:contains("Product"), h3:contains("Service"), h4:contains("Product"), h4:contains("Service"), h2:contains("Offering"), h3:contains("Offering")')
    .each((i, el) => {
      const $el = $(el);
      let name = $el.text().trim();
      
      // Avoid too generic names by looking for more specific sub-headings
      const subHeadings = $el.nextUntil('h2, h3').filter('h4, h5');
      
      if (subHeadings.length > 0) {
        // Process sub-headings as individual products
        subHeadings.each((j, subEl) => {
          const subName = $(subEl).text().trim();
          const subSection = $(subEl).nextUntil('h2, h3, h4, h5');
          const subDescription = subSection.filter('p').first().text().trim();
          
          const cleanName = subName.replace(/Order\s+Your\s+|Today$|Get\s+|Buy\s+/gi, '');
          const nameLower = cleanName.toLowerCase();
          
          // Skip if name is in exclude list or too short
          if (excludeTerms.some(term => nameLower === term || nameLower.startsWith(term + ' '))) {
            return;
          }
          
          if (cleanName && !detectedProducts.has(cleanName.toLowerCase()) && cleanName.length > 3) {
            detectedProducts.set(cleanName.toLowerCase(), {
              name: cleanName,
              description: subDescription || '',
              confidence: 'medium'
            });
          }
        });
      } else {
        // Use the heading itself as a product if specific enough
        name = name.replace(/Products|Services|Offerings/i, '').trim();
        
        if (name.length > 30) name = name.substring(0, 30); // Truncate overly long names
        const cleanName = name.replace(/Order\s+Your\s+|Today$|Get\s+|Buy\s+/gi, '');
        const nameLower = cleanName.toLowerCase();
        
        // Skip if name is in exclude list or too short
        if (excludeTerms.some(term => nameLower === term || nameLower.startsWith(term + ' '))) {
          return;
        }
        
        const section = $el.nextUntil('h2, h3');
        const description = section.filter('p').first().text().trim();
        
        if (cleanName && !detectedProducts.has(cleanName.toLowerCase()) && 
            !/^products$/i.test(cleanName) && !/^services$/i.test(cleanName) && 
            cleanName.length > 3) {
          detectedProducts.set(cleanName.toLowerCase(), {
            name: cleanName,
            description: description || '',
            confidence: 'medium'
          });
        }
      }
    });
  
  // Convert Map to Array
  for (const product of detectedProducts.values()) {
    products.push(product);
  }
  
  return products;
}

/**
 * Extract certifications
 */
function extractCertifications($) {
  const certifications = [];
  const certificationRegex = /ISO\s*\d+|HACCP|GMP|FDA|FSSC|GLOBALG\.A\.P|BRC|REACH|CE|HALAL|KOSHER|ORGANIC|FAIRTRADE/gi;
  
  // Search in all text content
  const pageText = $('body').text();
  let match;
  
  while ((match = certificationRegex.exec(pageText)) !== null) {
    if (!certifications.includes(match[0])) {
      certifications.push(match[0]);
    }
  }
  
  // Also look for images with certification names
  $('img[alt*="certification"], img[alt*="certified"], img[alt*="ISO"], img[src*="cert"]').each((i, el) => {
    const alt = $(el).attr('alt') || '';
    if (alt && !certifications.includes(alt)) {
      certifications.push(alt);
    }
  });
  
  return certifications;
}

/**
 * Extract export mentions
 */
function extractExportMentions($) {
  const exportMentions = [];
  const exportRegex = /export|international|global|worldwide|overseas|foreign market|ship (to|worldwide)|distribut(e|ion) (to|worldwide)/gi;
  
  // Find paragraphs mentioning exports
  $('p, li, div').each((i, el) => {
    const text = $(el).text().trim();
    if (exportRegex.test(text)) {
      exportMentions.push(text);
    }
  });
  
  return exportMentions;
}

/**
 * Extract contact information
 */
function extractContactInfo($) {
  const contactInfo = {
    email: '',
    phone: '',
    address: ''
  };
  
  // Extract email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const pageText = $('body').text();
  const emails = pageText.match(emailRegex) || [];
  
  if (emails.length > 0) {
    contactInfo.email = emails[0];
  }
  
  // Extract phone numbers
  const phoneRegex = /\+\d{1,4}\s?[\d\s]{7,14}|\(\d{2,4}\)\s?[\d\s]{7,10}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = pageText.match(phoneRegex) || [];
  
  if (phones.length > 0) {
    contactInfo.phone = phones[0];
  }
  
  // Extract address
  $('address, .address, .contact-address, div:contains("Address:")').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10) {
      contactInfo.address = text;
    }
  });
  
  return contactInfo;
}

/**
 * Extract business locations
 */
function extractLocations($) {
  const locations = [];
  
  // Common South African cities
  const saLocations = [
    'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 
    'Bloemfontein', 'East London', 'Pietermaritzburg', 'Stellenbosch',
    'South Africa', 'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape'
  ];
  
  // Common target export markets
  const exportMarkets = ['UAE', 'Dubai', 'Abu Dhabi', 'USA', 'United States', 'UK', 'United Kingdom', 'London'];
  
  const allLocations = [...saLocations, ...exportMarkets];
  const pageText = $('body').text();
  
  allLocations.forEach(location => {
    if (pageText.includes(location) && !locations.includes(location)) {
      locations.push(location);
    }
  });
  
  return locations;
}

/**
 * Detect industry sectors
 */
function detectIndustries($) {
  const pageText = $('body').text().toLowerCase();
  const industries = [];
  
  // Industry keywords
  const industryKeywords = {
    'food_processing': ['food', 'beverage', 'agro', 'farm', 'agricultural', 'fruit', 'vegetable', 'meat', 'dairy'],
    'textiles': ['textile', 'clothing', 'apparel', 'fabric', 'fashion', 'garment', 'wear'],
    'home_goods': ['furniture', 'decor', 'home', 'household', 'kitchen', 'interior', 'craft'],
    'health_products': ['health', 'beauty', 'wellness', 'cosmetic', 'vitamin', 'supplement', 'pharmaceutical']
  };
  
  // Check for industry keywords
  Object.entries(industryKeywords).forEach(([industry, keywords]) => {
    for (const keyword of keywords) {
      if (pageText.includes(keyword)) {
        industries.push(industry);
        break;
      }
    }
  });
  
  return industries;
}

/**
 * Categorize products into industry categories
 * @param {Array} products - Extracted products
 * @returns {Array} - Categories
 */
function categorizeProducts(products) {
  if (!products || products.length === 0) {
    return [];
  }
  
  const categories = new Set();
  const productNames = products.map(p => p.name.toLowerCase());
  const productDescriptions = products.map(p => p.description.toLowerCase());
  const combinedText = [...productNames, ...productDescriptions].join(' ');
  
  // Industry-specific keyword patterns
  const categoryPatterns = [
    { category: 'Food & Beverage', keywords: ['food', 'beverage', 'drink', 'snack', 'meal', 'fruit', 'vegetable', 'meat', 'fish', 'dairy', 'cheese', 'milk', 'juice', 'water', 'coffee', 'tea', 'wine', 'beer', 'alcohol', 'restaurant', 'catering', 'bakery', 'organic', 'fresh', 'frozen', 'canned', 'processed', 'ready-to-eat', 'dessert', 'chocolate', 'sugar', 'sweet', 'savory'] },
    { category: 'Electronics', keywords: ['electronic', 'device', 'gadget', 'computer', 'laptop', 'desktop', 'server', 'phone', 'smartphone', 'tablet', 'camera', 'tv', 'television', 'audio', 'speaker', 'headphone', 'gaming', 'console', 'battery', 'charger', 'cable', 'adapter', 'peripheral', 'hardware', 'software', 'appliance'] },
    { category: 'Fashion & Apparel', keywords: ['clothing', 'apparel', 'fashion', 'wear', 'garment', 'dress', 'shirt', 'pant', 'trouser', 'skirt', 'jacket', 'coat', 'suit', 'uniform', 'shoe', 'footwear', 'accessory', 'bag', 'purse', 'wallet', 'jewelry', 'watch', 'belt', 'hat', 'cap', 'scarf', 'glove', 'sock', 'underwear', 'lingerie', 'sportswear', 'activewear', 'swimwear'] },
    { category: 'Home & Furniture', keywords: ['furniture', 'home', 'house', 'interior', 'décor', 'decoration', 'kitchen', 'bathroom', 'bedroom', 'living room', 'dining room', 'office', 'outdoor', 'garden', 'patio', 'table', 'chair', 'sofa', 'couch', 'bed', 'mattress', 'cabinet', 'shelf', 'storage', 'lamp', 'lighting', 'curtain', 'blind', 'rug', 'carpet', 'tile', 'appliance'] },
    { category: 'Health & Beauty', keywords: ['health', 'beauty', 'personal care', 'skincare', 'skin care', 'haircare', 'hair care', 'makeup', 'cosmetic', 'fragrance', 'perfume', 'cologne', 'soap', 'shampoo', 'conditioner', 'lotion', 'cream', 'oil', 'serum', 'mask', 'treatment', 'spa', 'wellness', 'vitamin', 'supplement', 'medicine', 'medical', 'pharmacy', 'drug', 'herbal', 'natural'] },
    { category: 'Automotive', keywords: ['auto', 'automotive', 'car', 'vehicle', 'truck', 'motorcycle', 'bike', 'bicycle', 'scooter', 'part', 'accessory', 'tire', 'wheel', 'engine', 'battery', 'oil', 'fluid', 'repair', 'maintenance', 'tool', 'equipment', 'gps', 'navigation', 'audio', 'stereo', 'electric', 'hybrid', 'diesel', 'gasoline'] },
    { category: 'Sports & Outdoors', keywords: ['sport', 'outdoor', 'fitness', 'exercise', 'gym', 'training', 'workout', 'equipment', 'gear', 'apparel', 'clothing', 'shoe', 'footwear', 'ball', 'racket', 'bat', 'glove', 'protection', 'helmet', 'camping', 'hiking', 'hunting', 'fishing', 'water sport', 'swimming', 'cycling', 'running', 'golf', 'tennis', 'basketball', 'football', 'soccer', 'baseball'] },
    { category: 'Toys & Games', keywords: ['toy', 'game', 'play', 'puzzle', 'board game', 'card game', 'video game', 'console', 'doll', 'action figure', 'plush', 'stuffed', 'construction', 'building', 'educational', 'learning', 'creative', 'art', 'craft', 'outdoor play', 'sport', 'ride-on', 'vehicle', 'remote control', 'rc', 'electronic', 'interactive', 'baby', 'toddler', 'kid', 'child'] },
    { category: 'Business Services', keywords: ['service', 'consulting', 'consultant', 'advisor', 'business', 'corporate', 'commercial', 'enterprise', 'company', 'firm', 'agency', 'bureau', 'office', 'management', 'administration', 'finance', 'accounting', 'tax', 'legal', 'law', 'marketing', 'advertising', 'pr', 'public relation', 'human resource', 'hr', 'recruitment', 'staffing', 'training', 'coaching', 'development'] },
    { category: 'Technology', keywords: ['tech', 'technology', 'software', 'app', 'application', 'program', 'system', 'platform', 'solution', 'it', 'information technology', 'data', 'cloud', 'saas', 'service', 'web', 'website', 'internet', 'online', 'digital', 'computer', 'mobile', 'ai', 'artificial intelligence', 'ml', 'machine learning', 'automation', 'blockchain', 'iot', 'internet of things'] },
    { category: 'Agriculture', keywords: ['agriculture', 'agricultural', 'farming', 'farm', 'crop', 'plant', 'seed', 'grain', 'fruit', 'vegetable', 'livestock', 'animal', 'cattle', 'poultry', 'dairy', 'organic', 'fertilizer', 'pesticide', 'herbicide', 'equipment', 'machinery', 'tool', 'irrigation', 'harvest', 'processing', 'production', 'cultivation', 'greenhouse', 'soil'] },
    { category: 'Industrial & Manufacturing', keywords: ['industrial', 'industry', 'manufacturing', 'manufacture', 'factory', 'plant', 'production', 'processing', 'fabrication', 'assembly', 'machinery', 'equipment', 'tool', 'part', 'component', 'material', 'raw material', 'metal', 'plastic', 'rubber', 'glass', 'textile', 'chemical', 'construction', 'building', 'engineering', 'design', 'automation', 'robotic'] }
  ];
  
  // Check for each category
  for (const { category, keywords } of categoryPatterns) {
    for (const keyword of keywords) {
      if (combinedText.includes(keyword)) {
        categories.add(category);
        break; // Once we match a category, we don't need to check more keywords for it
      }
    }
  }
  
  // If no categories detected, try to identify from business name/description
  if (categories.size === 0) {
    // Default to generic categories based on broader analysis
    const genericCategories = ['Products', 'Services'];
    return genericCategories;
  }
  
  return Array.from(categories);
}

/**
 * Estimate business size based on website complexity and content
 */
function estimateBusinessSize($) {
  // Count indicators of business size
  let sizeScore = 0;
  
  // Check number of pages (more pages suggests larger business)
  const menuItemCount = $('nav a, .menu a, .navigation a').length;
  if (menuItemCount > 15) sizeScore += 3;
  else if (menuItemCount > 8) sizeScore += 2;
  else if (menuItemCount > 4) sizeScore += 1;
  
  // Check for careers/jobs page (larger businesses typically have this)
  if ($('a:contains("Career"), a:contains("Jobs"), a:contains("Join us")').length > 0) {
    sizeScore += 2;
  }
  
  // Check for international presence
  if ($('body').text().match(/locations|offices|worldwide|international|global/i)) {
    sizeScore += 2;
  }
  
  // Check for enterprise terms
  if ($('body').text().match(/enterprise|corporate|industrial|manufacturing/i)) {
    sizeScore += 2;
  }
  
  // Parse business size based on score
  if (sizeScore >= 6) return 'large';
  if (sizeScore >= 3) return 'medium';
  return 'small';
}

/**
 * Identify customer segments
 */
function identifyCustomerSegments($) {
  const segments = [];
  const bodyText = $('body').text().toLowerCase();
  
  // B2B indicators
  if (bodyText.match(/b2b|business to business|wholesale|distributor|enterprise|corporate/i)) {
    segments.push('B2B');
  }
  
  // B2C indicators
  if (bodyText.match(/b2c|consumer|retail|shop|buy now|cart|checkout/i)) {
    segments.push('B2C');
  }
  
  // Industry specific segments
  if (bodyText.match(/manufacturer|industrial|factory/i)) {
    segments.push('Manufacturers');
  }
  
  if (bodyText.match(/retailer|shop|store/i)) {
    segments.push('Retailers');
  }
  
  // Default segment if none found
  if (segments.length === 0) {
    segments.push('Unknown');
  }
  
  return segments;
}

/**
 * Calculate export readiness score (0-100)
 */
function calculateExportReadiness($) {
  let score = 50; // Start at midpoint
  const body = $('body').text();
  
  // Check for international mentions
  if (body.match(/international|global|export|worldwide/i)) score += 10;
  
  // Check for certifications
  const certifications = extractCertifications($);
  if (certifications.length > 0) score += 10;
  if (certifications.length > 3) score += 5;
  
  // Check for multiple languages or currency options
  if ($('a[href*="lang"], select:contains("Language"), a:contains("English"), a:contains("Español")').length > 0) {
    score += 10;
  }
  
  // Check for shipping info
  if (body.match(/shipping|delivery|worldwide shipping|international shipping/i)) {
    score += 5;
  }
  
  // Check for contact info
  const contactInfo = extractContactInfo($);
  if (contactInfo.email && contactInfo.phone) score += 5;
  
  // Check for professional website
  if ($('a[href*="linkedin"], a[href*="twitter"], a[href*="facebook"]').length > 0) {
    score += 5;
  }
  
  // Cap score between 0-100
  return Math.min(100, Math.max(0, score));
}

/**
 * Consolidates business data from multiple pages into a single profile
 * @param {Object} pageData - Data extracted from each page
 * @param {string} startUrl - The starting URL
 * @returns {Object} - Consolidated business data
 */
function consolidateBusinessData(pageData, startUrl) {
  // Initialize with default structure
  const consolidatedData = {
    url: startUrl,
    businessName: 'Unknown Business',
    description: '',
    products: [],
    certifications: [],
    contactInfo: {
      emails: [],
      phones: [],
      addresses: [],
      socialMedia: []
    },
    geographicPresence: [],
    businessSize: 'small', // Default size
    customerSegments: [],
    exportMarkets: [],
    productCategories: []
  };
  
  let aboutPageData = null;
  let homePageData = null;
  let productsPagesData = [];
  let contactPageData = null;
  let certificationsPageData = null;
  let exportPageData = null;
  
  // Group pages by type for processing priority
  for (const page of Object.values(pageData)) {
    if (page.pageType === 'home') homePageData = page;
    else if (page.pageType === 'about') aboutPageData = page;
    else if (page.pageType === 'products') productsPagesData.push(page);
    else if (page.pageType === 'contact') contactPageData = page;
    else if (page.pageType === 'certifications') certificationsPageData = page;
    else if (page.pageType === 'export') exportPageData = page;
  }
  
  // Process home page data (usually contains key business info)
  if (homePageData) {
    consolidatedData.businessName = homePageData.businessName || consolidatedData.businessName;
    consolidatedData.description = homePageData.valueProposition || consolidatedData.description;
    // Add featured products for later processing
    if (homePageData.featuredProducts && homePageData.featuredProducts.length > 0) {
      consolidatedData.products = homePageData.featuredProducts.map(p => ({
        name: p.title,
        description: p.description,
        image: p.image,
        url: p.link,
        confidence: 'medium',
        source: 'home-page'
      }));
    }
  }
  
  // About page has the most comprehensive business description
  if (aboutPageData) {
    // Prefer about page description over home page
    consolidatedData.description = aboutPageData.businessDescription || consolidatedData.description;
    
    // Extract business size heuristic based on team size
    if (aboutPageData.teamMembers) {
      const teamSize = aboutPageData.teamMembers.length;
      if (teamSize > 200) consolidatedData.businessSize = 'large';
      else if (teamSize > 50) consolidatedData.businessSize = 'medium';
      else consolidatedData.businessSize = 'small';
    }
    
    // Add mission/vision to description if available
    if (aboutPageData.mission) {
      consolidatedData.description += ` Mission: ${aboutPageData.mission}`;
    }
    
    if (aboutPageData.vision) {
      consolidatedData.description += ` Vision: ${aboutPageData.vision}`;
    }
    
    // Extract company values
    if (aboutPageData.values && aboutPageData.values.length > 0) {
      consolidatedData.values = aboutPageData.values;
    }
  }
  
  // Process products pages (may have multiple)
  productsPagesData.forEach(productsPage => {
    if (productsPage.products && productsPage.products.length > 0) {
      // Convert to standard product format
      const pageProducts = productsPage.products.map(p => ({
        name: p.name,
        description: p.description,
        image: p.image,
        url: p.url,
        features: p.features,
        price: p.price,
        confidence: 'high', // Products page has highest confidence
        source: 'products-page'
      }));
      
      // Add to consolidated products
      consolidatedData.products = [...consolidatedData.products, ...pageProducts];
    }
    
    // Extract product categories
    if (productsPage.categories && productsPage.categories.length > 0) {
      consolidatedData.productCategories = [
        ...consolidatedData.productCategories,
        ...productsPage.categories
      ];
    }
  });
  
  // Contact information
  if (contactPageData) {
    consolidatedData.contactInfo.emails = contactPageData.emails || [];
    consolidatedData.contactInfo.phones = contactPageData.phoneNumbers || [];
    consolidatedData.contactInfo.addresses = contactPageData.addresses || [];
    consolidatedData.contactInfo.socialMedia = contactPageData.socialProfiles || [];
    
    // Extract geographic presence from addresses
    if (contactPageData.addresses && contactPageData.addresses.length > 0) {
      // Look for common location indicators in addresses
      const locationPatterns = [
        /johannesburg/i, /cape town/i, /durban/i, /pretoria/i, 
        /nairobi/i, /lagos/i, /accra/i, /cairo/i,
        /south africa/i, /kenya/i, /nigeria/i, /ghana/i, /egypt/i,
        /morocco/i, /ethiopia/i, /tanzania/i, /uganda/i, /rwanda/i
      ];
      
      contactPageData.addresses.forEach(address => {
        locationPatterns.forEach(pattern => {
          const match = address.match(pattern);
          if (match) {
            consolidatedData.geographicPresence.push(match[0]);
          }
        });
      });
    }
  }
  
  // Certifications data
  if (certificationsPageData) {
    consolidatedData.certifications = certificationsPageData.certifications || [];
    
    // Add quality standards as certifications too
    if (certificationsPageData.standards && certificationsPageData.standards.length > 0) {
      consolidatedData.certifications = [
        ...consolidatedData.certifications,
        ...certificationsPageData.standards
      ];
    }
  }
  
  // Export markets and international presence
  if (exportPageData) {
    consolidatedData.exportMarkets = exportPageData.exportMarkets || [];
    
    // Add international offices to geographic presence
    if (exportPageData.internationalOffices && exportPageData.internationalOffices.length > 0) {
      consolidatedData.geographicPresence = [
        ...consolidatedData.geographicPresence,
        ...exportPageData.internationalOffices
      ];
    }
    
    // Add distributor locations to geographic presence
    if (exportPageData.distributors && exportPageData.distributors.length > 0) {
      const distributorLocations = exportPageData.distributors
        .map(d => d.location)
        .filter(loc => loc);
        
      consolidatedData.geographicPresence = [
        ...consolidatedData.geographicPresence,
        ...distributorLocations
      ];
    }
  }
  
  // Fall back to scanning all pages for missing information
  for (const page of Object.values(pageData)) {
    // Look for emails and phones in all pages if not found in contact page
    if (consolidatedData.contactInfo.emails.length === 0) {
      const emailMatches = page.textContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      if (emailMatches) {
        consolidatedData.contactInfo.emails = emailMatches;
      }
    }
    
    if (consolidatedData.contactInfo.phones.length === 0) {
      const phoneMatches = page.textContent.match(/(?:\+\d{1,4}[-\s]?)?\(?\d{2,4}\)?[-\s]?\d{3,4}[-\s]?\d{3,4}/g);
      if (phoneMatches) {
        consolidatedData.contactInfo.phones = phoneMatches;
      }
    }
    
    // Look for certifications if not found on certifications page
    if (consolidatedData.certifications.length === 0) {
      const certPatterns = [
        /iso\s*9001/i, /iso\s*14001/i, /haccp/i, /gmp/i, /fda/i,
        /ce\s*mark/i, /halal/i, /kosher/i, /organic/i, /fair\s*trade/i
      ];
      
      const certs = [];
      certPatterns.forEach(pattern => {
        if (page.textContent.match(pattern)) {
          certs.push(pattern.source.replace(/\\s\*|\[.*?\]|\\i|\//g, '').toUpperCase());
        }
      });
      
      if (certs.length > 0) {
        consolidatedData.certifications = certs;
      }
    }
  }
  
  // Deduplicate arrays and clean up data
  consolidatedData.products = deduplicateProducts(consolidatedData.products);
  consolidatedData.certifications = [...new Set(consolidatedData.certifications)];
  consolidatedData.geographicPresence = [...new Set(consolidatedData.geographicPresence)];
  consolidatedData.productCategories = [...new Set(consolidatedData.productCategories)];
  consolidatedData.exportMarkets = [...new Set(consolidatedData.exportMarkets)];
  
  // Infer customer segments from text analysis
  consolidatedData.customerSegments = inferCustomerSegments(pageData);
  
  // If product categories are empty, infer from products
  if (consolidatedData.productCategories.length === 0) {
    consolidatedData.productCategories = inferProductCategories(consolidatedData.products);
  }
  
  return consolidatedData;
}

/**
 * Deduplicate products by name
 * @param {Array} products - Products array
 * @returns {Array} - Deduplicated products
 */
function deduplicateProducts(products) {
  // Group by name (case insensitive)
  const productGroups = {};
  
  products.forEach(product => {
    const name = product.name.toLowerCase();
    if (!productGroups[name]) {
      productGroups[name] = [];
    }
    productGroups[name].push(product);
  });
  
  // Merge each group to get best data
  return Object.values(productGroups).map(group => {
    // Start with the highest confidence product
    const baseProduct = [...group].sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
    })[0];
    
    // Merge in data from other entries if missing
    group.forEach(product => {
      if (!baseProduct.description && product.description) {
        baseProduct.description = product.description;
      }
      
      if (!baseProduct.image && product.image) {
        baseProduct.image = product.image;
      }
      
      if (!baseProduct.url && product.url) {
        baseProduct.url = product.url;
      }
      
      if (!baseProduct.features && product.features) {
        baseProduct.features = product.features;
      }
    });
    
    return baseProduct;
  });
}

/**
 * Infer customer segments from text analysis
 * @param {Object} pageData - Extracted page data
 * @returns {Array} - Inferred customer segments
 */
function inferCustomerSegments(pageData) {
  const segments = [];
  const allText = Object.values(pageData)
    .map(page => page.textContent)
    .join(' ');
  
  // B2B indicators
  if (/business(-to|-2-?)?business|b2b|corporate|enterprise|wholesale/i.test(allText)) {
    segments.push('B2B');
  }
  
  // B2C indicators
  if (/consumer|customer|retail|individual|personal|b2c|business(-to|-2-?)?consumer/i.test(allText)) {
    segments.push('B2C');
  }
  
  // Government/public sector
  if (/government|public sector|municipality|agency|department|ministry|tender/i.test(allText)) {
    segments.push('Government');
  }
  
  // Retailers
  if (/retailer|store|shop|supermarket|distributor|dealer/i.test(allText)) {
    segments.push('Retailers');
  }
  
  // Default if no segments detected
  if (segments.length === 0) {
    // Most African SMEs serve both businesses and consumers
    segments.push('B2B', 'B2C');
  }
  
  return segments;
}

/**
 * Infer product categories from products
 * @param {Array} products - Product array
 * @returns {Array} - Inferred product categories
 */
function inferProductCategories(products) {
  const categories = new Set();
  
  // Common industry category keywords
  const categoryPatterns = [
    { pattern: /food|beverage|drink|meal|snack|grocery/i, category: 'Food & Beverage' },
    { pattern: /textile|fabric|clothing|garment|apparel|fashion/i, category: 'Textiles & Clothing' },
    { pattern: /furniture|decor|home|interior|household/i, category: 'Furniture & Home Goods' },
    { pattern: /agriculture|farm|crop|seed|livestock|dairy/i, category: 'Agriculture' },
    { pattern: /beauty|cosmetic|skincare|makeup|personal care/i, category: 'Beauty & Personal Care' },
    { pattern: /health|medical|pharmaceutical|medicine|wellness/i, category: 'Healthcare' },
    { pattern: /manufacturing|industrial|machine|equipment|tool/i, category: 'Manufacturing' },
    { pattern: /technology|software|digital|app|web|IT|computer/i, category: 'Technology' },
    { pattern: /service|consulting|advisory|support|assistance/i, category: 'Business Services' },
    { pattern: /education|training|learning|course|class|school/i, category: 'Education' },
    { pattern: /tourism|travel|hospitality|hotel|accommodation/i, category: 'Tourism & Hospitality' },
    { pattern: /mining|mineral|extraction|ore|resource/i, category: 'Mining & Resources' },
    { pattern: /construction|building|architecture|infrastructure/i, category: 'Construction' },
    { pattern: /logistics|transport|shipping|delivery|freight/i, category: 'Logistics & Transport' },
    { pattern: /energy|power|electricity|renewable|solar/i, category: 'Energy' },
    { pattern: /retail|store|shop|mall|shopping/i, category: 'Retail' },
    { pattern: /automotive|car|vehicle|motor/i, category: 'Automotive' },
    { pattern: /finance|banking|insurance|investment|payment/i, category: 'Financial Services' }
  ];
  
  // Check each product against category patterns
  products.forEach(product => {
    const text = `${product.name} ${product.description || ''}`;
    
    categoryPatterns.forEach(({ pattern, category }) => {
      if (pattern.test(text)) {
        categories.add(category);
      }
    });
  });
  
  // Add general merchandise as default if no categories detected
  if (categories.size === 0) {
    categories.add('General Merchandise');
  }
  
  return [...categories];
}

/**
 * Extract consolidated data from multiple crawled pages
 * @param {Object} pageData - The crawled page data
 * @returns {Object} - Consolidated extracted data
 */
function extractDataFromPages(pageData) {
  if (!pageData || !pageData.pages) {
    return {
      businessName: 'Unknown Business',
      description: '',
      productCategories: [],
      locations: []
    };
  }
  
  // Initialize consolidated data
  const consolidatedData = {
    businessName: 'Unknown Business',
    description: '',
    businessSize: 'unknown',
    foundedYear: null,
    employeeCount: null,
    productCategories: [],
    locations: [],
    certifications: []
  };
  
  try {
    // Process each page to extract data
    for (const page of Object.values(pageData.pages)) {
      if (!page.extracted) continue;
      
      // Business name from home or about page
      if (page.type === 'home' || page.type === 'about') {
        if (page.extracted.businessName && 
            page.extracted.businessName !== 'Unknown Business' && 
            consolidatedData.businessName === 'Unknown Business') {
          consolidatedData.businessName = page.extracted.businessName;
        }
        
        // Business description
        if (page.extracted.description && 
            page.extracted.description.length > consolidatedData.description.length) {
          consolidatedData.description = page.extracted.description;
        }
        
        // Business size
        if (page.extracted.businessSize && consolidatedData.businessSize === 'unknown') {
          consolidatedData.businessSize = page.extracted.businessSize;
        }
        
        // Founded year
        if (page.extracted.foundedYear && !consolidatedData.foundedYear) {
          consolidatedData.foundedYear = page.extracted.foundedYear;
        }
        
        // Employee count
        if (page.extracted.employeeCount && !consolidatedData.employeeCount) {
          consolidatedData.employeeCount = page.extracted.employeeCount;
        }
      }
      
      // Product categories from product pages
      if (page.type === 'products' && page.extracted.categories) {
        consolidatedData.productCategories = [
          ...consolidatedData.productCategories, 
          ...page.extracted.categories
        ];
      }
      
      // Locations from contact page
      if (page.type === 'contact' && page.extracted.locations) {
        consolidatedData.locations = [
          ...consolidatedData.locations, 
          ...page.extracted.locations
        ];
      }
      
      // Certifications from about or certifications page
      if ((page.type === 'about' || page.type === 'certifications') && 
          page.extracted.certifications) {
        consolidatedData.certifications = [
          ...consolidatedData.certifications, 
          ...page.extracted.certifications
        ];
      }
    }
    
    // Remove duplicates
    consolidatedData.productCategories = [...new Set(consolidatedData.productCategories)];
    consolidatedData.locations = [...new Set(consolidatedData.locations)];
    consolidatedData.certifications = [...new Set(consolidatedData.certifications)];
    
    return consolidatedData;
  } catch (error) {
    logger.error('Error extracting data from pages', { error: error.message });
    return {
      businessName: 'Unknown Business',
      description: '',
      productCategories: [],
      locations: []
    };
  }
}

module.exports = {
  scrapeWebsite,
  extractProducts
}; 