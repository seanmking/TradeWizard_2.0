# TradeWizard 2.0

## Project Overview
TradeWizard is an AI-powered platform designed to help South African SMEs navigate international trade complexities, providing export readiness assessments, market intelligence, and compliance guidance.

## Recent Updates
### Codebase Cleanup (Phase 3 & 4)
- Removed mock data files and hardcoded test responses
- Enhanced `.gitignore` to prevent tracking of temporary and mock files
- Updated documentation to reflect project structure and development guidelines

## Project Structure
```
TradeWizard_2.0/
├── src/
│   ├── trade-data-providers/
│   │   ├── wits-dynamic-provider.ts
│   │   ├── un-comtrade-dynamic-provider.ts
│   │   └── trade-data-providers-config.ts
│   └── ...
├── tests/
│   └── trade-data-test.ts
└── docs/
```

## Development Setup

### Prerequisites
- Node.js (v16+)
- npm or yarn
- API Keys for:
  - WITS API
  - UN Comtrade API

### Environment Configuration
1. Copy `.env.example` to `.env`
2. Fill in API keys and configuration

### Installation
```bash
npm install
npm run setup
```

## Testing
```bash
npm test
```

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
[Your License Here]
