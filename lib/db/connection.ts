/**
 * Database connection utility
 *
 * Uses standard PostgreSQL connection via postgres library.
 * Works with both local Docker PostgreSQL and production PostgreSQL.
 */

import type { SqlClient } from './schema';
import postgres from 'postgres';

// Get connection string from environment
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

if (!connectionString) {
  console.warn('⚠️  Warning: No DATABASE_URL or POSTGRES_URL found. Database queries will fail.');
  console.warn('   Please create .env.local from .env.local.example and configure DATABASE_URL');
}

// Create postgres connection
const sql = postgres(connectionString, {
  // Connection pool settings
  max: 10, // Maximum connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 30, // Fail after 30 seconds if can't connect
}) as unknown as SqlClient;

console.log('🔌 Database: Connected to PostgreSQL');

// Export the configured database client
export { sql };
