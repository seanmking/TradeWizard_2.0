/**
 * Simplified Test Script for Compliance MCP
 * 
 * This script demonstrates the basic functionality of the Compliance MCP.
 */

import express from 'express';
import dotenv from 'dotenv';
import complianceMcp from './mcp/compliance-mcp/index';

// Initialize environment variables
dotenv.config();

// Create Express application
const app = express();
const PORT = process.env.PORT || 5005;

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Register the Compliance MCP routes
app.use('/api/compliance', complianceMcp);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'up',
    timestamp: new Date().toISOString(),
    service: 'compliance-test-simplified',
    testMode: process.env.TEST_MODE === 'true'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
╭──────────────────────────────────────────────────────────────╮
│                                                              │
│     Compliance MCP Simplified Test Server                    │
│                                                              │
│     Running on: http://localhost:${PORT}                      │
│     Health Check: http://localhost:${PORT}/health             │
│     Test Mode: ${process.env.TEST_MODE === 'true' ? 'Enabled' : 'Disabled'}       │
│                                                              │
╰──────────────────────────────────────────────────────────────╯
  `);
}); 