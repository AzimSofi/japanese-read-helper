/**
 * Sync text entries with filesystem API route
 * Removes database entries for deleted files
 * Optionally adds new files from filesystem
 */

import { NextResponse } from 'next/server';
import { syncTextEntries } from '@/lib/db/queries';

// Mark as dynamic to prevent static generation during build
export const dynamic = 'force-dynamic';

/**
 * POST /api/text-entries/sync?autoAdd=true
 * Sync database with filesystem
 * - Removes database entries for deleted files
 * - If autoAdd=true, adds new files from filesystem
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const autoAdd = searchParams.get('autoAdd') === 'true';

  try {
    console.log(`Starting text entries sync (autoAdd: ${autoAdd})...`);

    const result = await syncTextEntries(autoAdd);

    console.log(`Sync complete - Removed: ${result.removed}, Added: ${result.added}`);

    return NextResponse.json({
      success: true,
      message: 'Text entries synced successfully',
      stats: {
        removed: result.removed,
        added: result.added
      },
      log: [
        `Removed ${result.removed} database entries for deleted files`,
        autoAdd
          ? `Added ${result.added} new files from filesystem`
          : 'Auto-add disabled (use ?autoAdd=true to enable)'
      ]
    });
  } catch (error) {
    console.error('Error syncing text entries:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to sync text entries',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
