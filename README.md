# TradeWizard 2.0 - Enhanced AI Cost Optimization

This project implements an enhanced hybrid model selector with cost-saving measures for the TradeWizard application. The system intelligently selects the most appropriate AI model based on task complexity and implements various cost optimization strategies.

## Key Components

### 1. Hybrid Model Selector

The model selector dynamically chooses the most appropriate AI model based on:
- Task type (regulatory analysis, market research, etc.)
- Content complexity (determined by analyzing website content)
- User preferences and requirements

### 2. Redis Caching Layer

A Redis-based caching system that:
- Stores responses with configurable TTL based on data type
- Provides significant cost savings by avoiding redundant API calls
- Tracks cache performance metrics (hit rate, cost savings)

### 3. Dynamic Prompt Generation

A system that:
- Creates optimized prompts based on industry and query type
- Reduces token usage while maintaining response quality
- Adapts to different use cases with specialized templates

### 4. Web Scraper Integration

A web scraper that:
- Analyzes website content to determine complexity
- Helps select the appropriate model based on content characteristics
- Identifies content type for appropriate caching strategies
- Detects products from SME websites using hybrid DOM/LLM analysis

### 5. Cost Monitoring Dashboard

An admin dashboard that:
- Displays real-time cost metrics and savings
- Breaks down usage by model and task type
- Identifies cost anomalies and trends
- Shows cache performance statistics

## Implementation Details

### Hybrid Product Detection

The system uses a sophisticated approach to detect products on SME websites:

1. **DOM-based detection** first analyzes the HTML structure to identify:
   - Repeating patterns (product grids/lists)
   - Image-text pairs that likely represent products
   - Price patterns and indicators

2. **LLM enhancement** is applied selectively when:
   - DOM detection is uncertain (low confidence scores)
   - Website structure is complex
   - Few or no products are detected via DOM methods

This hybrid approach optimizes for both accuracy and cost, using the more expensive LLM component only when necessary.

### Model Selection Logic

The system uses a sophisticated algorithm to select the most appropriate model:
- Low complexity tasks use more efficient models (e.g., GPT-3.5 Turbo)
- High complexity tasks use more capable models (e.g., GPT-4)
- Website content analysis influences model selection

### Caching Strategy

The Redis cache implements different TTL (Time-To-Live) values based on data type:
- Regulatory data: 24 hours
- Market trends: 7 days
- Country profiles: 30 days
- Product information: 14 days

### Cost Savings Calculation

The system tracks cost savings from:
1. Model selection (using cheaper models when appropriate)
2. Caching (avoiding redundant API calls)
3. Prompt optimization (reducing token usage)

## Getting Started

### Prerequisites

- Node.js 18+
- Redis server
- Next.js

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   ```
   REDIS_URL=redis://localhost:6379
   OPENAI_API_KEY=your_api_key
   ```
4. Run the development server:
   ```
   npm run dev
   ```

### Usage

The system is integrated into the main AI service and can be used through:

```typescript
import { processOptimizedQuery } from './app/lib/services/ai/integration';

// Process a query with cost optimization
const result = await processOptimizedQuery(
  "What are the export regulations for medical devices to Germany?",
  "regulatory_analysis",
  "https://example.com/medical-device-regulations"
);

console.log(`Response: ${result.response}`);
console.log(`Cost savings: $${result.costSavings.toFixed(4)}`);
```

## Web Scraper Integration

The enhanced web scraper provides:

```typescript
import { WebScraperService } from './src/lib/services/web-scraper.service';

const scraper = new WebScraperService();

// Detect products on an SME website
const productResults = await scraper.scrapeProducts('https://example.com');

// Extract website metadata
const metadata = scraper.extractMetadata(html);

// Analyze website structure complexity
const structure = scraper.analyzeStructure(html);

// Detect contact information
const contactInfo = scraper.detectContactInfo(html);
```

## Dashboard

Access the cost monitoring dashboard at `/admin/cost-monitoring` to view:
- Total costs and tokens used
- Usage breakdown by model and task type
- Cache performance metrics
- Cost anomaly alerts

## Future Enhancements

- Integration with more AI models for greater flexibility
- Machine learning-based model selection
- Advanced content analysis for better complexity determination
- Predictive caching for frequently requested information

## Project Overview

TradeWizard simplifies the export journey for SMEs by providing:

- AI-driven export readiness assessments
- Market intelligence and opportunity identification
- Regulatory compliance guidance
- Logistics and operations support

## Architecture

TradeWizard follows a three-layer architecture:

1. **AI Agent** - Handles user interactions and generates personalized insights
2. **MCP (Middleware Component Providers)** - Processes structured data from multiple sources
3. **Database** - Stores user data, export progress, and cached intelligence

## Development Guidelines

Please refer to the following documents before contributing:

- [Development Strategy](./Development_Strategy.md) - Overall project vision and approach
- [cursor.rules](./cursor.rules) - Coding standards and conventions

## Technology Stack

- **Frontend:** Next.js 14, shadcn UI, TailwindCSS
- **Backend:** Express.js (Node.js)
- **Database:** Supabase (PostgreSQL)
- **AI Integration:** OpenAI SDK
- **Deployment:** Vercel (frontend), Railway (backend)

## Project Structure

```
tradewizard/
├── frontend/              # Next.js application
│   ├── app/               # App router directories
│   ├── components/        # UI components
│   ├── lib/               # Utility functions and shared code
│   └── public/            # Static assets
│
├── backend/               # Express.js server
│   ├── src/
│   │   ├── api/           # API routes and controllers
│   │   ├── middleware/    # Custom middleware
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Utility functions
│   │   ├── models/        # Data models
│   │   ├── config/        # Configuration files
│   │   └── mcp/           # Middleware Component Providers
│   │       ├── compliance-mcp/         # Compliance processing
│   │       ├── market-insights-mcp/    # Market intelligence
│   │       └── export-operations-mcp/  # Export logistics
│   └── dist/              # Compiled JavaScript output
```

## License

This project is proprietary and confidential. Unauthorized use, reproduction, or distribution is prohibited.
