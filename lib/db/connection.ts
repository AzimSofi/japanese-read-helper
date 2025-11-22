/**
 * Database connection utility
 *
 * Supports both:
 * - Local development with standard PostgreSQL (via Docker Compose)
 * - Production deployment with Vercel Postgres
 *
 * Environment detection:
 * - If VERCEL or VERCEL_ENV is set → Use @vercel/postgres
 * - Otherwise → Use standard postgres library for local development
 */

import type { SqlClient } from './schema';

// Check if we're running on Vercel
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;

// Declare sql variable that will be exported
let sql: SqlClient;

if (isVercel) {
  // Production: Use Vercel Postgres
  const { sql: vercelSql } = await import('@vercel/postgres');
  sql = vercelSql as unknown as SqlClient;
  console.log('🔌 Database: Using Vercel Postgres');
} else {
  // Local development: Use standard postgres library
  const postgres = (await import('postgres')).default;

  // Get connection string from environment
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

  if (!connectionString) {
    console.warn('⚠️  Warning: No DATABASE_URL or POSTGRES_URL found. Database queries will fail.');
    console.warn('   Please create .env.local from .env.local.example and configure DATABASE_URL');
  }

  // Create postgres connection
  sql = postgres(connectionString, {
    // Connection pool settings for local development
    max: 10, // Maximum connections
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 30, // Fail after 30 seconds if can't connect
  }) as unknown as SqlClient;

  console.log('🔌 Database: Using local PostgreSQL');
}

// Export the configured database client
export { sql };
