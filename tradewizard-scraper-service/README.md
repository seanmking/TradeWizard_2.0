# TradeWizard Scraper Service

Enhanced web scraper microservice for TradeWizard, providing multi-page crawling, data extraction, and storage for business intelligence.

## Features

- **Multi-page Crawling**: Intelligently crawls websites up to a specified depth, respecting `robots.txt`
- **Page Classification**: Classifies pages as home, about, products, contact, certifications, or export
- **Hybrid Product Detection**: Combines DOM-based and LLM-based approaches for comprehensive product identification
- **Enhanced Business Information**: Uses LLM to extract detailed business information
- **Export Readiness Assessment**: Analyzes export readiness with strengths, weaknesses, and recommendations
- **Data Persistence**: Stores scraped data in Supabase for efficient retrieval and caching
- **Data Completeness Analysis**: Identifies gaps in data and provides recommendations for improvement

## Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Supabase account and project (for data persistence)
- OpenAI API key (for LLM-enhanced analysis)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and configure environment variables:
   ```
   cp .env.example .env
   ```
4. Set up your Supabase database:
   - Create a new Supabase project
   - Run the SQL commands in `db/schema.sql` in the Supabase SQL Editor

### Configuration

Edit the `.env` file with your settings:

```
# Server configuration
PORT=3001

# OpenAI API configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Scraping configuration
MAX_PAGES=10
MAX_DEPTH=3
REQUEST_DELAY=1000

# Supabase configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Logging
LOG_LEVEL=info
```

## Usage

### Starting the Service

```bash
# Development with auto-restart
npm run dev

# Production
npm start
```

### API Endpoints

#### Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "message": "Scraper service is running"
}
```

#### Basic Scrape

```
GET /scrape?url=example.com&maxPages=10&maxDepth=3&useCache=true&forceFresh=false
```

Parameters:
- `url`: Website URL to scrape (required)
- `maxPages`: Maximum number of pages to crawl (optional, default: 10)
- `maxDepth`: Maximum depth to crawl (optional, default: 3)
- `useCache`: Whether to use cached data if available (optional, default: true)
- `forceFresh`: Whether to force a fresh scrape (optional, default: false)

#### Analyze Website

```
GET /analyze?url=example.com&maxPages=10&maxDepth=3&useCache=true&forceFresh=false
```

Parameters: Same as `/scrape`

Response Format:
```json
{
  "businessName": "Example Business",
  "businessSize": "small",
  "description": "Description of the business",
  "productCategories": ["Category1", "Category2"],
  "productDetails": [
    {
      "name": "Product Name",
      "description": "Product description",
      "confidence": "high"
    }
  ],
  "customerSegments": ["B2B", "B2C"],
  "certifications": ["ISO9001", "HACCP"],
  "geographicPresence": ["South Africa", "Kenya"],
  "exportReadiness": 65
}
```

#### Retrieve Cached Data

```
GET /cached?url=example.com
```

Parameters:
- `url`: Website URL to retrieve data for (required)

#### Check Data Completeness

```
GET /completeness?url=example.com
```

Parameters:
- `url`: Website URL to check completeness for (required)

Response Format:
```json
{
  "overall": 70,
  "businessInfo": {
    "score": 80,
    "fields": {
      "businessName": true,
      "description": true,
      "..." : "..."
    },
    "recommendations": ["Add founding year information"]
  },
  "productInfo": { "..." },
  "exportInfo": { "..." },
  "dataSource": "cache",
  "lastUpdated": "2023-06-10T12:34:56Z",
  "recommendations": ["Add founding year information", "..."]
}
```

#### Database Statistics

```
GET /stats
```

Response Format:
```json
{
  "websiteCount": 150,
  "productCount": 1250,
  "recentWebsites": [
    {
      "url": "example.com",
      "business_name": "Example Business",
      "last_scraped": "2023-06-10T12:34:56Z"
    },
    "..."
  ]
}
```

## Architecture

The scraper service consists of the following main components:

1. **Crawler Module**: Handles the multi-page crawling with page classification
2. **Page Extractor**: Extracts structured data from different types of pages
3. **Enhanced LLM Analyzer**: Uses OpenAI for advanced business intelligence extraction
4. **Hybrid Product Detector**: Combines DOM-based and LLM approaches for product detection
5. **Supabase Service**: Handles data persistence and caching
6. **Server**: Express.js REST API for accessing the scraper functionality

## Development

### Code Structure

- `server.js`: Main entry point and API endpoints
- `crawler.js`: Multi-page crawling implementation
- `page-extractor.js`: Extracts data from different page types
- `enhanced-llm-analyzer.js`: LLM-based business intelligence extraction
- `hybrid-product-detector.js`: Product detection using hybrid approach
- `supabase-service.js`: Data persistence and caching
- `logger.js`: Logging utility
- `db/schema.sql`: Database schema for Supabase

### Running Tests

```bash
npm test
```

## License

[MIT](LICENSE)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 