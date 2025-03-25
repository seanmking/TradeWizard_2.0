// Test environment variable loading
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('Testing environment variables:');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'FOUND (first 4 chars: ' + process.env.OPENAI_API_KEY.substring(0, 4) + '...)' : 'NOT FOUND');
console.log('PORT:', process.env.PORT || 'NOT FOUND');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'NOT FOUND');
console.log('REDIS_URL:', process.env.REDIS_URL || 'NOT FOUND');
console.log('SCRAPER_API_KEY:', process.env.SCRAPER_API_KEY || 'NOT FOUND'); 