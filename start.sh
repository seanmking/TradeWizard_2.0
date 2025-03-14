#!/bin/bash

# Print startup banner
echo "=========================================="
echo "    TradeWizard 2.0 - Startup Script     "
echo "=========================================="

# Define PID file locations
NEXTJS_PID_FILE="./.nextjs.pid"
API_PID_FILE="./.api.pid"

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
      
      cd ..
      
      echo "\n=========================================="
      echo "Test Results:"
      echo "WITS API tests: $([ $WITS_RESULT -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
      echo "API tests: $([ $API_RESULT -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
      echo "Backend tests: $([ $BACKEND_RESULT -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
      echo "=========================================="
      
      # Return failure if any test failed
      [ $WITS_RESULT -eq 0 ] && [ $API_RESULT -eq 0 ] && [ $BACKEND_RESULT -eq 0 ]
      exit $?
      ;;
    *)
      echo "Unknown test type: $TEST_TYPE"
      echo "Available test types: wits-api, wits-provider, scraper, api, sarah, backend, all"
      exit 1
      ;;
  esac
fi

# First run the stop script to ensure clean state
echo "Ensuring no existing processes are running..."
bash ./stop.sh

# Check for required dependencies
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

# Start the scraper service if it exists
if [ -d "tradewizard-scraper-service" ]; then
  echo "Starting scraper microservice..."
  
  # Check if start-scraper.sh exists and is executable
  if [ ! -f "tradewizard-scraper-service/start-scraper.sh" ]; then
    echo "❌ start-scraper.sh not found in scraper service directory!"
    echo "⚠️  Website analysis will use fallback mock data."
  elif [ ! -x "tradewizard-scraper-service/start-scraper.sh" ]; then
    echo "Making start-scraper.sh executable..."
    chmod +x tradewizard-scraper-service/start-scraper.sh
  fi
  
  # Ensure the stop-scraper.sh is also executable
  if [ -f "tradewizard-scraper-service/stop-scraper.sh" ] && [ ! -x "tradewizard-scraper-service/stop-scraper.sh" ]; then
    chmod +x tradewizard-scraper-service/stop-scraper.sh
  fi
  
  # Check for required scraper dependencies 
  echo "Checking scraper service dependencies..."
  (cd tradewizard-scraper-service && npm install)
  
  # Try to start the scraper service and capture any errors
  (cd tradewizard-scraper-service && ./start-scraper.sh)
  
  # Give the service a moment to start
  sleep 2
  
  # Check if the scraper service actually started
  if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Scraper service started and responding at http://localhost:3001"
  else
    echo "❌ Scraper service failed to start or is not responding"
    echo "⚠️  Website analysis will use fallback mock data."
    echo "Check logs in tradewizard-scraper-service/combined.log for details"
  fi
else
  echo "⚠️  Scraper service directory not found. Website analysis will use fallback mock data."
fi

# Wait a moment for processes to terminate completely
sleep 1

# Start Next.js development server without opening browser
echo "Starting Next.js development server..."
npm run dev -- -p 3000 &
NEXTJS_PID=$!
echo "Next.js server started with PID: $NEXTJS_PID"
echo $NEXTJS_PID > $NEXTJS_PID_FILE

# If you have a backend API, start it here
echo "Starting backend API server..."
cd backend && npm run dev &
API_PID=$!
echo "Backend API server started with PID: $API_PID"
echo $API_PID > $API_PID_FILE
cd ..

# Register trap to handle termination signals
cleanup() {
  echo "Received termination signal. Shutting down..."
  # Stop the scraper service if running
  if [ -d "tradewizard-scraper-service" ]; then
    cd tradewizard-scraper-service && ./stop-scraper.sh && cd ..
  fi
  bash ./stop.sh
  exit 0
}

# Set up trap for common termination signals
trap cleanup SIGINT SIGTERM

echo ""
echo "All processes started!"
echo "Application is running at: http://localhost:3000"
echo "Scraper service running at: http://localhost:3001"
echo "Backend API running at: http://localhost:5002"
echo "To stop all processes, run: ./stop.sh"
echo "To run tests, use: ./start.sh test [test-type]"
echo "Available test types: wits-api, wits-provider, scraper, api, sarah, backend, all"
echo "==========================================" 