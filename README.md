# TradeWizard 2.0

A comprehensive AI-driven trade analysis and export readiness assessment platform.

## Project Structure

```
tradewizard_2.0/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── mcp/           # Market Capability Providers
│   │   │   ├── market/    # Market intelligence MCP
│   │   │   ├── compliance/# Compliance & regulations MCP
│   │   │   └── shared/    # Shared MCP utilities
│   │   ├── services/      # Core services
│   │   ├── ai-agent/      # AI orchestration
│   │   └── websocket/     # Real-time communication
│   └── tests/             # Backend tests
├── frontend/              # Next.js frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # Frontend services
│   │   └── types/        # TypeScript definitions
│   └── tests/            # Frontend tests
└── docs/                 # Documentation
```

## Implementation Status

### Phase 1: Web Scraping & Product Detection ✅
- Implemented web scraping service with queue management
- Added hybrid product detection (DOM + LLM)
- Integrated business data extraction

### Phase 2: LLM Integration & Market Intelligence ✅
- Implemented real-time chat interface
- Added market intelligence data processing
- Integrated multiple trade data sources (WITS, Comtrade)

### Phase 3: Export Readiness Assessment ✅
- Implemented assessment framework
- Added compliance cost calculator
- Integrated regulatory requirement analysis

### Phase 4: Market Capability Providers (MCPs) ✅
- Implemented MCP architecture
- Added market intelligence MCP
- Added compliance MCP
- Created shared MCP utilities

### Phase 5: Enhanced Analysis (In Progress) 🚧
- Implementing advanced market analysis
- Adding competitor analysis
- Enhancing visualization components

## Key Components

### Market Capability Providers (MCPs)
The MCP layer provides modular, standardized interfaces for different market capabilities:

- **Market Intelligence MCP**
  - Trade flow analysis
  - Tariff data processing
  - Historical trend analysis
  - Top trading partners identification

- **Compliance MCP**
  - Regulatory requirement analysis
  - Compliance cost calculation
  - Industry-specific requirements

### AI Integration
- LLM-based product analysis
- Context-aware conversation management
- Hybrid analysis approaches

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/seanmking/TradeWizard_2.0.git
```

2. Install dependencies:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. Set up environment variables:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

4. Start development servers:
```bash
# Backend
cd backend
npm run dev

# Frontend
cd ../frontend
npm run dev
```

## Testing

Run tests with:
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Documentation

- [Development Strategy](docs/Development_Strategy.md)
- [Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)
- [API Response Standards](docs/API_RESPONSE_STANDARDS.md)
- [Setup Guide](docs/SETUP_GUIDE.md)
- [Trade Data Providers](docs/trade-data-providers.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
