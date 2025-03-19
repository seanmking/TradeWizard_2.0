#!/bin/bash

# Print banner
echo "=========================================="
echo "    TradeWizard 2.0 - Setup Verification  "
echo "=========================================="

# Function to check if a file exists
check_file() {
  if [ -f "$1" ]; then
    echo "✅ $2 exists"
  else
    echo "❌ $2 missing"
  fi
}

# Function to check if a directory exists
check_dir() {
  if [ -d "$1" ]; then
    echo "✅ $2 exists"
  else
    echo "❌ $2 missing"
  fi
}

# Function to check if an environment variable is set in a file
check_env_var() {
  FILE=$1
  VAR=$2
  DEFAULT=$3
  
  if [ -f "$FILE" ]; then
    if grep -q "^$VAR=" "$FILE"; then
      VALUE=$(grep "^$VAR=" "$FILE" | cut -d= -f2)
      if [[ "$VALUE" == *"your"* || "$VALUE" == "$DEFAULT" ]]; then
        echo "⚠️  $VAR in $FILE needs to be updated (currently has placeholder value)"
      else
        echo "✅ $VAR in $FILE is set"
      fi
    else
      echo "❌ $VAR is missing from $FILE"
    fi
  else
    echo "❌ $FILE does not exist, cannot check $VAR"
  fi
}

# Function to check if a command exists
check_command() {
  if command -v $1 &> /dev/null; then
    echo "✅ $1 is installed"
  else
    echo "❌ $1 is not installed"
  fi
}

# Function to check if a service is running
check_service() {
  NAME=$1
  PORT=$2
  
  if lsof -i :$PORT > /dev/null 2>&1; then
    echo "✅ $NAME is running on port $PORT"
  else
    echo "❌ $NAME is not running on port $PORT"
  fi
}

echo "Checking repository structure..."
check_dir "app" "Frontend app directory"
check_dir "backend" "Backend directory"
check_dir "tradewizard-scraper-service" "Scraper service directory"
check_file "start.sh" "Startup script"
check_file "stop.sh" "Shutdown script"

echo -e "\nChecking environment files..."
check_file ".env" "Main .env file"
check_file "backend/.env" "Backend .env file"
check_file "tradewizard-scraper-service/.env" "Scraper service .env file (optional)"

echo -e "\nChecking environment configurations..."
# Main .env
check_env_var ".env" "SCRAPER_SERVICE_URL" "http://localhost:3001"
check_env_var ".env" "SCRAPER_API_KEY" "your_api_key_here"
check_env_var ".env" "LLM_API_KEY" "sk-your-openai-key-here"
check_env_var ".env" "REDIS_URL" "redis://localhost:6379"

# Backend .env
check_env_var "backend/.env" "SUPABASE_URL" "https://your-project.supabase.co"
check_env_var "backend/.env" "SUPABASE_SERVICE_ROLE_KEY" "your-supabase-key-here"
check_env_var "backend/.env" "OPENAI_API_KEY" "sk-your-openai-key-here"

echo -e "\nChecking required software..."
check_command "node"
check_command "npm"
check_command "redis-cli"

echo -e "\nChecking services..."
# Use redis-cli ping to check if Redis is running
if redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis server is running"
else
  echo "❌ Redis server is not running"
fi

echo -e "\nNext steps:"
echo "1. Update any environment variables flagged with ⚠️ above"
echo "2. Ensure Redis is running (brew services start redis on macOS)"
echo "3. Set up your Supabase account and update the credentials"
echo "4. Obtain an OpenAI API key and update it in the .env files"
echo "5. Run './start.sh' to start all services"
echo "6. Visit http://localhost:3000 to access the application"
echo "7. Run './stop.sh' to stop all services when done"
echo "==========================================" 