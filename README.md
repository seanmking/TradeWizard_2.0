# TradeWizard 2.0

## Overview

TradeWizard is an AI-powered platform designed to help South African SMEs successfully navigate international exports. This platform addresses core challenges faced by SMEs:

- Complex export compliance and certification requirements
- Lack of market intelligence and export opportunities
- Overwhelming logistics and operational challenges

## Architecture

TradeWizard uses a hybrid architecture with three main components:

1. **AI Agent Layer**: Handles user interactions, processes data from MCPs, generates insights, and manages export readiness scoring
2. **MCP Layer (Model Context Protocol)**:
   - **Compliance MCP**: Handles regulatory requirements and certification data
   - **Market Intelligence MCP**: Manages trade flow data and market opportunities
   - **Export Logistics MCP**: Manages logistics, shipping information, and supply chain solutions
3. **Database Layer**: Manages user profiles, progress tracking, and assessment data

## Implementation Status

### Phase 1: Website Intelligence & Product Identification (Current Phase) ✅

We've successfully implemented the core components for website intelligence extraction:

- **Web Scraping Service**: Using Puppeteer and Readability to extract structured content from websites
- **DOM-based Product Detector**: Analyzes web page content to identify products
- **Business Information Extractor**: Identifies business details like name, contact info, and social media
- **Intelligence Service**: Coordinates extraction processes and stores results in database
- **API Routes**: Endpoints for triggering extraction from different sources (website, social media, documents)
- **Data Models**: Mongoose schemas for storing extracted products, business profiles, and extraction results
- **Confidence Scoring**: Algorithm to assess reliability of extracted information

### Future Phases

#### Phase 2: LLM Product Analysis
- LLM service for product classification
- Develop prompts for product analysis
- Create parsing logic for LLM responses
- HS code identification capability

#### Phase 3: Hybrid Product Detection
- Combine web scraping and LLM analysis
- Logic for DOM vs. LLM detection
- Confidence scoring for products
- API endpoints for product detection

#### Phase 4 and Beyond
- Integration with Compliance MCP
- Integration with Market Intelligence MCP
- User Interface for Product Management
- Optimization and Testing

## Technology Stack

- **Frontend**: Next.js 14, React, shadcn/ui components, TailwindCSS
- **Backend**: Express.js (Node.js)
- **Database**: MongoDB (Mongoose)
- **Web Scraping**: Puppeteer, Readability
- **Logging**: Winston

## Getting Started

1. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

2. Run in development mode:
   ```
   npm run dev
   ```

3. Test the API:
   ```
   curl -X POST http://localhost:3001/api/extract/website -H "Content-Type: application/json" -d '{"url": "https://example.com"}'
   ```

## Components

### Web Extraction Services

The system uses multiple approaches to extract product and business information:

1. **Web Scraper**: Uses Puppeteer for browser automation to extract raw page content
2. **DOM Product Detector**: Analyzes page structure with strategies like:
   - Schema.org markup detection
   - Common product patterns
   - OpenGraph metadata
3. **Business Information Extractor**: Identifies company details from pages

### Intelligence Service

Acts as the coordinator, managing:
- Extraction processes
- Confidence scoring
- Data storage
- Result tracking

### Data Models

- **Product Catalog**: Stores product information with confidence scores
- **Business Profile**: Records business details and their sources
- **Extraction Result**: Tracks extraction jobs and their status

## Next Steps

- Implement LLM integration for enhanced product classification
- Add more test cases for extraction reliability
- Develop frontend components to display and edit extracted results
