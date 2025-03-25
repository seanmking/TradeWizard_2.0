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

## Implementation Plan

The implementation is divided into phases:

### Phase 1: Website Intelligence & Product Identification (Current Phase)
- Web scraping capabilities
- DOM-based product detector
- Extract product details from websites
- Create structured output format

### Phase 2: LLM Product Analysis
- LLM service for product classification
- Develop prompts for product analysis
- Create parsing logic for LLM responses
- HS code identification capability

### Phase 3: Hybrid Product Detection
- Combine web scraping and LLM analysis
- Logic for DOM vs. LLM detection
- Confidence scoring for products
- API endpoints for product detection

### Future Phases
- Integration with Compliance MCP
- Integration with Market Intelligence MCP
- User Interface for Product Management
- Optimization and Testing

## Current Status (Phase 1)

- ✅ Basic Express server setup with routing structure
- ✅ Database models defined (BusinessProfile, ProductCatalog, ExtractionResult)
- ✅ API routes for different extraction types established
- ✅ Verification components implemented (EditableField, SourceAttribution, etc.)
- ⚠️ Web scraping functionality partially implemented
- ⚠️ IntelligenceService integration in progress
- ⚠️ Some linter errors and type issues to be resolved

## Technology Stack

- **Frontend**: Next.js 14, React, shadcn/ui components, TailwindCSS
- **Backend**: Express.js (Node.js)
- **Database**: Supabase (PostgreSQL)
- **AI Agent**: Node.js with OpenAI SDK
- **Web Scraping**: Puppeteer/Playwright, Readability.js
