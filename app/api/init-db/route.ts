import { sql } from '@/lib/db/connection';
import { NextResponse } from 'next/server';
import { CREATE_TABLES_SQL } from '@/lib/db/schema';

const MIGRATIONS_SQL = `
  ALTER TABLE text_entries ADD COLUMN IF NOT EXISTS total_pages INT DEFAULT 0;
  ALTER TABLE text_entries ADD COLUMN IF NOT EXISTS total_characters INT DEFAULT 0;
`;

export async function GET() {
  try {
    const execSql = typeof sql.unsafe === 'function'
      ? sql.unsafe.bind(sql)
      : typeof sql.query === 'function'
        ? sql.query.bind(sql)
        : null;

    if (!execSql) throw new Error('Unsupported database client');

    await execSql(CREATE_TABLES_SQL);
    await execSql(MIGRATIONS_SQL);

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
