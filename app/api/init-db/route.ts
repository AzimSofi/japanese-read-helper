import { sql } from '@/lib/db/connection';
import { NextResponse } from 'next/server';
import { CREATE_TABLES_SQL } from '@/lib/db/schema';

export const runtime = 'edge';

/**
 * Initialize database tables
 * Call this endpoint once after setting up Vercel Postgres
 * GET /api/init-db
 */
export async function GET() {
  try {
    // Execute the schema creation SQL
    // Use sql.unsafe() for raw SQL (works with postgres library)
    // @vercel/postgres also supports this method
    if (typeof sql.unsafe === 'function') {
      // Local development with postgres library
      await sql.unsafe(CREATE_TABLES_SQL);
    } else if (typeof sql.query === 'function') {
      // Production with @vercel/postgres
      await sql.query(CREATE_TABLES_SQL);
    } else {
      throw new Error('Unsupported database client');
    }

    return NextResponse.json({
      message: 'Database tables created successfully',
      success: true,
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      {
        message: 'Failed to initialize database',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 }
    );
  }
}
