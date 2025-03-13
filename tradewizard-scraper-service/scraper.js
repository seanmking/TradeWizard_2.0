const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('./logger');

// Define timeout for requests
const TIMEOUT = 30000; // 30 seconds

/**
 * Scrape a website and extract relevant business information
 * @param {string} url - Website URL to scrape
 * @returns {Object} Structured business data
 */
async function scrapeWebsite(url) {
  logger.info(`Starting to scrape ${url}`);
  
  try {
    // Format URL if needed
    const formattedUrl = formatUrl(url);
    
    // Fetch the website content
    const response = await axios.get(formattedUrl, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Load HTML into cheerio
    const $ = cheerio.load(response.data);
    
    // Extract structured business data
    const businessData = {
      businessName: extractBusinessName($),
      description: extractDescription($),
      products: extractProducts($),
      certifications: extractCertifications($),
      exportMentions: extractExportMentions($),
      contactInfo: extractContactInfo($),
      locations: extractLocations($),
      industries: detectIndustries($),
      
      // Include derived data for AI assessment
      productCategories: categorizeProducts(extractProducts($)),
      businessSize: estimateBusinessSize($),
      geographicPresence: extractLocations($),
      customerSegments: identifyCustomerSegments($),
      exportReadiness: calculateExportReadiness($),
      lastUpdated: new Date().toISOString()
    };
    
    logger.info(`Successfully scraped ${url}`);
    return businessData;
  } catch (error) {
    logger.error(`Error scraping ${url}: ${error.message}`);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

/**
 * Ensure URL has proper format
 */
function formatUrl(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
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
 * Extract products or services
 */
function extractProducts($) {
  const products = [];
  
  // Look for product listings
  $('div.product, .product-item, .service-item, section.products, section.services')
    .each((i, el) => {
      const name = $(el).find('h2, h3, .title').first().text().trim();
      const description = $(el).find('p, .description').first().text().trim();
      
      if (name) {
        products.push({
          name,
          description: description || ''
        });
      }
    });
  
  // If no structured products found, look for product mentions
  if (products.length === 0) {
    const productHeadings = $('h2:contains("Product"), h2:contains("Service"), h3:contains("Product"), h3:contains("Service")');
    
    productHeadings.each((i, el) => {
      const section = $(el).nextUntil('h2, h3');
      const name = $(el).text().trim();
      const description = section.find('p').first().text().trim();
      
      if (name) {
        products.push({
          name,
          description: description || ''
        });
      }
    });
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
 * Categorize products into broader categories
 */
function categorizeProducts(products) {
  // Extract category names from products
  const categories = products.map(product => {
    // Try to determine a category from the product name
    const name = product.name.toLowerCase();
    
    if (name.includes('food') || name.includes('beverage')) return 'Food & Beverage';
    if (name.includes('clothing') || name.includes('apparel') || name.includes('textile')) return 'Textiles & Clothing';
    if (name.includes('furniture') || name.includes('decor')) return 'Home Goods';
    if (name.includes('health') || name.includes('beauty')) return 'Health & Beauty';
    
    // Default to the product name as the category
    return product.name;
  });
  
  // Return unique categories
  return [...new Set(categories)];
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

module.exports = {
  scrapeWebsite
}; 