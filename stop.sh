#!/bin/bash

# Print shutdown banner
echo "=========================================="
echo "    TradeWizard 2.0 - Shutdown Script    "
echo "=========================================="

# Define PID file locations
NEXTJS_PID_FILE="./.nextjs.pid"
API_PID_FILE="./.api.pid"

# Function to stop a process using its PID file and pattern
stop_process() {
  local pid_file=$1
  local pattern=$2
  local name=$3
  
  echo "Stopping $name processes..."
  
  # First try to use the PID file if it exists
  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    if [ -n "$pid" ] && ps -p $pid > /dev/null; then
      echo "Killing $name process with PID: $pid"
      kill -15 $pid  # Try SIGTERM first for graceful shutdown
      sleep 1
      
      # Check if process is still running, use SIGKILL if needed
      if ps -p $pid > /dev/null; then
        echo "Process still running, using SIGKILL..."
        kill -9 $pid
      fi
      
      echo "$name process stopped."
      rm -f $pid_file
    else
      echo "PID file exists but process is not running."
      rm -f $pid_file
    fi
  fi
  
  # Fallback: Search for any remaining processes by pattern
  local remaining_pids=$(pgrep -f "$pattern")
  if [ -n "$remaining_pids" ]; then
    echo "Found remaining $name processes: $remaining_pids"
    echo "Killing remaining processes..."
    kill -9 $remaining_pids
    echo "All remaining $name processes stopped."
  else
    echo "No other running $name processes found."
  fi
}

# Stop the Next.js server
stop_process "$NEXTJS_PID_FILE" "node.*next" "Next.js"

# Stop backend API if applicable
stop_process "$API_PID_FILE" "node.*backend" "backend API"

# After stopping the backend API
# Stop the scraper service if it exists
if [ -d "tradewizard-scraper-service" ]; then
  echo "Stopping scraper microservice..."
  cd tradewizard-scraper-service && ./stop-scraper.sh && cd ..
  echo "Scraper service stopped"
fi

# Verify that all relevant Node.js processes are stopped
remaining_node=$(pgrep -f "node.*(next|backend)" || echo "")
if [ -n "$remaining_node" ]; then
  echo "WARNING: Some processes might still be running: $remaining_node"
  echo "You may need to manually kill these processes."
else
  echo "All processes have been successfully stopped."
fi

echo ""
echo "Shutdown complete."
echo "===========================================" 