'use server';

/**
 * Test file for the web scraper service
 */
import { analyzeWebsite } from './mcp/actions';

/**
 * Simple function to test the web scraper
 * Call this from a server action or API route
 */
export async function testWebScraper(url: string = 'https://example.com') {
  console.log(`Testing web scraper on ${url}`);
  
  try {
    const result = await analyzeWebsite(url);
    console.log('Web scraper test successful!');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Web scraper test failed:', error);
    throw error;
  }
}

// For direct testing via Node.js
if (typeof process !== 'undefined' && process.argv[2] === '--test') {
  const testUrl = process.argv[3] || 'https://example.com';
  testWebScraper(testUrl)
    .then(() => console.log('Test completed'))
    .catch(err => console.error('Test failed:', err));
} 