import { NextResponse } from 'next/server';
import { upsertTextEntry } from '@/lib/db/queries';
import { listTextFiles, readTextFile } from '@/lib/services/fileService';

/**
 * Migration script to load all .txt files into the database
 * Run this once after setting up the database to migrate all existing text files
 * GET /api/migrate-text-files
 *
 * WARNING: This will read all .txt files from the public directory and insert them into the database.
 * Run this only once during initial setup!
 */
export async function GET() {
  try {
    console.log('Starting text file migration...');

    // Get all text files from filesystem
    const { directories, filesByDirectory } = await listTextFiles();

    let totalMigrated = 0;
    let errors = 0;
    const migrationLog: string[] = [];

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
            // Insert into database
            await upsertTextEntry(file, content, directory);
            totalMigrated++;
            migrationLog.push(`  ✓ Migrated: ${fileName} (${content.length} chars)`);
          } else {
            migrationLog.push(`  ⚠ Skipped (empty): ${fileName}`);
          }
        } catch (error) {
          errors++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          migrationLog.push(`  ✗ Error: ${directory}/${file} - ${errorMsg}`);
          console.error(`Error migrating ${directory}/${file}:`, error);
        }
      }
    }

    console.log('Migration complete!');
    console.log(`Total migrated: ${totalMigrated}`);
    console.log(`Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      message: 'Text file migration completed',
      stats: {
        totalMigrated,
        errors,
        directories: directories.length,
      },
      log: migrationLog,
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Migration failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
