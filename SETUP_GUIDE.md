# TradeWizard 2.0 Setup Guide

This guide will help you set up TradeWizard 2.0 on your local machine for development and testing.

## Prerequisites

- Node.js (v16+)
- npm
- Redis
- PostgreSQL (or Supabase account)
- OpenAI API key

## Setup Steps

### 1. Clone the Repository

If you haven't already, clone the repository:

```bash
git clone https://github.com/your-username/TradeWizard_2.0.git
cd TradeWizard_2.0
```

### 2. Configure Environment Variables

TradeWizard 2.0 requires environment variables to be set for proper operation:

#### Main Application (.env)

```
# API Keys and Sensitive Data
SCRAPER_SERVICE_URL=http://localhost:3001
SCRAPER_API_KEY=your_custom_api_key
LLM_API_KEY=sk-your-openai-key

# Service Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tradewizard
DB_USER=postgres
DB_PASSWORD=your_db_password

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

#### Backend (.env in backend folder)

```
# Server configuration
PORT=5002
NODE_ENV=development

# Supabase configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-key

# OpenAI configuration
OPENAI_API_KEY=sk-your-openai-key

# Redis configuration
REDIS_URL=redis://localhost:6379

# Scraper service
SCRAPER_SERVICE_URL=http://localhost:3001
SCRAPER_API_KEY=your_custom_api_key
```

#### Scraper Service (.env in tradewizard-scraper-service folder)

```
# Server configuration
PORT=3001
NODE_ENV=development

# API Keys and Security
API_KEY=your_custom_api_key

# Logging Configuration
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Install Dependencies

Install dependencies for the main app, backend, and scraper service:

```bash
# Main app
npm install

# Backend
cd backend
npm install
cd ..

# Scraper service
cd tradewizard-scraper-service
npm install
cd ..
```

### 4. Database Setup

#### Option 1: Local PostgreSQL

1. Install PostgreSQL
2. Create a database named `tradewizard`
3. Run the SQL schema from `supabase-tables.sql`:
   ```bash
   psql -U postgres -d tradewizard -f supabase-tables.sql
   ```

#### Option 2: Supabase (Hosted)

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and service_role key from the API settings
4. Update your `.env` files with these credentials
5. Run the SQL from `supabase-tables.sql` in the Supabase SQL Editor

### 5. Redis Setup

Ensure Redis is installed and running:

```bash
# macOS (Homebrew)
brew install redis
brew services start redis

# Verify Redis is running
redis-cli ping
# Should respond with PONG
```

### 6. Set Up API Keys

1. OpenAI API key: Obtain one from [platform.openai.com](https://platform.openai.com)
2. Scraper API key: Create your own secure key to use consistently across all .env files

### 7. Run the Verification Script

```bash
./verify-setup.sh
```

This will check your configuration and tell you what needs to be updated.

### 8. Start the Application

Make sure all scripts are executable:

```bash
chmod +x start.sh stop.sh
chmod +x tradewizard-scraper-service/start-scraper.sh tradewizard-scraper-service/stop-scraper.sh
```

Start the application:

```bash
./start.sh
```

The application should now be running at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5002
- Scraper Service: http://localhost:3001

### 9. Running Tests

```bash
# Run all tests
./start.sh test all

# Run specific test suite
./start.sh test backend
./start.sh test api
./start.sh test wits-api
./start.sh test scraper
./start.sh test website-analysis
```

## Troubleshooting

1. **Port conflicts**: If you encounter port conflicts, use the `stop.sh` script to clean up processes.

2. **Redis connection issues**: Ensure Redis is running with `redis-cli ping`

3. **Database connection issues**: Check your database credentials and ensure the database exists

4. **API key issues**: Verify that all API keys are correctly set in the environment files

5. **Missing dependencies**: Run `npm install` in each directory to ensure all dependencies are installed

## Stopping the Application

```bash
./stop.sh
```

This will gracefully shut down all services. 