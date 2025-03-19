/**
 * TradeWizard Page Extractor
 * Extracts structured data from different page types
 */

const cheerio = require('cheerio');
const logger = require('./logger');

/**
 * Extract structured data from a page based on its type
 * @param {Object} page - Page object with HTML content
 * @returns {Object} - Extracted data
 */
function extractPageData(page) {
  if (!page || !page.html) {
    logger.warn(`Cannot extract data: page or HTML is missing for ${page?.url || 'unknown URL'}`);
    return null;
  }
  
  // Ensure types is an array
  const types = Array.isArray(page.types) ? page.types : [page.types].filter(Boolean);
  
  if (types.length === 0) {
    logger.warn(`No page type classification for ${page.url || 'unknown URL'}`);
    return null;
  }
  
  // Load HTML with cheerio
  const $ = cheerio.load(page.html);
  
  // Common data extraction for all page types
  const commonData = {
    url: page.url,
    title: page.title || $('title').text().trim(),
    description: page.description || $('meta[name="description"]').attr('content') || '',
    pageTypes: types,
    headings: extractHeadings($),
    paragraphs: extractParagraphs($),
    images: extractImages($, page.url),
    lists: extractLists($)
  };
  
  // Get specialized data for different page types
  let specializedData = {};
  
  for (const type of types) {
    logger.info(`Extracting data from ${page.url} as ${type} page`);
    
    switch (type) {
      case 'home':
        specializedData = {
          ...specializedData,
          ...extractHomePageData($)
        };
        break;
      case 'about':
        specializedData = {
          ...specializedData,
          ...extractAboutPageData($)
        };
        break;
      case 'products':
        specializedData = {
          ...specializedData,
          ...extractProductsPageData($)
        };
        break;
      case 'contact':
        specializedData = {
          ...specializedData,
          ...extractContactPageData($)
        };
        break;
      case 'certifications':
        specializedData = {
          ...specializedData,
          ...extractCertificationsPageData($)
        };
        break;
      case 'export':
        specializedData = {
          ...specializedData,
          ...extractExportPageData($)
        };
        break;
      default:
        // No specialized extraction for unknown types
        break;
    }
  }
  
  return {
    ...commonData,
    ...specializedData
  };
}

/**
 * Extract headings from a page
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Object} - Extracted headings
 */
function extractHeadings($) {
  const headings = {
    h1: [],
    h2: [],
    h3: []
  };
  
  $('h1').each((i, el) => {
    const text = $(el).text().trim();
    if (text) headings.h1.push(text);
  });
  
  $('h2').each((i, el) => {
    const text = $(el).text().trim();
    if (text) headings.h2.push(text);
  });
  
  $('h3').each((i, el) => {
    const text = $(el).text().trim();
    if (text) headings.h3.push(text);
  });
  
  return headings;
}

/**
 * Extract paragraphs from a page
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Extracted paragraphs
 */
function extractParagraphs($) {
  const paragraphs = [];
  
  $('p').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10) { // Only include non-trivial paragraphs
      paragraphs.push(text);
    }
  });
  
  return paragraphs;
}

/**
 * Extract images from a page
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {string} baseUrl - Base URL for resolving relative paths
 * @returns {Array} - Extracted images
 */
function extractImages($, baseUrl) {
  const images = [];
  
  $('img').each((i, el) => {
    const src = $(el).attr('src');
    const alt = $(el).attr('alt') || '';
    
    if (src) {
      try {
        // Resolve relative URLs
        const fullSrc = new URL(src, baseUrl).href;
        
        images.push({
          src: fullSrc,
          alt: alt.trim(),
          width: $(el).attr('width') || '',
          height: $(el).attr('height') || ''
        });
      } catch (error) {
        // Skip invalid URLs
      }
    }
  });
  
  return images;
}

/**
 * Extract lists from a page
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Extracted lists
 */
function extractLists($) {
  const lists = [];
  
  $('ul, ol').each((i, listEl) => {
    const items = [];
    
    $(listEl).find('li').each((j, itemEl) => {
      const text = $(itemEl).text().trim();
      if (text) {
        items.push(text);
      }
    });
    
    if (items.length > 0) {
      lists.push({
        type: $(listEl).is('ol') ? 'ordered' : 'unordered',
        items
      });
    }
  });
  
  return lists;
}

/**
 * Extract data specific to home pages
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Object} - Home page data
 */
function extractHomePageData($) {
  // Look for sliders, banners, and featured content
  const sliderTexts = [];
  
  // Common slider/carousel selectors
  $('.slider, .carousel, .banner, [class*="slider"], [class*="carousel"], [class*="banner"]').each((i, el) => {
    const text = $(el).text().trim();
    if (text) {
      sliderTexts.push(text);
    }
  });
  
  // Look for value propositions and call-to-action elements
  const ctaElements = [];
  $('a.cta, a.btn, button.cta, button.btn, [class*="cta"], [class*="button"]').each((i, el) => {
    const text = $(el).text().trim();
    if (text) {
      ctaElements.push(text);
    }
  });
  
  return {
    sliderTexts,
    ctaElements,
    mainContent: $('main, .main, #main, .content, #content').text().trim()
  };
}

/**
 * Extract data specific to about pages
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Object} - About page data
 */
function extractAboutPageData($) {
  // Extract company history, mission, vision, team info
  return {
    companyHistory: extractSectionContent($, ['history', 'background', 'story']),
    mission: extractSectionContent($, ['mission', 'purpose']),
    vision: extractSectionContent($, ['vision', 'future']),
    values: extractSectionContent($, ['values', 'principles']),
    team: extractTeamMembers($)
  };
}

/**
 * Extract data specific to products pages
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Object} - Products page data
 */
function extractProductsPageData($) {
  // Extract product listings, categories, features, pricing
  const productElements = [];
  
  // Common product selectors
  $('.product, [class*="product"], .item, [class*="item"]').each((i, el) => {
    const name = $(el).find('h2, h3, h4, .title, .name').first().text().trim();
    const description = $(el).find('p, .description').first().text().trim();
    const price = $(el).find('.price, [class*="price"]').first().text().trim();
    
    if (name || description) {
      productElements.push({
        name,
        description,
        price
      });
    }
  });
  
  return {
    productElements,
    productCategories: extractCategories($),
    productFeatures: extractFeatures($)
  };
}

/**
 * Extract data specific to contact pages
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Object} - Contact page data
 */
function extractContactPageData($) {
  // Extract contact details, addresses, forms
  return {
    contactFormPresent: $('.contact-form, form, [class*="contact"], [class*="form"]').length > 0,
    emails: extractEmails($),
    phones: extractPhones($),
    addresses: extractAddresses($),
    socialMedia: extractSocialMedia($)
  };
}

/**
 * Extract data specific to certifications pages
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Object} - Certifications page data
 */
function extractCertificationsPageData($) {
  // Extract certification details, standards, compliances
  const certifications = [];
  
  $('[class*="certification"], [class*="certificate"], [class*="standard"], [class*="compliance"]').each((i, el) => {
    const text = $(el).text().trim();
    if (text) {
      certifications.push(text);
    }
  });
  
  // If no specific certification elements, look for lists or sections
  if (certifications.length === 0) {
    // Check sections with certification-related headings
    $('h2, h3, h4').each((i, el) => {
      const heading = $(el).text().toLowerCase();
      if (/certification|certificate|standard|compliance|quality|iso/i.test(heading)) {
        const section = $(el).next().text().trim();
        if (section) {
          certifications.push(`${heading}: ${section}`);
        }
      }
    });
  }
  
  return {
    certifications,
    standards: extractStandards($),
    qualityStatements: extractQualityStatements($)
  };
}

/**
 * Extract data specific to export pages
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Object} - Export page data
 */
function extractExportPageData($) {
  // Extract export details, international presence, shipping
  const exportMarkets = [];
  
  // Look for country names
  const text = $('body').text();
  const countryNames = [
    'Africa', 'Europe', 'Asia', 'North America', 'South America', 'Australia',
    'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'UK', 'France',
    'Germany', 'Italy', 'Spain', 'China', 'Japan', 'India', 'Russia', 'Australia',
    'New Zealand', 'South Africa', 'Nigeria', 'Kenya', 'Egypt', 'UAE', 'Saudi Arabia'
  ];
  
  for (const country of countryNames) {
    if (new RegExp(`\\b${country}\\b`, 'i').test(text)) {
      exportMarkets.push(country);
    }
  }
  
  return {
    exportMarkets,
    exportProcesses: extractExportProcesses($),
    internationalShipping: extractInternationalShipping($)
  };
}

/**
 * Helper function to extract section content based on keywords
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {Array} keywords - Keywords to look for in headings
 * @returns {string} - Extracted content
 */
function extractSectionContent($, keywords) {
  let content = '';
  
  // Look for headings with matching keywords
  $('h1, h2, h3, h4, h5, h6').each((i, el) => {
    const headingText = $(el).text().toLowerCase();
    
    if (keywords.some(keyword => headingText.includes(keyword))) {
      // Get all paragraphs following this heading until the next heading
      let paragraph = $(el).next('p');
      while (paragraph.length > 0 && !paragraph.is('h1, h2, h3, h4, h5, h6')) {
        content += ' ' + paragraph.text().trim();
        paragraph = paragraph.next();
      }
    }
  });
  
  // Also check for divs or sections with matching IDs or classes
  keywords.forEach(keyword => {
    $(`#${keyword}, .${keyword}, [id*="${keyword}"], [class*="${keyword}"]`).each((i, el) => {
      content += ' ' + $(el).text().trim();
    });
  });
  
  return content.trim();
}

/**
 * Extract team members data
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Team members data
 */
function extractTeamMembers($) {
  const team = [];
  
  $('.team-member, [class*="team"], [class*="member"], [class*="staff"]').each((i, el) => {
    const name = $(el).find('h3, h4, h5, .name').first().text().trim();
    const position = $(el).find('.position, .title, .role').first().text().trim();
    const bio = $(el).find('p, .bio, .description').first().text().trim();
    
    if (name) {
      team.push({
        name,
        position,
        bio
      });
    }
  });
  
  return team;
}

/**
 * Extract product categories
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Categories
 */
function extractCategories($) {
  const categories = new Set();
  
  $('.category, [class*="category"], .filter, [class*="filter"]').each((i, el) => {
    const category = $(el).text().trim();
    if (category) {
      categories.add(category);
    }
  });
  
  return Array.from(categories);
}

/**
 * Extract product features
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Features
 */
function extractFeatures($) {
  const features = [];
  
  $('.feature, [class*="feature"], .benefit, [class*="benefit"]').each((i, el) => {
    const feature = $(el).text().trim();
    if (feature) {
      features.push(feature);
    }
  });
  
  return features;
}

/**
 * Extract email addresses
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Emails
 */
function extractEmails($) {
  const emails = new Set();
  const text = $('body').text();
  
  // Simple regex for emails - not perfect but catches most standard emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  
  matches.forEach(email => {
    emails.add(email.toLowerCase());
  });
  
  // Also check mailto links
  $('a[href^="mailto:"]').each((i, el) => {
    const href = $(el).attr('href');
    const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
    if (email && email.includes('@')) {
      emails.add(email);
    }
  });
  
  return Array.from(emails);
}

/**
 * Extract phone numbers
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Phone numbers
 */
function extractPhones($) {
  const phones = new Set();
  const text = $('body').text();
  
  // Basic regex for phone numbers
  const phoneRegex = /(?:\+\d{1,3}[-\.\s]?)?(?:\(\d{1,4}\)[-\.\s]?)?\d{1,4}[-\.\s]?\d{1,4}[-\.\s]?\d{1,9}/g;
  const matches = text.match(phoneRegex) || [];
  
  matches.forEach(phone => {
    // Basic filtering to remove date-like numbers, etc.
    if (phone.replace(/[^0-9]/g, '').length >= 7) {
      phones.add(phone.trim());
    }
  });
  
  // Also check tel links
  $('a[href^="tel:"]').each((i, el) => {
    const href = $(el).attr('href');
    const phone = href.replace('tel:', '').trim();
    if (phone) {
      phones.add(phone);
    }
  });
  
  return Array.from(phones);
}

/**
 * Extract physical addresses
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Addresses
 */
function extractAddresses($) {
  const addresses = [];
  
  // Look for address elements
  $('.address, [class*="address"], [itemprop="address"]').each((i, el) => {
    const address = $(el).text().trim().replace(/\s+/g, ' ');
    if (address) {
      addresses.push(address);
    }
  });
  
  return addresses;
}

/**
 * Extract social media links
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Object} - Social media links
 */
function extractSocialMedia($) {
  const socialMedia = {};
  
  // Common social media platforms and their identifiers
  const platforms = {
    facebook: ['facebook', 'fb'],
    twitter: ['twitter', 'x.com'],
    instagram: ['instagram', 'insta'],
    linkedin: ['linkedin'],
    youtube: ['youtube'],
    pinterest: ['pinterest']
  };
  
  // Check for social media links
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    
    for (const [platform, keywords] of Object.entries(platforms)) {
      if (keywords.some(keyword => href.toLowerCase().includes(keyword))) {
        socialMedia[platform] = href;
      }
    }
  });
  
  return socialMedia;
}

/**
 * Extract standards information
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Standards
 */
function extractStandards($) {
  const standards = new Set();
  const text = $('body').text();
  
  // Common standards to look for
  const standardPatterns = [
    /ISO \d+/i,
    /HACCP/i,
    /FSSC \d+/i,
    /GMP\+/i,
    /OHSAS \d+/i,
    /IFS/i,
    /BRC/i,
    /SQF/i,
    /CE/i,
    /FDA/i,
    /ASTM/i
  ];
  
  standardPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      standards.add(match.trim());
    });
  });
  
  return Array.from(standards);
}

/**
 * Extract quality statements
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {string} - Quality statements
 */
function extractQualityStatements($) {
  return extractSectionContent($, ['quality', 'standard', 'certification', 'compliance']);
}

/**
 * Extract export processes
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {string} - Export processes
 */
function extractExportProcesses($) {
  return extractSectionContent($, ['export', 'international', 'global', 'shipping', 'distribution']);
}

/**
 * Extract international shipping information
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {string} - International shipping info
 */
function extractInternationalShipping($) {
  return extractSectionContent($, ['shipping', 'delivery', 'international', 'global']);
}

module.exports = {
  extractPageData
}; 