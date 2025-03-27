# TradeWizard Website Intelligence Service

A comprehensive service for analyzing websites to extract business intelligence, product information, and export readiness assessments.

## Features

- **Comprehensive Website Scraping**
  - Configurable page limits (up to 100 pages)
  - Full content extraction
  - Asset detection (PDFs, images, documents)
  - Social media integration

- **Intelligent Analysis**
  - Product detection and classification
  - Business profile extraction
  - Export readiness assessment
  - Market insights generation

- **Local-First Architecture**
  - SQLite database for raw data storage
  - Offline-capable analysis
  - User verification system
  - Controlled sync to Supabase

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with required configuration:
```env
PORT=3000
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

3. Build the project:
```bash
npm run build
```

4. Start the service:
```bash
npm start
```

For development:
```bash
npm run dev
```

## API Endpoints

### Analyze Website
```http
POST /analyze
Content-Type: application/json

{
  "url": "https://example.com",
  "options": {
    "maxPages": 100,
    "includeSocial": true
  }
}
```

### Check Progress
```http
GET /progress/:websiteId
```

### Submit Verification
```http
POST /verify
Content-Type: application/json

{
  "websiteId": "base64_encoded_id",
  "field": "products.0.name",
  "originalValue": "Old Name",
  "correctedValue": "New Name",
  "confidence": 0.9
}
```

### Sync to Supabase
```http
POST /sync/:websiteId
```

## Architecture

### Data Flow
1. Website URL submitted for analysis
2. Content scraped and stored locally
3. Analysis performed in chunks
4. Results available for user verification
5. Verified data synced to Supabase

### Components
- **WebsiteIntelligenceService**: Main service orchestrator
- **ContentChunker**: Smart text processing
- **ProgressTracker**: Real-time progress monitoring
- **LocalDatabase**: SQLite data management
- **OpenAIService**: AI-powered analysis

## Development

### Project Structure
```
src/
├── index.ts              # Main entry point
├── types/               # TypeScript interfaces
├── services/           # Core services
├── database/           # Database management
└── utils/             # Utility functions
```

### Adding New Features
1. Define types in `types/index.ts`
2. Implement service in `services/`
3. Add routes in `index.ts`
4. Update documentation

## Testing

Run tests:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License 