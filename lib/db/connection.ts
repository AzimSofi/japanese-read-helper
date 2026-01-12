import type { SqlClient } from './schema';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

if (!connectionString) {
  console.warn('Warning: No DATABASE_URL or POSTGRES_URL found. Database queries will fail.');
  console.warn('Please create .env.local from .env.local.example and configure DATABASE_URL');
}

const postgresClient = postgres(connectionString, {
  max: 3,
  idle_timeout: 5,
  connect_timeout: 10,
  max_lifetime: 60 * 2,
});

const sql = postgresClient as unknown as SqlClient;

console.log('Database: Connected to PostgreSQL (pool: 3)');

if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('Shutting down database connections...');
    await postgresClient.end();
    process.exit(0);
  });
}

export { sql };
