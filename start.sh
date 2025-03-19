#!/bin/bash

# Print startup banner
echo "=========================================="
echo "    TradeWizard 2.0 - Startup Script     "
echo "=========================================="

# Define PID file locations
NEXTJS_PID_FILE="./.nextjs.pid"
API_PID_FILE="./.api.pid"
SCRAPER_PID_FILE="./.scraper.pid"

# 1. ONCE: Kill all existing processes with proper verification
echo "Cleaning up existing processes..."
if ! bash ./stop.sh; then
    echo "❌ Initial cleanup failed"
    exit 1
fi

# 2. Verify ports are free (with retries)
echo "Verifying ports are available..."
for port in 3000 3001 5002; do
    for i in {1..3}; do
        if lsof -i :$port > /dev/null 2>&1; then
            echo "Port $port still in use, attempt $i of 3..."
            sleep 2
            # More aggressive cleanup on retries
            kill -9 $(lsof -t -i:$port) 2>/dev/null || true
        else
            echo "✅ Port $port is available"
            break
        fi
    done
    
    # Final check
    if lsof -i :$port > /dev/null 2>&1; then
        echo "❌ ERROR: Could not free port $port after multiple attempts"
        echo "Please manually kill the process using:"
        echo "lsof -ti:$port | xargs kill -9"
        exit 1
    fi
done

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
    echo "✅ Loaded environment variables from .env"
fi

if [ -f ".env.local" ]; then
    export $(grep -v '^#' .env.local | xargs)
    echo "✅ Loaded environment variables from .env.local"
fi

# Ensure OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    if [ -f ".env" ] && grep -q "OPENAI_API_KEY" .env; then
        export OPENAI_API_KEY=$(grep "OPENAI_API_KEY" .env | cut -d= -f2)
    elif [ -f ".env.local" ] && grep -q "OPENAI_API_KEY" .env.local; then
        export OPENAI_API_KEY=$(grep "OPENAI_API_KEY" .env.local | cut -d= -f2)
    elif [ -f "tradewizard-scraper-service/.env" ] && grep -q "OPENAI_API_KEY" tradewizard-scraper-service/.env; then
        export OPENAI_API_KEY=$(grep "OPENAI_API_KEY" tradewizard-scraper-service/.env | cut -d= -f2)
    else
        echo "❌ ERROR: OPENAI_API_KEY is not set in any .env file"
        echo "Please add it to .env or .env.local"
        exit 1
    fi
    echo "✅ Set OPENAI_API_KEY from environment files"
fi

# Check for command line arguments
MODE="run"
TEST_TYPE=""

# Process command line arguments
if [ "$1" == "test" ]; then
    MODE="test"
    TEST_TYPE="$2"
    echo "Running in TEST mode: $TEST_TYPE"
fi

# If we're in test mode, just run the tests and exit
if [ "$MODE" == "test" ]; then
  echo "=========================================="
  echo "    TradeWizard 2.0 - Test Runner        "
  echo "=========================================="
  
  case "$TEST_TYPE" in
    "wits-api")
      echo "Running WITS API tests..."
      node tests/wits/test-wits-api.js
      exit $?
      ;;
    "wits-provider")
      echo "Running WITS Provider tests..."
      node tests/wits/test-wits-provider-fixed.js
      exit $?
      ;;
    "scraper")
      echo "Running Scraper tests..."
      bash ./tradewizard-scraper-service/test-scraper.sh
      exit $?
      ;;
    "api")
      echo "Running API tests..."
      node tests/test-api.js
      exit $?
      ;;
    "backend")
      echo "Running backend unit tests..."
      cd backend && npm test
      exit $?
      ;;
    "website-analysis")
      echo "Running Website Analysis tests..."
      bash ./test-website-analysis.sh
      exit $?
      ;;
    "all")
      echo "Running all tests..."
      echo "\n1. WITS API tests:"
      node tests/wits/test-wits-api.js
      WITS_RESULT=$?
      
      echo "\n2. API tests:"
      node tests/test-api.js
      API_RESULT=$?
      
      echo "\n3. Backend unit tests:"
      cd backend && npm test
      BACKEND_RESULT=$?
      
      echo "\n4. Website Analysis tests:"
      bash ./test-website-analysis.sh
      WEBSITE_RESULT=$?
      
      cd ..
      
      echo "\n=========================================="
      echo "Test Results:"
      echo "WITS API tests: $([ $WITS_RESULT -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
      echo "API tests: $([ $API_RESULT -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
      echo "Backend tests: $([ $BACKEND_RESULT -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
      echo "Website Analysis tests: $([ $WEBSITE_RESULT -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
      echo "=========================================="
      
      # Return failure if any test failed
      [ $WITS_RESULT -eq 0 ] && [ $API_RESULT -eq 0 ] && [ $BACKEND_RESULT -eq 0 ] && [ $WEBSITE_RESULT -eq 0 ]
      exit $?
      ;;
    *)
      echo "Unknown test type: $TEST_TYPE"
      echo "Available test types: wits-api, wits-provider, scraper, api, backend, website-analysis, all"
      exit 1
      ;;
  esac
fi

# 3. Check and install dependencies
echo "Checking for required dependencies..."
if ! npm list axios --silent > /dev/null 2>&1; then
    echo "⚠️  Dependencies missing: axios"
    echo "Installing missing dependencies..."
    npm install axios
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies. Some functionality may not work."
    else
        echo "✅ Dependencies installed successfully!"
    fi
else
    echo "✅ All required dependencies are installed."
fi

# 4. Check and start Redis
echo "Checking Redis status..."
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis is not installed"
    echo "Installing Redis..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install redis
        if [ $? -ne 0 ]; then
            echo "❌ Failed to install Redis. AI features may not work correctly."
            exit 1
        fi
    else
        echo "❌ Please install Redis manually for your operating system."
        exit 1
    fi
fi

if ! redis-cli ping &> /dev/null; then
    echo "Starting Redis server..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start redis
        if [ $? -ne 0 ]; then
            echo "❌ Failed to start Redis. AI features may not work correctly."
            exit 1
        fi
    else
        redis-server &
    fi
    
    # Wait for Redis to start
    sleep 2
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis server started successfully!"
    else
        echo "❌ Redis server failed to start. AI features may not work correctly."
        exit 1
    fi
else
    echo "✅ Redis server is already running"
fi

# 5. Start services in sequence, verifying each one
echo "Starting services..."

# Start scraper service first
if [ -d "tradewizard-scraper-service" ]; then
    echo "Starting scraper microservice on port 3001..."
    
    # Create or update scraper .env file to ensure port is set correctly
    if [ -f "tradewizard-scraper-service/.env" ]; then
        # Ensure PORT is set to 3001
        grep -q "^PORT=" "tradewizard-scraper-service/.env" && \
        sed -i.bak "s/^PORT=.*/PORT=3001/" "tradewizard-scraper-service/.env" || \
        echo "PORT=3001" >> "tradewizard-scraper-service/.env"
        
        # Ensure OpenAI API key is set
        grep -q "^OPENAI_API_KEY=" "tradewizard-scraper-service/.env" && \
        sed -i.bak "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_API_KEY|" "tradewizard-scraper-service/.env" || \
        echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> "tradewizard-scraper-service/.env"
    else
        echo "PORT=3001" > "tradewizard-scraper-service/.env"
        echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> "tradewizard-scraper-service/.env"
    fi
    
    # Start service - using node directly instead of nodemon to avoid dependency issues
    cd tradewizard-scraper-service
    npm install
    
    # Check if nodemon is installed locally
    if [ -e "node_modules/.bin/nodemon" ]; then
        echo "Using locally installed nodemon..."
        PORT=3001 OPENAI_API_KEY=$OPENAI_API_KEY ./node_modules/.bin/nodemon server.js &
    else
        echo "Nodemon not found, using node directly..."
        PORT=3001 OPENAI_API_KEY=$OPENAI_API_KEY node server.js &
    fi
    
    SCRAPER_PID=$!
    echo $SCRAPER_PID > $SCRAPER_PID_FILE
    cd ..
    
    # Verify scraper started successfully
    echo "Verifying scraper service..."
    for i in {1..10}; do
        if curl -s http://localhost:3001/health > /dev/null; then
            echo "✅ Scraper service started and responding at http://localhost:3001"
            break
        fi
        if [ $i -eq 10 ]; then
            echo "❌ Scraper service failed to start"
            echo "⚠️  Website analysis will use fallback mock data"
        fi
        sleep 2
    done
fi

# Verify backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ ERROR: backend directory does not exist!"
    echo "Please make sure the backend directory is present in the project root."
    exit 1
fi

# Start backend API
echo "Starting backend API server on port 5002..."
cd backend
# Ensure backend .env has the OpenAI API key
if [ -f ".env" ]; then
    grep -q "^OPENAI_API_KEY=" ".env" && \
    sed -i.bak "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_API_KEY|" ".env" || \
    echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> ".env"
else
    echo "OPENAI_API_KEY=$OPENAI_API_KEY" > ".env"
fi

# Check if ts-node-dev is available
if [ -e "node_modules/.bin/ts-node-dev" ]; then
    echo "Starting backend with ts-node-dev..."
    OPENAI_API_KEY=$OPENAI_API_KEY PORT=5002 ./node_modules/.bin/ts-node-dev --respawn --transpile-only src/index.ts &
else
    echo "Installing backend dependencies..."
    npm install
    
    if [ -e "node_modules/.bin/ts-node-dev" ]; then
        echo "Starting backend with ts-node-dev..."
        OPENAI_API_KEY=$OPENAI_API_KEY PORT=5002 ./node_modules/.bin/ts-node-dev --respawn --transpile-only src/index.ts &
    else
        echo "❌ ERROR: ts-node-dev not found, cannot start backend"
        exit 1
    fi
fi

API_PID=$!
echo $API_PID > $API_PID_FILE
cd ..

# Verify API started successfully
echo "Verifying backend API..."
for i in {1..15}; do
    if curl -s http://localhost:5002/health > /dev/null; then
        echo "✅ Backend API started successfully"
        break
    fi
    
    # Only show message every 5 seconds
    if (( i % 5 == 0 )); then
        echo "Still waiting for backend API to start (${i}s)..."
    fi
    
    if [ $i -eq 15 ]; then
        echo "❌ Backend API failed to start"
        echo "Check backend logs for errors"
        exit 1
    fi
    sleep 1
done

# Start Next.js development server (last, after all backend services)
echo "Starting Next.js development server on port 3000..."
OPENAI_API_KEY=$OPENAI_API_KEY npm run dev -- -p 3000 &
NEXTJS_PID=$!
echo $NEXTJS_PID > $NEXTJS_PID_FILE

# Verify Next.js started successfully
echo "Verifying Next.js server..."
for i in {1..15}; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ Next.js server started successfully"
        break
    fi
    
    # Only show message every 5 seconds
    if (( i % 5 == 0 )); then
        echo "Still waiting for Next.js to start (${i}s)..."
    fi
    
    if [ $i -eq 15 ]; then
        echo "❌ Next.js server failed to start"
        echo "Check frontend logs for errors"
        exit 1
    fi
    sleep 1
done

# Register cleanup for termination
cleanup() {
    echo "Received termination signal. Shutting down..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services stop redis
    else
        redis-cli shutdown
    fi
    bash ./stop.sh
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "All processes started successfully!"
echo "Application is running at: http://localhost:3000"
echo "Scraper service running at: http://localhost:3001"
echo "Backend API running at: http://localhost:5002"
echo "Redis server running at: localhost:6379"
echo "To stop all processes, run: ./stop.sh"
echo "To run tests, use: ./start.sh test [test-type]"
echo "Available test types: wits-api, wits-provider, scraper, api, backend, website-analysis, all"
echo "==========================================" 