import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
// Import routes from app.js
import * as path from 'path';

dotenv.config();

// Set TEST_MODE for compliance MCP if not already set
// This allows the Compliance MCP to use mock data instead of requiring a database connection
if (!process.env.TEST_MODE) {
  process.env.TEST_MODE = 'true';
  console.log('TEST_MODE enabled for Compliance MCP');
}

// Import Compliance MCP routes after setting TEST_MODE
import complianceMcpRoutes from './mcp/compliance-mcp';
// Import product routes
import productRoutes from './routes/productRoutes';

const app = express();

// Initialize Supabase for direct testing
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log('Supabase client initialized successfully');

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Import the tradeRoutes from the app.js file
const tradeRoutes = require('./routes/tradeRoutes');

// Register trade routes
app.use('/api/trade', tradeRoutes);

// Register product routes
app.use('/api/products', productRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'TradeWizard API is running',
    version: '2.0.0',
    environment: process.env.NODE_ENV
  });
});

// Database connection test endpoint
app.get('/api/db-test', async (req: Request, res: Response) => {
  try {
    // Try to get all tables - using a different approach
    const { data, error } = await supabase
      .rpc('list_tables')
      .select('*');
    
    if (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Database connection error',
        error: error.message
      });
    }
    
    // If RPC is not available, try another approach
    if (!data || data.length === 0) {
      const { data: tables, error: tablesError } = await supabase
        .from('sa_industry_classifications')
        .select('count(*)')
        .limit(1);
        
      if (tablesError) {
        return res.status(500).json({
          status: 'error',
          message: 'Database connection error - could not list tables or access sample table',
          error: tablesError.message
        });
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Database connection successful - verified with sample table access',
        tables_count: tables
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Database connection successful',
      tables: data
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Database connection error',
      error: error.message
    });
  }
});

// Query test endpoint
app.get('/api/table-test/:table', async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    
    // Try to query the specified table
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(5);
    
    if (error) {
      return res.status(500).json({
        status: 'error',
        message: `Error querying table ${table}`,
        error: error.message
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: `Successfully queried table ${table}`,
      data
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Query error',
      error: error.message
    });
  }
});

// Register MCP routes with the updated path
app.use('/api/compliance', complianceMcpRoutes);

// Routes will be added here

// Export the app without starting it (will be started in index.ts)
export default app;