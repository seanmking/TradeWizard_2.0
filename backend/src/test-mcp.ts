/**
 * Test Script for Market Intelligence MCP
 * 
 * This script demonstrates how the Market Intelligence MCP acts as a structured
 * data layer for handling data retrieval, processing, and delivery. It showcases
 * the MCP's ability to:
 * 
 * 1. Perform structured data fetching based on explicit requests
 * 2. Return standardized, structured responses in JSON format
 * 3. Handle core data retrieval from various sources
 * 4. Provide scalable, uniform data responses
 * 5. Implement caching strategies for performance
 */

import express from 'express';
import dotenv from 'dotenv';
import marketIntelligenceMcp from './mcp/market-intelligence-mcp/index';

// Initialize environment variables
dotenv.config();

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Register the Market Intelligence MCP routes
app.use('/api/market-intelligence', marketIntelligenceMcp);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'up',
    timestamp: new Date().toISOString(),
    service: 'market-intelligence-test'
  });
});

// Simple documentation endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Market Intelligence MCP Test',
    description: 'Demonstrates the Market Intelligence MCP as a structured data layer',
    availableEndpoints: [
      {
        path: '/api/market-intelligence/health',
        description: 'Health check endpoint for the Market Intelligence MCP'
      },
      {
        path: '/api/market-intelligence/trade-flow/:hsCode/:exporterCountry/:importerCountry',
        description: 'Get trade flow data for a specific product between countries',
        params: {
          hsCode: 'HS code for the product (e.g., 0901 for coffee)',
          exporterCountry: 'ISO code for exporting country (e.g., BRA)',
          importerCountry: 'ISO code for importing country (e.g., USA)'
        },
        query: {
          year: 'Optional year parameter (e.g., 2022)',
          source: 'Optional source parameter (e.g., comtrade, tradeMap, wits)'
        }
      },
      {
        path: '/api/market-intelligence/top-exporters/:hsCode',
        description: 'Get top exporters for a specific product',
        params: {
          hsCode: 'HS code for the product (e.g., 0901 for coffee)'
        },
        query: {
          limit: 'Optional limit parameter (default: 10)',
          year: 'Optional year parameter (e.g., 2022)'
        }
      },
      {
        path: '/api/market-intelligence/market-opportunities/:hsCode/:exporterCountry',
        description: 'Get market opportunities for a specific product and exporter',
        params: {
          hsCode: 'HS code for the product (e.g., 0901 for coffee)',
          exporterCountry: 'ISO code for exporting country (e.g., BRA)'
        },
        query: {
          limit: 'Optional limit parameter (default: 10)'
        }
      }
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
╭──────────────────────────────────────────────────────────────╮
│                                                              │
│     Market Intelligence MCP Test Server                      │
│                                                              │
│     Running on: http://localhost:${PORT}                      │
│     API Documentation: http://localhost:${PORT}               │
│     Health Check: http://localhost:${PORT}/health             │
│                                                              │
│     Example MCP Endpoints:                                   │
│     - /api/market-intelligence/health                        │
│     - /api/market-intelligence/trade-flow/0901/BRA/USA       │
│     - /api/market-intelligence/top-exporters/0901            │
│                                                              │
╰──────────────────────────────────────────────────────────────╯
  `);
}); 