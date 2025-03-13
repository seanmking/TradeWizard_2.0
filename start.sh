#!/bin/bash

# Print startup banner
echo "=========================================="
echo "    TradeWizard 2.0 - Startup Script     "
echo "=========================================="

# Kill any existing node processes
echo "Checking for existing processes..."
NEXTJS_PIDS=$(pgrep -f "node.*next")
if [ -n "$NEXTJS_PIDS" ]; then
  echo "Killing existing Next.js processes: $NEXTJS_PIDS"
  kill -9 $NEXTJS_PIDS
else
  echo "No existing Next.js processes found."
fi

# Optional: kill any other related processes if needed
# For example, if you have a backend API process:
API_PIDS=$(pgrep -f "node.*backend")
if [ -n "$API_PIDS" ]; then
  echo "Killing existing backend API processes: $API_PIDS"
  kill -9 $API_PIDS
else
  echo "No existing backend API processes found."
fi

# Wait a moment for processes to terminate
sleep 1

# Start Next.js development server without opening browser
echo "Starting Next.js development server..."
npm run dev -- -p 3000 &
NEXTJS_PID=$!
echo "Next.js server started with PID: $NEXTJS_PID"

# If you have a backend API, start it here
# echo "Starting backend API server..."
# cd backend && npm start &
# API_PID=$!
# echo "Backend API server started with PID: $API_PID"

echo ""
echo "All processes started!"
echo "Application is running at: http://localhost:3000"
echo "To stop all processes, run: ./stop.sh"
echo "==========================================" 