/**
 * TradeWizard Website Crawler
 * Responsible for multi-page crawling with respectful crawling behaviors
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { parse: parseUrl, resolve: resolveUrl } = require('url');
const robotsParser = require('robots-parser');
const logger = require('./logger');

// Constants
const MAX_PAGES = 10;
const REQUEST_DELAY = 1500; // 1.5 seconds between requests
const TIMEOUT = 30000; // 30 seconds
const USER_AGENT = 'TradeWizard/1.0 (+https://tradewizard.co.za/bot)';

// Page type patterns for classification
const PAGE_TYPE_PATTERNS = {
  home: [/^\/$/, /\/home\/?$/i, /\/index\/?$/i],
  about: [/about/i, /company/i, /who-we-are/i, /team/i, /values/i, /mission/i, /history/i],
  products: [/product/i, /services/i, /solutions/i, /shop/i, /store/i, /catalog/i, /offerings/i],
  contact: [/contact/i, /reach/i, /locations/i, /directions/i, /connect/i, /offices/i],
  certifications: [/certif/i, /quality/i, /standards/i, /compliance/i, /accreditation/i, /awards/i],
  export: [/export/i, /international/i, /global/i, /worldwide/i, /shipping/i, /distribution/i]
};

/**
 * Format URL with proper protocol
 * @param {string} url - URL to format
 * @returns {string} - Formatted URL
 */
function formatUrl(url) {
  if (!url) return '';
  
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  
  return url;
}

/**
 * Try to fetch a URL with fallbacks
 * @param {string} url - URL to fetch
 * @param {Object} options - Axios options
 * @returns {Promise<Object>} - Response data
 */
async function safeRequestWithFallback(url, options = {}) {
  const attempts = [
    { url, errorHandled: false },
    { url: url.replace('https://', 'http://'), errorHandled: false }
  ];
  
  for (let i = 0; i < attempts.length; i++) {
    try {
      const currentUrl = attempts[i].url;
      logger.info(`Attempting to fetch ${currentUrl}`);
      
      // Add specific options to help with problematic sites
      const requestOptions = {
        ...options,
        timeout: options.timeout || TIMEOUT,
        maxRedirects: 5,
        validateStatus: status => status < 500, // Only fail on server errors
        headers: {
          ...options.headers,
          'User-Agent': options.headers?.['User-Agent'] || USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false // Allow self-signed certs
        })
      };
      
      const response = await axios.get(currentUrl, requestOptions);
      
      if (response.status >= 200 && response.status < 300) {
        return response;
      } else {
        attempts[i].errorHandled = true;
        logger.warn(`Received status ${response.status} from ${currentUrl}`);
      }
    } catch (error) {
      attempts[i].errorHandled = true;
      logger.warn(`Error fetching ${attempts[i].url}: ${error.message}`);
    }
  }
  
  // If all attempts failed, throw an error
  const errors = attempts
    .filter(a => a.errorHandled)
    .map(a => `Failed to fetch ${a.url}`)
    .join(', ');
  
  throw new Error(`All fetch attempts failed: ${errors}`);
}

/**
 * Crawl multiple pages of a website with respect for robots.txt
 * @param {string} startUrl - Initial URL to crawl
 * @param {Object} options - Crawling options
 * @returns {Promise<Object>} - Crawl results with HTML content per page
 */
async function crawlWebsite(startUrl, options = {}) {
  const {
    maxPages = MAX_PAGES,
    respectRobotsTxt = true,
    pageTypes = Object.keys(PAGE_TYPE_PATTERNS),
    userAgent = USER_AGENT,
    followExternalLinks = false,
    maxDepth = 3,
    timeout = TIMEOUT
  } = options;
  
  logger.info(`Starting crawl of ${startUrl} with max ${maxPages} pages and depth ${maxDepth}`);
  
  // Parse and normalize the starting URL
  const formattedUrl = formatUrl(startUrl);
  const parsedUrl = parseUrl(formattedUrl);
  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
  
  // Initialize crawl state
  const visited = new Set();
  const pageData = {};
  let robotsAgent = null;
  
  // Fetch and parse robots.txt if enabled
  if (respectRobotsTxt) {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      logger.info(`Checking robots.txt at ${robotsUrl}`);
      
      try {
        const robotsResponse = await safeRequestWithFallback(robotsUrl, {
          timeout: timeout,
          headers: {
            'User-Agent': userAgent
          }
        });
        
        if (robotsResponse.status === 200) {
          robotsAgent = robotsParser(robotsUrl, robotsResponse.data);
          logger.info(`Robots.txt parsed for ${baseUrl}`);
        } else {
          logger.warn(`Failed to fetch robots.txt: ${robotsResponse.status}`);
          robotsAgent = { isAllowed: () => true };
        }
      } catch (error) {
        logger.warn(`Error fetching robots.txt: ${error.message}`);
        robotsAgent = { isAllowed: () => true };
      }
    } catch (error) {
      logger.warn(`Couldn't fetch robots.txt for ${baseUrl}: ${error.message}`);
      // Continue without robots.txt - assume everything is allowed
      robotsAgent = { isAllowed: () => true };
    }
  } else {
    // Mock robotsParser if disabled
    robotsAgent = { isAllowed: () => true };
  }
  
  // Queue for BFS traversal with priority scoring
  const queue = [{
    url: formattedUrl,
    priority: 10, // High priority for the starting URL
    depth: 0
  }];
  
  // Start crawling
  while (queue.length > 0 && Object.keys(pageData).length < maxPages) {
    // Sort queue by priority (higher first)
    queue.sort((a, b) => b.priority - a.priority);
    
    // Get next URL to crawl
    const { url, depth } = queue.shift();
    
    // Skip if already visited or exceeds max depth
    if (visited.has(url) || depth > maxDepth) continue;
    
    // Check robots.txt permission
    if (robotsAgent.isAllowed) {
      const isAllowed = robotsAgent.isAllowed(url, userAgent);
      if (!isAllowed) {
        logger.info(`Skipping ${url} - disallowed by robots.txt`);
        continue;
      }
    }
    
    try {
      // Respect rate limiting with delay
      if (visited.size > 0) {
        await sleep(REQUEST_DELAY);
      }
      
      // Fetch the page
      logger.info(`Crawling ${url} (depth: ${depth})`);
      
      const response = await safeRequestWithFallback(url, {
        timeout: timeout,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      
      // Mark as visited
      visited.add(url);
      
      // Process the fetched HTML
      const html = response.data;
      const $ = cheerio.load(html);
      
      // Classify the page type
      const pageType = classifyPage(url, $);
      logger.info(`Page ${url} classified as "${pageType}"`);
      
      // Store page data
      pageData[url] = {
        html,
        pageType,
        title: $('title').text().trim(),
        metaDescription: $('meta[name="description"]').attr('content') || '',
        h1: $('h1').first().text().trim(),
        wordCount: countWords($),
        depth,
        links: [],
        crawledAt: new Date().toISOString()
      };
      
      // Extract links for further crawling if not at max depth
      if (depth < maxDepth) {
        const links = extractLinks($, url, baseUrl, followExternalLinks);
        
        // Prioritize links based on page type patterns
        const prioritizedLinks = prioritizeLinks(links, pageTypes);
        
        // Add new links to the queue if not already visited
        prioritizedLinks.forEach(link => {
          if (!visited.has(link.url)) {
            queue.push({
              ...link,
              depth: depth + 1 // Set the correct depth for the link
            });
          }
        });
        
        // Store the extracted links in the page data
        pageData[url].links = prioritizedLinks.map(link => ({
          url: link.url,
          text: link.text,
          priority: link.priority
        }));
      }
      
    } catch (error) {
      logger.error(`Error crawling ${url}: ${error.message}`);
    }
  }
  
  logger.info(`Crawl of ${startUrl} complete. Visited ${visited.size} pages, stored ${Object.keys(pageData).length} pages.`);
  
  // Create an array of pages with their data
  const pages = Object.entries(pageData).map(([url, data]) => {
    return {
      url,
      title: data.title || '',
      description: data.metaDescription || '',
      content: data.html || '',
      html: data.html || '',
      types: [data.pageType],
      depth: data.depth,
      links: data.links || []
    };
  });
  
  return {
    startUrl,
    baseUrl,
    pages: pages,
    visitedUrls: Array.from(visited)
  };
}

/**
 * Extract and prioritize links from a page
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {string} currentUrl - Current page URL
 * @param {string} baseUrl - Base domain URL
 * @param {boolean} followExternalLinks - Whether to follow external links
 * @returns {Array} - Array of link objects with priority
 */
function extractLinks($, currentUrl, baseUrl, followExternalLinks = false) {
  const links = [];
  
  // Find all links
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    
    // Skip anchor links and javascript
    if (href.startsWith('#') || href.startsWith('javascript:')) return;
    
    // Resolve relative URLs
    try {
      const resolvedUrl = new URL(href, currentUrl).href;
      
      // Remove hash fragments
      const cleanUrl = resolvedUrl.split('#')[0];
      
      // Skip empty URLs and non-HTTP protocols
      if (!cleanUrl || !(cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://'))) {
        return;
      }
      
      // Check if it's an external link
      const isSameDomain = cleanUrl.startsWith(baseUrl);
      if (!isSameDomain && !followExternalLinks) {
        return;
      }
      
      // Skip common file extensions we don't want to process
      if (/\.(pdf|jpg|jpeg|png|gif|svg|css|js|zip|tar|gz|mp4|mp3|webm)$/i.test(cleanUrl)) {
        return;
      }
      
      // Get link text and properties
      const linkText = $(el).text().trim().toLowerCase();
      const inNavigation = $(el).parents('nav, header, .navigation, .menu').length > 0;
      const isProminent = $(el).parents('main, article, .content, .main').length > 0;
      
      // Base priority score
      let priority = 1;
      
      // External links get lower priority
      if (!isSameDomain) {
        priority -= 3;
      }
      
      // Boost links in navigation slightly
      if (inNavigation) priority += 1;
      
      // Boost prominent content links
      if (isProminent) priority += 1;
      
      // Prioritize by page depth (prefer shallower URLs)
      const pathDepth = cleanUrl.split('/').length - 3; // domain has 3 parts in split
      priority -= Math.min(pathDepth, 3); // Max penalty of -3 for deep URLs
      
      links.push({
        url: cleanUrl,
        text: linkText,
        isExternal: !isSameDomain,
        inNavigation,
        isProminent,
        priority,
        depth: 0 // Will be set by the crawler
      });
    } catch (error) {
      logger.warn(`Invalid URL: ${href} (base: ${currentUrl})`);
    }
  });
  
  return links;
}

/**
 * Prioritize links based on desired page types
 * @param {Array} links - Array of extracted links
 * @param {Array} desiredTypes - Array of desired page types
 * @returns {Array} - Prioritized links
 */
function prioritizeLinks(links, desiredTypes) {
  return links.map(link => {
    let priority = link.priority;
    const url = link.url.toLowerCase();
    const text = link.text.toLowerCase();
    
    // Check for matches with desired page types
    for (const type of desiredTypes) {
      const patterns = PAGE_TYPE_PATTERNS[type] || [];
      
      // Check URL against patterns
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          priority += 2;
          break;
        }
      }
      
      // Check link text against patterns
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          priority += 1;
          break;
        }
      }
    }
    
    // Add special boosts for important pages
    if (/about|company|who-we-are|team/i.test(url) || /about|company|who-we-are|team/i.test(text)) {
      priority += 2; // Boost about pages
    }
    
    if (/product|service|solution|offering/i.test(url) || /product|service|solution|offering/i.test(text)) {
      priority += 3; // Boost product pages even more
    }
    
    if (/certification|quality|standard|compliance/i.test(url) || /certification|quality|standard|compliance/i.test(text)) {
      priority += 3; // Boost certification pages for compliance MCP
    }
    
    if (/contact|location|office/i.test(url) || /contact|location|office/i.test(text)) {
      priority += 1; // Boost contact pages
    }
    
    if (/export|international|global/i.test(url) || /export|international|global/i.test(text)) {
      priority += 3; // Boost export-related pages
    }
    
    return {
      ...link,
      priority
    };
  }).sort((a, b) => b.priority - a.priority);
}

/**
 * Classify a page based on URL and content
 * @param {string} url - Page URL
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {string} - Page type
 */
function classifyPage(url, $) {
  // URL-based classification
  for (const [type, patterns] of Object.entries(PAGE_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return type;
      }
    }
  }
  
  // Title-based classification
  const title = $('title').text().toLowerCase();
  for (const [type, patterns] of Object.entries(PAGE_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(title)) {
        return type;
      }
    }
  }
  
  // H1-based classification
  const h1 = $('h1').first().text().toLowerCase();
  for (const [type, patterns] of Object.entries(PAGE_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(h1)) {
        return type;
      }
    }
  }
  
  // Content-based heuristics
  const bodyText = $('body').text().toLowerCase();
  
  // Check for contact page indicators
  if (
    $('form:contains("contact"), form:contains("enquiry"), form:contains("message")').length > 0 ||
    bodyText.includes('contact us') ||
    bodyText.includes('get in touch') ||
    bodyText.includes('email us') ||
    $('address').length > 0
  ) {
    return 'contact';
  }
  
  // Check for product page indicators
  if (
    $('.product, .products, [class*="product"]').length > 3 ||
    $('img[src*="product"]').length > 2 ||
    bodyText.includes('our products') ||
    bodyText.includes('product range') ||
    bodyText.includes('our services') ||
    $('[itemtype*="Product"]').length > 0
  ) {
    return 'products';
  }
  
  // Check for about page indicators
  if (
    bodyText.includes('about us') ||
    bodyText.includes('our mission') ||
    bodyText.includes('our vision') ||
    bodyText.includes('our story') ||
    bodyText.includes('founded in') ||
    bodyText.includes('our team') ||
    bodyText.includes('our values')
  ) {
    return 'about';
  }
  
  // Check for certification page indicators
  if (
    $(':contains("ISO"), :contains("certification"), img[src*="certificate"]').length > 2 ||
    bodyText.includes('certified') ||
    bodyText.includes('accredited') ||
    bodyText.includes('standards') ||
    bodyText.includes('quality control') ||
    bodyText.includes('compliance')
  ) {
    return 'certifications';
  }
  
  // Check for export/international page indicators
  if (
    bodyText.includes('export') ||
    bodyText.includes('international') ||
    bodyText.includes('global markets') ||
    bodyText.includes('worldwide') ||
    bodyText.includes('shipping') ||
    $('img[src*="world"], img[src*="global"], img[src*="map"]').length > 0
  ) {
    return 'export';
  }
  
  // Check if it's the homepage
  if (
    url.replace(/https?:\/\/[^\/]+\/?/i, '') === '' ||
    url.replace(/https?:\/\/[^\/]+\/?/i, '') === 'index.html' ||
    url.replace(/https?:\/\/[^\/]+\/?/i, '') === 'home' ||
    url.endsWith('/') && url.split('/').length <= 4
  ) {
    return 'home';
  }
  
  // Default to unknown if no patterns matched
  return 'unknown';
}

/**
 * Count approximate number of words in a page
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {number} - Word count
 */
function countWords($) {
  // Extract text content and count words
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text.split(' ').length;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Resolves after sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  crawlWebsite,
  classifyPage,
  formatUrl
}; 