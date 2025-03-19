#!/bin/bash

echo "=========================================="
echo "    Website Analysis Tests Runner         "
echo "=========================================="

# Ensure we're in the project root
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run the tests
echo "Running website analysis tests..."
npm test app/lib/services/mcp/controllers/__tests__/website-analysis.controller.test.ts

# Check the test result
if [ $? -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Some tests failed."
  exit 1
fi

echo "==========================================" 