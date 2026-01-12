/**
 * Reset all text entries API route
 * Nuclear option: drops all entries and optionally re-migrates from filesystem
 */

import { NextResponse } from 'next/server';
import { resetTextEntries, upsertTextEntry } from '@/lib/db/queries';
import { listTextFiles, readTextFile } from '@/lib/services/fileService';

// Mark as dynamic to prevent static generation during build
export const dynamic = 'force-dynamic';

/**
 * POST /api/text-entries/reset?confirm=true&remigrate=true
 * Reset all text entries (nuclear option)
 * - Requires confirm=true to prevent accidental deletion
 * - If remigrate=true, re-migrates all files from filesystem after reset
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const confirm = searchParams.get('confirm') === 'true';
  const remigrate = searchParams.get('remigrate') === 'true';

  // Safety check: require explicit confirmation
  if (!confirm) {
    return NextResponse.json(
      {
        success: false,
        message: 'Confirmation required. Add ?confirm=true to reset all text entries'
      },
      { status: 400 }
    );
  }

  try {
    console.log('Starting text entries reset (nuclear option)...');

    // Delete all text entries
    const deletedCount = await resetTextEntries();
    console.log(`Deleted ${deletedCount} text entries from database`);

    const migrationLog: string[] = [
      `[OK] Deleted ${deletedCount} text entries from database`
    ];

    let totalMigrated = 0;
    let errors = 0;

    // Optionally re-migrate from filesystem
    if (remigrate) {
      console.log('Re-migrating text files from filesystem...');
      migrationLog.push('Starting re-migration from filesystem...');

      // Get all text files from filesystem
      const { directories, filesByDirectory } = await listTextFiles();

      // Migrate each file
      for (const directory of directories) {
        const files = filesByDirectory[directory] || [];
        migrationLog.push(`Processing directory: ${directory} (${files.length} files)`);

        for (const file of files) {
          try {
            // Read file content
            const fileName = `${directory}/${file}`;
            const content = await readTextFile(fileName);

            if (content) {
              await upsertTextEntry(file, content, directory);
              totalMigrated++;
              migrationLog.push(`  [OK] Migrated: ${fileName} (${content.length} chars)`);
            } else {
              migrationLog.push(`  [SKIP] Empty: ${fileName}`);
            }
          } catch (error) {
            errors++;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            migrationLog.push(`  [ERROR] ${directory}/${file} - ${errorMsg}`);
            console.error(`Error migrating ${directory}/${file}:`, error);
          }
        }
      }

      console.log(`Re-migration complete - Migrated: ${totalMigrated}, Errors: ${errors}`);
    }

    return NextResponse.json({
      success: true,
      message: remigrate
        ? 'Text entries reset and re-migrated successfully'
        : 'Text entries reset successfully',
      stats: {
        deleted: deletedCount,
        migrated: totalMigrated,
        errors: errors
      },
      log: migrationLog
    });
  } catch (error) {
    console.error('Error resetting text entries:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to reset text entries',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
