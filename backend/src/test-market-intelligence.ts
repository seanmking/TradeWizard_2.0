/**
 * Test script for Market Intelligence MCP
 * 
 * This script demonstrates how to use the Market Intelligence MCP in a simple Express server.
 */

import express from 'express';
import marketIntelligenceMcp from './mcp/market-intelligence-mcp/index';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Register the Market Intelligence MCP routes
app.use('/api/market-intelligence', marketIntelligenceMcp);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'up',
    service: 'market-intelligence-test',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Market Intelligence MCP test server running on port ${PORT}`);
  console.log(`Try accessing: http://localhost:${PORT}/api/market-intelligence/health`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
}); 