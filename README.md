# TradeWizard 2.0

An AI-powered export readiness platform designed to help South African SMEs navigate international trade successfully.

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

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (for local development)
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/tradewizard.git

# Install dependencies
cd tradewizard
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

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
# TradeWizard_2.0
