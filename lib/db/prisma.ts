/**
 * Prisma Client Instance
 *
 * Ensures a single PrismaClient instance is used throughout the application
 * to prevent connection pool exhaustion in development.
 *
 * Prisma v7 uses the PostgreSQL adapter for direct database connections.
 */

import { PrismaClient } from '@/lib/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  pool: Pool;
};

// Create connection pool (reuse in development)
const pool = globalForPrisma.pool || new Pool({
  connectionString: process.env.DATABASE_URL
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool;

// Create Prisma adapter
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
