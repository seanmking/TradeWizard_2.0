# TradeWizard 2.0 Backend - Phase 2

## LLM Product Analysis & AI Conversation Experience

This phase implements two core components of the TradeWizard system:
1. LLM-powered product analysis for accurate classification
2. AI-driven conversation experience for SME guidance

### Key Components

#### 1. LLM Product Analysis Service
- Product identification and classification
- HS code determination with confidence scoring
- Competitive analysis integration
- Market-specific compliance requirements

#### 2. AI Conversation Experience
- Context-aware conversation management
- Staged assessment approach
- Memory management for user preferences and history
- Adaptive guidance based on SME profile

### Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Initialize database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start development server:
```bash
npm run dev
```

### Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for GPT-4
- `PORT`: Server port (default: 3000)

### API Endpoints

#### Product Analysis
- `POST /api/products/analyze`: Analyze product details
- `GET /api/products/:id/compliance`: Get compliance requirements
- `GET /api/products/:id/competitive`: Get competitive analysis

#### Conversation Management
- `POST /api/conversation/start`: Start new conversation
- `POST /api/conversation/:id/message`: Send message
- `GET /api/conversation/:id/context`: Get conversation context

### Database Models

The system uses PostgreSQL with Prisma ORM, including models for:
- HSCode: HS classification codes
- Product: Product information
- ComplianceRequirement: Market-specific requirements
- Conversation: Chat history and context

### Testing

Run tests with:
```bash
npm test
```

### Architecture

The system follows a modular architecture:
- `services/`: Core business logic
- `ai-agent/`: AI conversation management
- `databases/`: Database interactions
- `types/`: TypeScript type definitions
- `config/`: Configuration management

### Contributing

1. Create feature branch
2. Implement changes
3. Add tests
4. Submit pull request

### License

MIT License 