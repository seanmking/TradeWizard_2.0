#!/bin/bash

# Print test banner
echo "=========================================="
echo "    TradeWizard 2.0 - Scraper Test        "
echo "=========================================="

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Step 1: Check if scraper service directory exists
echo "Step 1: Checking for scraper service directory..."
if [ ! -d "tradewizard-scraper-service" ]; then
  echo -e "${RED}❌ Scraper service directory not found!${NC}"
  echo "The scraper service directory should be located at: $(pwd)/tradewizard-scraper-service"
  echo -e "${YELLOW}You may need to clone or download the scraper service repository.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Scraper service directory found!${NC}"
fi

# Step 2: Check for required script files
echo -e "\nStep 2: Checking for required script files..."
MISSING_FILES=0

if [ ! -f "tradewizard-scraper-service/start-scraper.sh" ]; then
  echo -e "${RED}❌ start-scraper.sh not found!${NC}"
  MISSING_FILES=1
else
  echo -e "${GREEN}✅ start-scraper.sh found!${NC}"
fi

if [ ! -f "tradewizard-scraper-service/stop-scraper.sh" ]; then
  echo -e "${RED}❌ stop-scraper.sh not found!${NC}"
  MISSING_FILES=1
else
  echo -e "${GREEN}✅ stop-scraper.sh found!${NC}"
fi

if [ ! -f "tradewizard-scraper-service/package.json" ]; then
  echo -e "${RED}❌ package.json not found!${NC}"
  MISSING_FILES=1
else
  echo -e "${GREEN}✅ package.json found!${NC}"
  # Check node version requirement
  NODE_VERSION=$(node -e "try { console.log(require('./tradewizard-scraper-service/package.json').engines.node || 'not specified'); } catch(e) { console.log('error reading'); }")
  echo -e "   Required Node.js version: ${YELLOW}${NODE_VERSION}${NC}"
  echo -e "   Your Node.js version: ${YELLOW}$(node -v)${NC}"
fi

if [ $MISSING_FILES -eq 1 ]; then
  echo -e "${RED}Some required files are missing. The scraper service may not be properly installed.${NC}"
  exit 1
fi

# Step 3: Make scripts executable
echo -e "\nStep 3: Making scripts executable..."
chmod +x tradewizard-scraper-service/start-scraper.sh
chmod +x tradewizard-scraper-service/stop-scraper.sh
echo -e "${GREEN}✅ Scripts are now executable${NC}"

# Step 4: Install dependencies
echo -e "\nStep 4: Installing scraper service dependencies..."
(cd tradewizard-scraper-service && npm install)
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to install dependencies!${NC}"
  echo "Check for errors in the npm output above."
  exit 1
else
  echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"
fi

# Step 5: Check if service is already running
echo -e "\nStep 5: Checking if scraper service is already running..."
if curl -s http://localhost:3001/health > /dev/null; then
  echo -e "${YELLOW}⚠️  Scraper service is already running on port 3001${NC}"
  echo "Stopping the existing service..."
  (cd tradewizard-scraper-service && ./stop-scraper.sh)
  sleep 2
fi

# Step 6: Start the service
echo -e "\nStep 6: Starting scraper service..."
(cd tradewizard-scraper-service && ./start-scraper.sh)
sleep 3 # Give it time to start

# Step 7: Test health endpoint
echo -e "\nStep 7: Testing scraper service health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
if [ $? -ne 0 ] || [ -z "$HEALTH_RESPONSE" ]; then
  echo -e "${RED}❌ Scraper service is not responding to health checks!${NC}"
  echo "Check the logs in tradewizard-scraper-service/combined.log for errors."
  # Try to stop if it might have started but isn't responding
  (cd tradewizard-scraper-service && ./stop-scraper.sh)
  exit 1
else
  echo -e "${GREEN}✅ Health check successful!${NC}"
  echo "Response: $HEALTH_RESPONSE"
fi

# Step 8: Test scraping functionality
echo -e "\nStep 8: Testing basic scraping functionality..."
echo "Attempting to scrape a test URL (example.com)..."
SCRAPE_RESPONSE=$(curl -s -X POST http://localhost:3001/scrape -H "Content-Type: application/json" -d '{"url":"https://example.com"}')
SCRAPE_STATUS=$?

if [ $SCRAPE_STATUS -ne 0 ]; then
  echo -e "${RED}❌ Failed to connect to scraper service!${NC}"
elif [[ "$SCRAPE_RESPONSE" == *"error"* ]]; then
  echo -e "${YELLOW}⚠️  Scraper returned an error:${NC}"
  echo "$SCRAPE_RESPONSE"
  echo -e "\nThis might be expected if the service requires authentication or has rate limits."
else
  echo -e "${GREEN}✅ Scraping test successful!${NC}"
  
  # Extract and show some results
  echo -e "\nSample of scraped data:"
  echo "$SCRAPE_RESPONSE" | grep -m 5 -o '"[^"]*":"[^"]*"' | head -5
fi

# Step 9: Check for API key requirements
echo -e "\nStep 9: Checking for API key requirements..."
if grep -q "API_KEY" tradewizard-scraper-service/package.json tradewizard-scraper-service/*.js 2>/dev/null; then
  echo -e "${YELLOW}⚠️  This scraper service appears to require an API key${NC}"
  echo "Make sure you have properly set up any required API keys in the environment or configuration files."
  
  # Look for potential config files
  if [ -f "tradewizard-scraper-service/.env" ]; then
    echo -e "${YELLOW}Found .env file - this may contain API configuration${NC}"
  fi
  
  if [ -f "tradewizard-scraper-service/config.js" ] || [ -f "tradewizard-scraper-service/config.json" ]; then
    echo -e "${YELLOW}Found config file - this may contain API configuration${NC}"
  fi
else
  echo -e "${GREEN}✅ No obvious API key requirements found in the code${NC}"
  echo "The service might use environment variables or other configuration methods."
fi

# Step 10: Clean up
echo -e "\nStep 10: Cleaning up..."
(cd tradewizard-scraper-service && ./stop-scraper.sh)

echo -e "\n${GREEN}===========================================${NC}"
echo -e "${GREEN}    Scraper Service Test Complete!    ${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo "To use the scraper service with TradeWizard 2.0:"
echo "1. Start the main application with: ./start.sh"
echo "2. The scraper service will start automatically"
echo "3. If you encounter issues, check the logs in:"
echo "   tradewizard-scraper-service/combined.log"
echo "" 