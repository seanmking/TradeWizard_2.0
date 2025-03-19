#!/bin/bash

# Print startup banner
echo "=========================================="
echo "    TradeWizard 2.0 - Startup Script     "
echo "=========================================="

# Define PID file locations
NEXTJS_PID_FILE="./.nextjs.pid"
API_PID_FILE="./.api.pid"

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
      node test-wits-api.js
      exit $?
      ;;
    "wits-provider")
      echo "Running WITS Provider tests..."
      node test-wits-provider-fixed.js
      exit $?
      ;;
    "scraper")
      echo "Running Scraper tests..."
      bash ./test-scraper.sh
      exit $?
      ;;
    "api")
      echo "Running API tests..."
      node test-api.js
      exit $?
      ;;
    "sarah")
      echo "Running Sarah AI tests..."
      node test-sarah.js
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
      node test-wits-api.js
      WITS_RESULT=$?
      
      echo "\n2. API tests:"
      node test-api.js
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
      echo "Available test types: wits-api, wits-provider, scraper, api, sarah, backend, website-analysis, all"
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

# Start scraper service if it exists
if [ -d "tradewizard-scraper-service" ]; then
    echo "Starting scraper microservice..."
    
    # Ensure scripts are executable
    chmod +x tradewizard-scraper-service/start-scraper.sh 2>/dev/null || true
    chmod +x tradewizard-scraper-service/stop-scraper.sh 2>/dev/null || true
    
    # Install dependencies and start service
    (cd tradewizard-scraper-service && npm install && ./start-scraper.sh)
    
    # Verify scraper started successfully
    echo "Verifying scraper service..."
    for i in {1..5}; do
        if curl -s http://localhost:3001/health > /dev/null; then
            echo "✅ Scraper service started and responding at http://localhost:3001"
            break
        fi
        if [ $i -eq 5 ]; then
            echo "❌ Scraper service failed to start"
            echo "⚠️  Website analysis will use fallback mock data"
        fi
        sleep 2
    done
fi

# Start Next.js development server
echo "Starting Next.js development server on port 3000..."
npm run dev -- -p 3000 &
NEXTJS_PID=$!
echo $NEXTJS_PID > $NEXTJS_PID_FILE

# Verify Next.js started successfully
echo "Verifying Next.js server..."
for i in {1..5}; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ Next.js server started successfully"
        break
    fi
    if [ $i -eq 5 ]; then
        echo "❌ Next.js server failed to start"
        exit 1
    fi
    sleep 2
done

# Start backend API
echo "Starting backend API server on port 5002..."
cd backend && PORT=5002 npm run dev &
API_PID=$!
echo $API_PID > $API_PID_FILE
cd ..

# Verify API started successfully
echo "Verifying backend API..."
for i in {1..5}; do
    if curl -s http://localhost:5002/health > /dev/null; then
        echo "✅ Backend API started successfully"
        break
    fi
    if [ $i -eq 5 ]; then
        echo "❌ Backend API failed to start"
        exit 1
    fi
    sleep 2
done

# Register cleanup for termination
cleanup() {
    echo "Received termination signal. Shutting down..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services stop redis
    else
        redis-cli shutdown
    fi
    if [ -d "tradewizard-scraper-service" ]; then
        cd tradewizard-scraper-service && ./stop-scraper.sh && cd ..
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
echo "Available test types: wits-api, wits-provider, scraper, api, sarah, backend, website-analysis, all"
echo "==========================================" 