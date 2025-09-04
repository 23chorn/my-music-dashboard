import pkg from 'pg';
const { Pool } = pkg;
import logger from '../utils/logger.js';

// Create PostgreSQL connection pool (will be initialized later)
let pool;

export function initializeDatabase() {
  logger.info(`Initializing PostgreSQL database connection`);
  
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // Add error handler to prevent crashes
  pool.on('error', (err) => {
    logger.error(`PostgreSQL pool error (handled): ${err.message}`);
  });

  // Test the connection
  pool.connect((err, client, release) => {
    if (err) {
      logger.error(`Database connection error: ${err.message}`);
      console.error('Database connection failed:', err);
    } else {
      logger.info(`Connected to PostgreSQL database`);
      release();
    }
  });
}

// Export the pool for use by other database modules
export function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}