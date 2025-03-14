/**
 * TradeWizard 2.0 API Entry Point
 * 
 * This file serves as the entry point for the TradeWizard API.
 * It imports the Express application from server.ts and starts the server.
 */

import app from './server';
import dotenv from 'dotenv';

/**
 * Load environment variables from .env file
 * Environment variables control configuration across different environments
 * (development, staging, production)
 */
dotenv.config();

const port = process.env.PORT || 5001;

/**
 * Start Express Server
 * 
 * Initializes the HTTP server on the specified port
 * Logs server status to console for verification
 */
app.listen(port, () => {
  console.log(`TradeWizard API running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
}); 