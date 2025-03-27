# Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Redis (v6 or higher)
- Git

## Environment Setup

1. **Clone the Repository**
```bash
git clone https://github.com/seanmking/TradeWizard_2.0.git
cd TradeWizard_2.0
```

2. **Backend Setup**

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tradewizard"

# Redis
REDIS_URL="redis://localhost:6379"

# External APIs
WITS_API_KEY="your_wits_api_key"
COMTRADE_API_KEY="your_comtrade_api_key"
OPENAI_API_KEY="your_openai_api_key"

# Server
PORT=3001
NODE_ENV="development"
```

3. **Frontend Setup**

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

Edit frontend `.env`:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
```

## Database Setup

1. **Create PostgreSQL Database**

```bash
psql -U postgres
CREATE DATABASE tradewizard;
```

2. **Run Migrations**

```bash
cd backend
npx prisma migrate dev
```

## Running the Application

1. **Start Backend Services**

```bash
cd backend

# Development mode
npm run dev

# Production mode
npm run build
npm start
```

2. **Start Frontend Development Server**

```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Testing

1. **Backend Tests**

```bash
cd backend

# Run all tests
npm test

# Run specific test suite
npm test -- market-intelligence

# Run with coverage
npm run test:coverage
```

2. **Frontend Tests**

```bash
cd frontend

# Run all tests
npm test

# Run with watch mode
npm test -- --watch
```

## Development Tools

### Linting

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

### Type Checking

```bash
# Backend
cd backend
npm run type-check

# Frontend
cd frontend
npm run type-check
```

## Common Issues

1. **Database Connection Issues**
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists

2. **Redis Connection Issues**
- Verify Redis server is running
- Check Redis URL in `.env`

3. **API Key Issues**
- Verify all API keys are valid
- Check rate limits
- Ensure proper formatting in `.env`

## Deployment

1. **Backend Deployment**
- Set up production database
- Configure environment variables
- Set up PM2 or similar process manager

2. **Frontend Deployment**
- Build the production bundle
- Configure CDN (optional)
- Set up environment variables

## Monitoring

1. **Backend Monitoring**
- Check logs in `backend/logs`
- Monitor Redis cache usage
- Watch API rate limits

2. **Frontend Monitoring**
- Check browser console
- Monitor network requests
- Track performance metrics

## Support

For additional support:
- Check the [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- Review [Development Strategy](Development_Strategy.md)
- Consult [Trade Data Providers](trade-data-providers.md)
- Open an issue on GitHub 