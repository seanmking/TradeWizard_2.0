#!/usr/bin/env node

/**
 * TradeWizard 2.0 API Key Generator
 * 
 * Generates secure API keys for local development.
 * Run with: node generate-api-key.js
 */

const crypto = require('crypto');

// Generate a secure random API key with prefix
function generateApiKey(prefix = 'tw') {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  return `${prefix}_${randomBytes}`;
}

// Main function
function main() {
  console.log('\n========================================');
  console.log('    TradeWizard 2.0 API Key Generator    ');
  console.log('========================================\n');

  const scraperApiKey = generateApiKey('tw_scr');
  
  console.log('Generated API Keys:\n');
  console.log(`SCRAPER_API_KEY=${scraperApiKey}`);
  console.log('\nAdd these keys to your .env files:');
  console.log('  - Root .env');
  console.log('  - backend/.env');
  console.log('  - tradewizard-scraper-service/.env (as API_KEY)\n');
  
  console.log('For OpenAI API keys, visit: https://platform.openai.com/api-keys');
  console.log('For Supabase credentials, visit: https://supabase.com/dashboard/project/_/settings/api');
  console.log('========================================\n');
}

// Run the script
main(); 