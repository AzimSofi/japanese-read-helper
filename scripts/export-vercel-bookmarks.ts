/**
 * Export bookmarks from Vercel Postgres
 *
 * Run this script BEFORE switching to AWS to export your bookmarks.
 *
 * Prerequisites:
 * - Set VERCEL=1 environment variable
 * - Have Vercel Postgres connection strings set
 *
 * Usage:
 *   VERCEL=1 npx tsx scripts/export-vercel-bookmarks.ts
 *
 * Output:
 *   Creates scripts/bookmarks-export.json with all bookmark data
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

interface BookmarkRow {
  file_name: string;
  directory: string;
  bookmark_text: string;
}

interface TextEntryRow {
  file_name: string;
  directory: string;
  content: string;
}

async function exportBookmarks() {
  console.log('🔄 Exporting bookmarks from Vercel Postgres...\n');

  // Dynamically import Vercel Postgres
  const { sql } = await import('@vercel/postgres');

  try {
    // Export bookmarks
    console.log('📚 Fetching bookmarks...');
    const bookmarksResult = await sql`SELECT file_name, directory, bookmark_text FROM bookmarks`;
    const bookmarks = bookmarksResult.rows as BookmarkRow[];
    console.log(`   Found ${bookmarks.length} bookmarks`);

    // Export text entries
    console.log('📝 Fetching text entries...');
    const textEntriesResult = await sql`SELECT file_name, directory, content FROM text_entries`;
    const textEntries = textEntriesResult.rows as TextEntryRow[];
    console.log(`   Found ${textEntries.length} text entries`);

    // Create export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      source: 'vercel-postgres',
      bookmarks,
      textEntries,
    };

    // Write to file
    const outputPath = join(__dirname, 'bookmarks-export.json');
    writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

    console.log(`\n✅ Export complete!`);
    console.log(`   File: ${outputPath}`);
    console.log(`   Bookmarks: ${bookmarks.length}`);
    console.log(`   Text entries: ${textEntries.length}`);
    console.log(`\nNext step: Copy this file to your Lightsail server and run import-bookmarks.ts`);
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportBookmarks();
