#!/bin/bash

# Print shutdown banner
echo "=========================================="
echo "    TradeWizard 2.0 - Shutdown Script    "
echo "=========================================="

# Kill Next.js server processes
echo "Stopping Next.js processes..."
NEXTJS_PIDS=$(pgrep -f "node.*next")
if [ -n "$NEXTJS_PIDS" ]; then
  echo "Killing Next.js processes: $NEXTJS_PIDS"
  kill -9 $NEXTJS_PIDS
  echo "Next.js processes stopped."
else
  echo "No running Next.js processes found."
fi

# Kill backend API processes if applicable
echo "Stopping backend API processes..."
API_PIDS=$(pgrep -f "node.*backend")
if [ -n "$API_PIDS" ]; then
  echo "Killing backend API processes: $API_PIDS"
  kill -9 $API_PIDS
  echo "Backend API processes stopped."
else
  echo "No running backend API processes found."
fi

echo ""
echo "All processes have been stopped."
echo "==========================================" 