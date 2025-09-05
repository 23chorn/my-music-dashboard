import pkg from 'pg';
const { Pool } = pkg;
import logger from '../utils/logger.js';

// Create PostgreSQL connection pool (will be initialized later)
let pool;

export function initializeDatabase() {
  logger.info(`Initializing PostgreSQL database connection`);
  
  const config = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    min: 2,  // Minimum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
    maxUses: 7500, // Close (and replace) a connection after it has been used this many times
    // Additional stability settings
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
  };

  pool = new Pool(config);

  // Add error handlers for better diagnostics
  pool.on('error', (err) => {
    logger.error(`PostgreSQL pool error (handled): ${err.message}`, {
      error: err,
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      address: err.address,
      port: err.port
    });
    
    // Log pool statistics for debugging
    logger.warn(`Pool stats: total=${pool.totalCount}, idle=${pool.idleCount}, waiting=${pool.waitingCount}`);
  });

  pool.on('connect', (client) => {
    logger.debug('New database client connected');
  });

  pool.on('remove', (client) => {
    logger.debug('Database client removed from pool');
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

// Graceful shutdown function
export async function closeDatabase() {
  if (pool) {
    logger.info('Closing database connection pool...');
    try {
      await pool.end();
      logger.info('Database connection pool closed successfully');
    } catch (error) {
      logger.error(`Error closing database pool: ${error.message}`);
    }
    pool = null;
  }
}

// Export the pool for use by other database modules
export function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

// Health check function
export async function checkDatabaseHealth() {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      logger.info('Database health check passed', {
        currentTime: result.rows[0].current_time,
        version: result.rows[0].pg_version.split(' ')[0]
      });
      return { healthy: true, ...result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    throw error;
  }
}