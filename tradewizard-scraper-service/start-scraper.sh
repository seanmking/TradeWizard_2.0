#!/bin/bash

# Start the web scraper microservice
echo "Starting TradeWizard Scraper Microservice..."

# Define PID file
SCRAPER_PID_FILE="./.scraper.pid"

# Check if running already
if [ -f "$SCRAPER_PID_FILE" ]; then
  PID=$(cat $SCRAPER_PID_FILE)
  if ps -p $PID > /dev/null; then
    echo "Scraper service is already running with PID $PID"
    exit 0
  else
    echo "Removing stale PID file"
    rm $SCRAPER_PID_FILE
  fi
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the scraper service
npm run dev &
SCRAPER_PID=$!
echo "Scraper service started with PID: $SCRAPER_PID"
echo $SCRAPER_PID > $SCRAPER_PID_FILE

echo "Scraper service is running at http://localhost:3001"
echo "Use stop-scraper.sh to stop the service" 