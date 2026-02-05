#!/usr/bin/env npx tsx
/**
 * Migrate a book's text entries to the production database
 *
 * Usage:
 *   npx tsx scripts/migrate-book-to-prod.ts <book-directory-name>
 *
 * Example:
 *   npx tsx scripts/migrate-book-to-prod.ts "忘れさせてよ、後輩くん。 (角川スニーカー文庫)"
 */

import * as fs from 'fs';
import * as path from 'path';
import pg from 'pg';

const PROD_DATABASE_URL = process.argv[3] || process.env.PROD_DATABASE_URL;
const BOOK_DIR_NAME = process.argv[2];
const OUTPUT_DIR = 'bookv2-furigana';

if (!BOOK_DIR_NAME) {
  console.error('Usage: npx tsx scripts/migrate-book-to-prod.ts <book-directory-name> [database-url]');
  process.exit(1);
}

if (!PROD_DATABASE_URL) {
  console.error('Error: Provide production DATABASE_URL as second argument or set PROD_DATABASE_URL env var');
  process.exit(1);
}

async function main() {
  const bookDir = path.join(process.cwd(), 'public', OUTPUT_DIR, BOOK_DIR_NAME);

  if (!fs.existsSync(bookDir)) {
    console.error(`Book directory not found: ${bookDir}`);
    process.exit(1);
  }

  // Only migrate the rephrase-furigana file (the final reading file)
  const files = fs.readdirSync(bookDir).filter(f => f.endsWith('-rephrase-furigana.txt'));

  if (files.length === 0) {
    console.error('No .txt files found in book directory');
    process.exit(1);
  }

  console.log(`\nMigrating book: ${BOOK_DIR_NAME}`);
  console.log(`Directory: ${OUTPUT_DIR}/${BOOK_DIR_NAME}`);
  console.log(`Files to migrate: ${files.length}`);
  console.log('---');

  const client = new pg.Client({
    connectionString: PROD_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to production database\n');

    for (const file of files) {
      const fileName = path.basename(file, '.txt');
      const directory = `${OUTPUT_DIR}/${BOOK_DIR_NAME}`;
      const filePath = path.join(bookDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      console.log(`Uploading: ${fileName}`);
      console.log(`  Size: ${(content.length / 1024).toFixed(1)} KB`);

      // Upsert into text_entries
      await client.query(
        `INSERT INTO text_entries (file_name, directory, content, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (file_name, directory)
         DO UPDATE SET content = $3, created_at = CURRENT_TIMESTAMP`,
        [fileName, directory, content]
      );

      // Initialize bookmark if not exists
      try {
        await client.query(
          `INSERT INTO bookmarks (file_name, directory, bookmark_text)
           VALUES ($1, $2, '')
           ON CONFLICT (file_name, directory) DO NOTHING`,
          [fileName, directory]
        );
      } catch {
        // Bookmark table may have different schema, skip
      }

      console.log(`  Done!\n`);
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`${files.length} files uploaded to production database`);
    console.log(`Book is now available at: ${OUTPUT_DIR}/${BOOK_DIR_NAME}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
