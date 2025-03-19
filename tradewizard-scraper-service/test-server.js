/**
 * Test Server Script
 * Run the enhanced scraper service with mock LLM and Supabase responses
 */

require('dotenv').config();
const logger = require('./logger');

// Set up mock LLM responses
process.env.USE_MOCK_LLM = 'true';

// Start the server
logger.info('Starting scraper service with mock responses');
require('./server');

logger.info('Test the server using:');
logger.info('GET http://localhost:3002/health');
logger.info('GET http://localhost:3002/scrape?url=example.com');
logger.info('GET http://localhost:3002/analyze?url=example.com');
logger.info('GET http://localhost:3002/completeness?url=example.com'); 