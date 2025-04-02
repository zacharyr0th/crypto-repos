/**
 * Centralized database configuration and connection pool management
 */
import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

// Database configuration
export const dbConfig: PoolConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'crypto_repos',
  // Pool specific configuration - reduced for memory optimization
  max: 5, // Maximum number of clients (reduced from 10)
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
};

// Create a singleton connection pool with proper cleanup
class DatabasePool {
  private static instance: Pool | null = null;
  private static isShuttingDown = false;

  static getInstance(): Pool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new Pool(dbConfig);

      // Set up connection monitoring
      DatabasePool.instance.on('connect', () => {
        logger.info('Connected to PostgreSQL database');
      });

      DatabasePool.instance.on('error', (err) => {
        logger.error('Unexpected error on idle client:', err);
        if (!DatabasePool.isShuttingDown) {
          process.exit(-1);
        }
      });

      // Handle process termination
      process.on('SIGTERM', () => DatabasePool.cleanup());
      process.on('SIGINT', () => DatabasePool.cleanup());
      process.on('exit', () => DatabasePool.cleanup());
    }
    return DatabasePool.instance;
  }

  static async cleanup() {
    if (DatabasePool.instance && !DatabasePool.isShuttingDown) {
      DatabasePool.isShuttingDown = true;
      logger.info('Closing database pool...');
      await DatabasePool.instance.end();
      DatabasePool.instance = null;
    }
  }
}

// Export the singleton pool instance
export default DatabasePool.getInstance();
