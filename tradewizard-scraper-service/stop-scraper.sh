#!/bin/bash

# Stop the web scraper microservice
echo "Stopping TradeWizard Scraper Microservice..."

# Define PID file
SCRAPER_PID_FILE="./.scraper.pid"

# Check if PID file exists
if [ -f "$SCRAPER_PID_FILE" ]; then
  PID=$(cat $SCRAPER_PID_FILE)
  
  # Check if process exists
  if ps -p $PID > /dev/null; then
    echo "Stopping scraper service with PID $PID"
    kill $PID
    
    # Wait for process to terminate
    sleep 1
    
    # Check if process still exists
    if ps -p $PID > /dev/null; then
      echo "Process still running, forcing termination..."
      kill -9 $PID
    fi
    
    echo "Scraper service stopped successfully"
  else
    echo "No running scraper service found with PID $PID"
  fi
  
  # Remove PID file
  rm $SCRAPER_PID_FILE
else
  echo "No scraper service PID file found"
fi 