# TradeWizard 2.0: AI-Powered Export Readiness Platform

## Project Overview
TradeWizard is an innovative AI-powered platform designed to help African SMEs navigate the complexities of international trade and exports.

## Project Structure
- `/src`: Main source code directory
  - `/ai-agent`: AI agent core functionality
  - `/components`: Shared React components
  - `/mcp`: Middleware Component Providers (Compliance, Market Intelligence, Export Operations)
  - `/lib`: Core libraries and utilities
  - `/types`: Shared TypeScript type definitions

- `/tests`: Organized test files
  - `/unit`: Unit tests
  - `/integration`: Integration tests
  - `/api`: API tests

- `/scripts`: Build and helper scripts

## Development Setup

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn
- TypeScript

### Installation
1. Clone the repository
2. Copy `.env.example` to `.env` and fill in required API keys
3. Install dependencies:
   ```bash
   npm install
   ```

### Running Tests
```bash
npm test
```

### Code Style & Conventions
- TypeScript with strict type checking
- React with functional components
- Tailwind CSS for styling
- Jest for testing

## Trade Data Providers
TradeWizard integrates multiple trade data sources:
- WITS (World Integrated Trade Solution)
- UN Comtrade

### Environment Configuration
Ensure you have the following environment variables:
- `WITS_API_KEY`
- `UN_COMTRADE_API_KEY`

## Contributing
Please read `CONTRIBUTING.md` for details on our code of conduct and the process for submitting pull requests.

## License
[Specify License]

## Acknowledgments
- African Continental Free Trade Area (AfCFTA)
- Supported by [Your Organization/Sponsors]
