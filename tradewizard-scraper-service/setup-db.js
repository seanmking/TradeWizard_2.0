/**
 * Database Setup Script Runner
 * Runs the database setup process to create required tables
 */

const { setupDatabase } = require('./db-setup');
const logger = require('./logger');

async function main() {
  logger.info('Starting database setup process...');
  
  try {
    const success = await setupDatabase();
    
    if (success) {
      logger.info('Database setup completed successfully.');
      process.exit(0);
    } else {
      logger.error('Database setup failed.');
      process.exit(1);
    }
  } catch (error) {
    logger.error(`Database setup encountered an error: ${error.message}`, { error });
    process.exit(1);
  }
}

// Run the setup process
main(); 