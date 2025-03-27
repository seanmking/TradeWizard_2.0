#!/bin/bash

# Print shutdown banner
echo "=========================================="
echo "    TradeWizard 2.0 - Shutdown Script    "
echo "=========================================="

# Define PID file locations
NEXTJS_PID_FILE="./.nextjs.pid"
API_PID_FILE="./.api.pid"
SCRAPER_PID_FILE="./.scraper.pid"

# Kill a process and all its children
kill_process_tree() {
  local pid=$1
  local signal=${2:-TERM}
  
  echo "Killing process tree for PID: $pid with signal $signal"
  
  # Get all child processes using the parent pid, and kill them all
  if command -v pgrep >/dev/null 2>&1; then
    # Process group kill (more reliable for npm/Next.js)
    local pgid=$(ps -o pgid= -p $pid | grep -o '[0-9]\+')
    if [ ! -z "$pgid" ]; then
      # Only kill node-related processes in the process group
      local node_pids=$(ps -o pid= -g $pgid | grep -E "$(pgrep -f 'node|npm|next|ts-node')" || true)
      if [ ! -z "$node_pids" ]; then
        echo "Sending SIG$signal to node processes in group $pgid"
        echo "$node_pids" | xargs -n1 kill -$signal 2>/dev/null || true
      fi
    fi
    
    # Find and kill only node-related descendants
    pgrep -P $pid -f "node|npm|next|ts-node" | while read child_pid; do
      kill_process_tree $child_pid $signal
    done
  fi
  
  # Kill the process itself only if it's node-related
  if ps -p $pid -o command= | grep -qE "node|npm|next|ts-node"; then
    echo "Sending SIG$signal to $pid"
    kill -$signal $pid 2>/dev/null || true
  fi
}

# Wait for port to be released with timeout
wait_for_port_release() {
  local port=$1
  local timeout=${2:-30}  # Default 30 seconds timeout
  local waited=0
  
  echo "Waiting for port $port to be released (timeout: ${timeout}s)"
  
  while lsof -i tcp:$port >/dev/null 2>&1; do
    sleep 1
    waited=$((waited + 1))
    
    if [ $waited -ge $timeout ]; then
      echo "Timeout waiting for port $port to be released"
      return 1
    fi
    
    # After 5 seconds, try more aggressive measures
    if [ $waited -eq 5 ]; then
      echo "Port still not released after 5s, trying SIGKILL"
      kill_node_dev_server $port
    fi
  done
  
  echo "Port $port released after ${waited}s"
  return 0
}

# Specialized function for npm/Next.js process cleanup
kill_node_dev_server() {
  local port=$1
  local search_term=${2:-""}
  
  echo "Stopping Node.js server on port $port"
  
  # 1. First try graceful shutdown via port
  local port_pids=$(lsof -ti:$port)
  for pid in $port_pids; do
    echo "Found process $pid using port $port, sending SIGTERM"
    kill_process_tree $pid TERM
  done
  
  # 2. Wait a bit and check if port was released
  sleep 2
  
  # 3. If port still in use, try harder search and SIGKILL
  if lsof -i tcp:$port >/dev/null 2>&1; then
    echo "Port $port still in use after SIGTERM, trying SIGKILL on all related processes"
    
    # Find any Node processes that might be related
    local node_pids=$(pgrep -f "node.*$search_term")
    for pid in $node_pids; do
      echo "Found Node.js process $pid, sending SIGKILL"
      kill_process_tree $pid KILL
    done
    
    # On Linux, we can also try the following for truly stubborn processes
    if command -v fuser >/dev/null 2>&1; then
      echo "Using fuser to kill processes on port $port"
      fuser -k -n tcp $port >/dev/null 2>&1 || true
    fi
  fi
}

# Handle zombie processes
cleanup_zombies() {
  echo "Checking for zombie Node.js processes..."
  
  # Find processes in zombie state (status Z)
  local zombies=$(ps aux | grep node | grep -E '\bZ\b' | awk '{print $2}')
  
  if [ -z "$zombies" ]; then
    echo "No zombie processes found"
    return 0
  fi
  
  echo "Found zombie processes: $zombies"
  
  for pid in $zombies; do
    echo "Sending SIGKILL to zombie parent $pid"
    kill -9 $pid 2>/dev/null || true
  done
}

# Stop all services in reverse order
echo "Stopping Next.js server..."
if [ -f "$NEXTJS_PID_FILE" ]; then
  NEXTJS_PID=$(cat $NEXTJS_PID_FILE)
  if [ -n "$NEXTJS_PID" ]; then
    echo "Killing Next.js process $NEXTJS_PID"
    kill_process_tree $NEXTJS_PID TERM
  fi
fi
kill_node_dev_server 3000 "next"
wait_for_port_release 3000 10

echo "Stopping Backend API..."
if [ -f "$API_PID_FILE" ]; then
  API_PID=$(cat $API_PID_FILE)
  if [ -n "$API_PID" ]; then
    echo "Killing Backend API process $API_PID"
    kill_process_tree $API_PID TERM
  fi
fi
kill_node_dev_server 5002 "api"
wait_for_port_release 5002 10

echo "Stopping Scraper service..."
if [ -f "$SCRAPER_PID_FILE" ]; then
  SCRAPER_PID=$(cat $SCRAPER_PID_FILE)
  if [ -n "$SCRAPER_PID" ]; then
    echo "Killing Scraper process $SCRAPER_PID"
    kill_process_tree $SCRAPER_PID TERM
  fi
fi
kill_node_dev_server 3001 "scraper"
wait_for_port_release 3001 10

# Clean up any zombie processes
cleanup_zombies

# Kill any remaining nodemon or ts-node-dev processes
echo "Checking for remaining nodemon or ts-node-dev processes..."
pkill -f "nodemon" || true
pkill -f "ts-node-dev" || true

# Remove PID files
rm -f $NEXTJS_PID_FILE $API_PID_FILE $SCRAPER_PID_FILE

# Final verification
echo "Verifying all processes are stopped..."
sleep 1  # Give processes time to fully terminate

# Check all relevant ports
for port in 3000 3001 5002; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "WARNING: Port $port is still in use!"
        echo "You may need to manually kill the process using: lsof -ti:$port | xargs kill -9"
    fi
done

# Check for any remaining Node.js processes
remaining_node=$(pgrep -f "node.*(next|backend|scraper|3000|3001|5002)" || echo "")
if [ -n "$remaining_node" ]; then
    echo "WARNING: Some Node.js processes might still be running: $remaining_node"
    echo "You may need to manually kill these processes using: kill -9 $remaining_node"
else
    echo "All processes have been successfully stopped."
fi

echo ""
echo "Shutdown complete."
echo "==========================================" 