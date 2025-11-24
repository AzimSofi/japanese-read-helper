/**
 * Bookmark Migration API Route
 *
 * POST /api/migrate-bookmarks
 *
 * Migrates bookmarks from the old bookmark.json system to the new database.
 */

import { NextResponse } from 'next/server';
import { migrateBookmarks } from '@/scripts/migrate-bookmarks';
import { prisma } from '@/lib/db/prisma';

// Mark as dynamic to prevent static generation during build
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await migrateBookmarks(prisma);

    if (result.success) {
      return NextResponse.json({
        message: 'Migration completed successfully',
        migrated: result.migrated,
        errors: result.errors,
      });
    } else {
      return NextResponse.json(
        {
          message: 'Migration completed with errors',
          migrated: result.migrated,
          errors: result.errors,
        },
        { status: 207 } // 207 Multi-Status
      );
    }
  } catch (error) {
    console.error('Migration API error:', error);
    return NextResponse.json(
      {
        message: 'Migration failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
