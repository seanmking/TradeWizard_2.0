const express = require('express');
const cors = require('cors');
const { scrapeWebsite } = require('./scraper');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    service: 'TradeWizard Scraper Service',
    version: '1.0.0' 
  });
});

// Main scraping endpoint
app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ 
      error: 'URL parameter is required' 
    });
  }
  
  try {
    const data = await scrapeWebsite(url);
    res.status(200).json(data);
  } catch (error) {
    logger.error(`Scraping error: ${error.message}`);
    res.status(500).json({ 
      error: 'Unable to process the website',
      message: error.message
    });
  }
});

// Specialized endpoint to return formatted data for TradeWizard
app.get('/analyze', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ 
      error: 'URL parameter is required' 
    });
  }
  
  try {
    const scrapedData = await scrapeWebsite(url);
    
    // Format data specifically for TradeWizard's MCP service
    const analysisResult = {
      productCategories: scrapedData.productCategories || [],
      certifications: scrapedData.certifications || [],
      geographicPresence: scrapedData.locations || [],
      businessSize: scrapedData.businessSize || 'small',
      customerSegments: scrapedData.customerSegments || [],
      exportReadiness: scrapedData.exportReadiness || 50,
      businessName: scrapedData.businessName,
      description: scrapedData.description,
      exportMentions: scrapedData.exportMentions,
      lastUpdated: scrapedData.lastUpdated
    };
    
    res.status(200).json(analysisResult);
  } catch (error) {
    logger.error(`Website analysis error: ${error.message}`);
    res.status(500).json({ 
      error: 'Unable to analyze the website',
      message: error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Scraper service running on port ${PORT}`);
}); 