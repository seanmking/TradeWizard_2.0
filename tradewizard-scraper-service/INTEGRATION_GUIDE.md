# TradeWizard Scraper Service - Integration Guide

This guide explains how to integrate the enhanced TradeWizard Scraper Service with the main TradeWizard application, using your existing Supabase project.

## 1. Add Scraper Tables to Existing Supabase Project

### Option 1: Add Tables via SQL Editor

1. Log in to your existing Supabase project
2. Go to the SQL Editor
3. Create a new query
4. Run the SQL schema from `tradewizard-scraper-service/db/add_to_existing_supabase.sql` to add the necessary tables:
   - `scraped_websites`
   - `website_products`
   - `scrape_jobs`
   - `api_usage_logs`
   - `website_summaries` view

### Option 2: Add Tables via Migration Script

For a more controlled approach:

1. Create a timestamped migration file (e.g., `20240331_add_scraper_tables.sql`)
2. Copy the schema from `tradewizard-scraper-service/db/schema.sql` into this file
3. Run the migration via your preferred method

## 2. Configure the Scraper Service

1. Update `tradewizard-scraper-service/.env` with your existing Supabase credentials:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

2. Configure a valid OpenAI API key:

```
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

3. Set appropriate scraping limits based on your needs:

```
MAX_PAGES=10
MAX_DEPTH=3
REQUEST_DELAY=1000
```

## 3. Deploy the Scraper Service

### Option A: As a Standalone Service

1. Set up the service on a server/cloud provider
2. Install dependencies: `npm install`
3. Start the service: `node server.js`
4. Ensure the service is publicly accessible or within your network

### Option B: As Part of Main Application

1. Add the scraper service as a subdirectory in your main project
2. Configure proper routing to the scraper endpoints
3. Share environment variables between services

## 4. Integrate with Main TradeWizard Application

### Frontend Integration

Update your frontend components to use the scraper data:

1. **Business Profile Page**:
   - Display business name, size, and description
   - Show founding year and employee count
   - List geographic presence and industries
   - Visualize export readiness score

2. **Product Catalog**:
   - Display detected products with descriptions and categories
   - Show confidence levels for each product

3. **Export Readiness Assessment**:
   - Visualize export readiness score
   - Display strengths, weaknesses, and recommendations
   - Show data completeness metrics

### API Integration

Add these API calls to your main application:

1. **Scrape a Website**:
```javascript
async function scrapeWebsite(url) {
  const response = await fetch(`${SCRAPER_SERVICE_URL}/scrape?url=${encodeURIComponent(url)}`);
  return await response.json();
}
```

2. **Get Formatted Analysis**:
```javascript
async function getWebsiteAnalysis(url) {
  const response = await fetch(`${SCRAPER_SERVICE_URL}/analyze?url=${encodeURIComponent(url)}`);
  return await response.json();
}
```

3. **Check Data Completeness**:
```javascript
async function checkCompleteness(url) {
  const response = await fetch(`${SCRAPER_SERVICE_URL}/completeness?url=${encodeURIComponent(url)}`);
  return await response.json();
}
```

## 5. Data Collection Workflow

Implement this workflow in your application:

1. User enters a business website URL
2. Application calls the `/scrape` endpoint (or `/analyze` for formatted results)
3. Display loading indicator during scraping (can take 10-20 seconds)
4. Once complete, show the business profile with:
   - Business information (name, size, description)
   - Product listings
   - Export readiness assessment
   - Data completeness metrics
5. Allow users to request a fresh scrape if needed via the `/scrape?forceFresh=true` parameter

## 6. Caching Strategy

The scraper service implements caching by default:

- Website data is stored in the `scraped_websites` table
- Default cache duration is 24 hours
- Use `forceFresh=true` parameter to override cache
- Add UI elements to show when data was last scraped
- Add a "Refresh Data" button that forces a fresh scrape

## 7. Error Handling

Implement these error handling strategies:

1. **Service Unavailable**: Display a message if the scraper service is down
2. **Scraping Errors**: Show appropriate messages for invalid URLs or timeout errors
3. **Partial Data**: Handle cases where only some data could be extracted
4. **Rate Limiting**: Implement queuing for batch processing if needed

## 8. Security Considerations

1. **API Security**: Consider adding authentication to the scraper service endpoints
2. **Data Privacy**: Be mindful of storing potentially sensitive business information
3. **OpenAI API Key**: Secure the OpenAI API key and monitor usage
4. **Rate Limiting**: Protect against abuse by implementing rate limits

## 9. Performance Monitoring

Set up monitoring to track:

1. Scraping success rates
2. API response times
3. OpenAI API usage and costs
4. Database storage growth

## 10. Testing the Integration

Test these key scenarios:

1. Scraping various types of websites (B2B, B2C, multilingual)
2. Handling websites with different structures and content
3. Performance under load with multiple concurrent scrape requests
4. Proper data display in the main application UI
5. Error handling for edge cases (invalid URLs, timeouts)

## 4. Database Schema Updates

If you've previously installed TradeWizard and are upgrading to the latest version with enhanced export readiness assessment, you need to update your database schema.

### For Existing Installations

Run the migration script to add the new fields to your database:

```sql
-- Run this in your Supabase SQL Editor or PostgreSQL client
\i 'tradewizard-scraper-service/db/migration_v2_export_readiness.sql'
```

This migration adds the following new fields to support enhanced export readiness assessment:

- `recommendations`: Array of actionable recommendations for improving export readiness
- `target_markets`: Array of suggested target export markets
- `compliance_gaps`: Array of identified compliance issues that need to be addressed
- `certification_needs`: Array of certifications recommended for target markets
- `supply_chain_risks`: Array of supply chain risks for international expansion
- `market_entry_strategy`: Suggested approach for market entry

The migration script also updates the `export_readiness_assessment` view to include these new fields and attempts to extract data from existing `full_data` JSON if available.

## Data Points Collected

The scraper service should collect the following data points to support the TradeWizard platform, including Market Intelligence and Compliance MCP requirements:

### Core Business Information
- Business name
- Business size (micro, small, medium, large)
- Description
- Founded year
- Employee count
- Geographic presence (locations/markets served)
- Industries
- Export markets
- Export readiness score (0-100)
- B2B focus score (0-100)

### Product Information
- Product names
- Product descriptions 
- Product categories/types
- Confidence level (high/medium/low)
- Product HS codes (if available)
- Product pricing (if available)
- Product specifications/technical details
- Product images URLs

### Market and Export Intelligence Data
- Target export markets mentioned
- International partnerships/distributors
- Import/export activities mentioned
- Market share information
- Market size references
- Growth trends mentioned
- Competitive positioning
- International marketing strategies
- Sales channels (direct, distributor, agent, online)
- E-commerce capabilities
- International logistics information
- Shipping/fulfillment options

### Compliance and Regulatory Information
- Quality certifications held (ISO, HACCP, GMP, etc.)
- Regulatory compliance statements
- Industry-specific certifications
- Country-specific certifications
- Environmental certifications
- Organic/natural product certifications
- Fair trade certifications
- Product safety certifications
- Manufacturing standards compliance
- Testing/laboratory certifications
- Regulatory authorities mentioned
- Import/export compliance information

### Supply Chain Information
- Supplier relationships
- Supply chain overview
- Raw material sourcing
- Manufacturing capabilities
- Production capacity
- Delivery timeframes
- Minimum order quantities (MOQs)
- Packaging information
- Logistics partners

### Additional Business Attributes
- Customer segments
- Value proposition statements
- Business strengths
- Case studies/success stories
- Sustainability practices
- Corporate social responsibility
- Innovation capabilities
- R&D activities
- Intellectual property mentions (patents, trademarks)
- Awards and recognition
- Company news/press releases
- Team/management information
- Company history

### Contact and Communication
- Contact information
- Languages supported
- International offices/representation
- Response time to inquiries
- Social media presence
- International communication capabilities

This comprehensive data collection enables the TradeWizard platform to provide thorough assessments for:
- Export readiness evaluation
- Market opportunity analysis
- Compliance requirements analysis
- Product-market fit assessment
- Competitive positioning
- Supply chain optimization 