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
// Optimized for 512MB Lightsail instance - minimal pool to save memory
const postgresClient = postgres(connectionString, {
  max: 3, // REDUCED from 10 - each connection ~5MB
  idle_timeout: 5, // Close idle connections quickly
  connect_timeout: 10,
  max_lifetime: 60 * 2, // 2 minute max - cycle connections
});

// Cast to SqlClient for type compatibility
const sql = postgresClient as unknown as SqlClient;

console.log('🔌 Database: Connected to PostgreSQL (pool: 3)');

// Graceful shutdown - use the original client for cleanup
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('🔌 Shutting down database connections...');
    await postgresClient.end();
    process.exit(0);
  });
}

// Export the configured database client
export { sql };
