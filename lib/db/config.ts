/**
 * Database configuration and connection pool setup
 */
import { sql } from '@vercel/postgres';
import { logger } from '../logger';

// In production, use Vercel Postgres
const db = sql;

// Log any database errors
process.on('unhandledRejection', (error: any) => {
  if (error.code && error.code.startsWith('P')) {
    logger.error('Database error:', error);
    process.exit(1);
  }
});

export default db;
