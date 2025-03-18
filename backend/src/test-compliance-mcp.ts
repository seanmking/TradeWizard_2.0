/**
 * Test Script for Compliance MCP
 * 
 * This script demonstrates how the Compliance MCP acts as a structured
 * data layer for handling compliance data retrieval, processing, and delivery.
 * It showcases the MCP's ability to:
 * 
 * 1. Perform structured data fetching based on explicit requests
 * 2. Return standardized, structured responses in JSON format
 * 3. Handle core data retrieval from various sources
 * 4. Provide scalable, uniform data responses
 * 5. Implement caching strategies for performance
 */

import express from 'express';
import dotenv from 'dotenv';
import complianceMcp from './mcp/compliance-mcp/index';

// Initialize environment variables
dotenv.config();

// Create Express application
const app = express();
const PORT = process.env.PORT || 5003;

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
    service: 'compliance-test'
  });
});

// Simple documentation endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Compliance MCP Test',
    description: 'Demonstrates the Compliance MCP as a structured data layer',
    availableEndpoints: [
      {
        path: '/api/compliance/health',
        description: 'Health check endpoint for the Compliance MCP'
      },
      {
        path: '/api/compliance/export-requirements/:country/:industry',
        description: 'Get export requirements for a specific country and industry',
        params: {
          country: 'ISO code for the country (e.g., ZAF for South Africa)',
          industry: 'Industry name or code (e.g., Textile)'
        }
      },
      {
        path: '/api/compliance/export-requirements/by-hs-code/:country/:hsCode',
        description: 'Get export requirements for a specific country and HS code',
        params: {
          country: 'ISO code for the country (e.g., ZAF for South Africa)',
          hsCode: 'HS code for the product (e.g., 5201 for cotton)'
        }
      },
      {
        path: '/api/compliance/tariffs/:country/:hsCode',
        description: 'Get tariff information for a specific country and HS code',
        params: {
          country: 'ISO code for the country (e.g., USA for United States)',
          hsCode: 'HS code for the product (e.g., 5201 for cotton)'
        }
      },
      {
        path: '/api/compliance/tariffs/comparison/:hsCode',
        description: 'Get tariff comparison for a specific HS code across countries',
        params: {
          hsCode: 'HS code for the product (e.g., 5201 for cotton)'
        }
      },
      {
        path: '/api/compliance/calculate-costs/:country/:hsCode',
        description: 'Calculate compliance costs for exporting to a specific country',
        params: {
          country: 'ISO code for the country (e.g., USA for United States)',
          hsCode: 'HS code for the product (e.g., 5201 for cotton)'
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
│     Compliance MCP Test Server                               │
│                                                              │
│     Running on: http://localhost:${PORT}                      │
│     API Documentation: http://localhost:${PORT}               │
│     Health Check: http://localhost:${PORT}/health             │
│                                                              │
│     Example MCP Endpoints:                                   │
│     - /api/compliance/health                                 │
│     - /api/compliance/export-requirements/ZAF/Textile        │
│     - /api/compliance/tariffs/USA/5201                       │
│                                                              │
╰──────────────────────────────────────────────────────────────╯
  `);
}); 