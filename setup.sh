#!/bin/bash

# Print setup banner
echo "=========================================="
echo "    TradeWizard 2.0 - Setup Script       "
echo "=========================================="

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required software
echo "Checking for required software..."
MISSING_SW=0

if command_exists node; then
  NODE_VERSION=$(node -v | cut -d 'v' -f 2)
  echo "✅ Node.js is installed (v$NODE_VERSION)"
else
  echo "❌ Node.js is not installed"
  MISSING_SW=1
fi

if command_exists npm; then
  NPM_VERSION=$(npm -v)
  echo "✅ npm is installed (v$NPM_VERSION)"
else
  echo "❌ npm is not installed"
  MISSING_SW=1
fi

if command_exists redis-cli; then
  echo "✅ Redis is installed"
else
  echo "❌ Redis is not installed"
  MISSING_SW=1
fi

if [ $MISSING_SW -eq 1 ]; then
  echo "Essential software is missing. Please install the required software and try again."
  exit 1
fi

# Make scripts executable
echo -e "\nSetting up script permissions..."
chmod +x start.sh stop.sh
if [ -f tradewizard-scraper-service/start-scraper.sh ]; then
  chmod +x tradewizard-scraper-service/start-scraper.sh tradewizard-scraper-service/stop-scraper.sh
  echo "✅ Made scraper scripts executable"
fi
chmod +x verify-setup.sh

# Check for environment files and create if missing
echo -e "\nChecking for environment files..."

create_env_file() {
  if [ ! -f "$1" ]; then
    if [ -f "$1.example" ]; then
      echo "Creating $1 from example file..."
      cp "$1.example" "$1"
      echo "✅ Created $1"
    else
      echo "⚠️ Example file $1.example not found, creating a basic $1 file"
      touch "$1"
    fi
  else
    echo "✅ $1 already exists"
  fi
}

create_env_file ".env"
create_env_file "backend/.env"
create_env_file "tradewizard-scraper-service/.env"

# Install dependencies
echo -e "\nInstalling dependencies..."

echo "Installing main app dependencies..."
npm install

echo "Installing backend dependencies..."
if [ -d "backend" ]; then
  (cd backend && npm install)
  echo "✅ Backend dependencies installed"
else
  echo "❌ Backend directory not found"
fi

echo "Installing scraper service dependencies..."
if [ -d "tradewizard-scraper-service" ]; then
  (cd tradewizard-scraper-service && npm install)
  echo "✅ Scraper service dependencies installed"
else
  echo "❌ Scraper service directory not found"
fi

# Generate API keys
echo -e "\nGenerating secure API keys..."
if command_exists node; then
  echo "Creating an API key generator script..."
  cat > generate-api-key.js << 'EOL'
#!/usr/bin/env node
const crypto = require('crypto');
function generateApiKey(prefix = 'tw') {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  return `${prefix}_${randomBytes}`;
}
const scraperApiKey = generateApiKey('tw_scr');
console.log(scraperApiKey);
EOL

  SCRAPER_API_KEY=$(node generate-api-key.js)
  echo "Generated SCRAPER_API_KEY: $SCRAPER_API_KEY"
  
  # Update environment files with the API key
  if [ -f ".env" ]; then
    sed -i.bak "s/SCRAPER_API_KEY=.*/SCRAPER_API_KEY=$SCRAPER_API_KEY/" .env || true
    rm -f .env.bak 2>/dev/null || true
  fi
  
  if [ -f "backend/.env" ]; then
    sed -i.bak "s/SCRAPER_API_KEY=.*/SCRAPER_API_KEY=$SCRAPER_API_KEY/" backend/.env || true
    rm -f backend/.env.bak 2>/dev/null || true
  fi
  
  if [ -f "tradewizard-scraper-service/.env" ]; then
    sed -i.bak "s/API_KEY=.*/API_KEY=$SCRAPER_API_KEY/" tradewizard-scraper-service/.env || true
    rm -f tradewizard-scraper-service/.env.bak 2>/dev/null || true
  fi
  
  echo "✅ Updated environment files with the new API key"
else
  echo "❌ Cannot generate API keys without Node.js"
fi

# Check if Redis is running
echo -e "\nChecking Redis status..."
if command_exists redis-cli; then
  if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis server is running"
  else
    echo "⚠️ Redis server is not running"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      echo "Starting Redis on macOS..."
      brew services start redis || true
      sleep 2
      if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis server started successfully"
      else
        echo "❌ Failed to start Redis. Please start it manually."
      fi
    else
      echo "Please start Redis manually for your operating system."
    fi
  fi
fi

# Run the verification script
echo -e "\nRunning setup verification..."
./verify-setup.sh

echo -e "\nSetup process completed!"
echo "Please review the verification output above and make any necessary adjustments to your .env files."
echo "In particular, make sure to set up:"
echo "  - OpenAI API key"
echo "  - Supabase credentials"
echo ""
echo "When ready, run './start.sh' to start all services."
echo "==========================================" 