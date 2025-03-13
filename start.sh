#!/bin/bash

# Print startup banner
echo "=========================================="
echo "    TradeWizard 2.0 - Startup Script     "
echo "=========================================="

# Define PID file locations
NEXTJS_PID_FILE="./.nextjs.pid"
API_PID_FILE="./.api.pid"

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
  cd tradewizard-scraper-service && ./start-scraper.sh && cd ..
  echo "✅ Scraper service started"
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
# echo "Starting backend API server..."
# cd backend && npm start &
# API_PID=$!
# echo "Backend API server started with PID: $API_PID"
# echo $API_PID > $API_PID_FILE

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
echo "To stop all processes, run: ./stop.sh"
echo "===========================================" 