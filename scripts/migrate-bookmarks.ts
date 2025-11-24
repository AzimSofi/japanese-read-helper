/**
 * Bookmark Migration Script
 *
 * Migrates bookmarks from the old bookmark.json system to the new Prisma database.
 * Can be run directly or called from an API route.
 *
 * Usage:
 *   npx tsx scripts/migrate-bookmarks.ts
 */

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { PrismaClient } from '@/lib/generated/prisma';

interface OldBookmark {
  [fileName: string]: string;
}

/**
 * Read the old bookmark.json file
 */
async function readOldBookmarks(): Promise<OldBookmark> {
  const bookmarkPath = path.join(process.cwd(), 'public', 'bookv2-furigana', 'bookmark.json');

  if (!existsSync(bookmarkPath)) {
    console.log('No bookmark.json found. Nothing to migrate.');
    return {};
  }

  const content = await readFile(bookmarkPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Get all text files in bookv2-furigana directory
 */
async function getAllTextFiles(): Promise<string[]> {
  const dir = path.join(process.cwd(), 'public', 'bookv2-furigana');

  if (!existsSync(dir)) {
    return [];
  }

  const files = await readdir(dir);
  return files
    .filter((file) => file.endsWith('.txt'))
    .map((file) => file.replace('.txt', ''));
}

/**
 * Migrate a single bookmark
 */
async function migrateBookmark(
  prisma: PrismaClient,
  fileName: string,
  bookmarkText: string
): Promise<void> {
  // Get or create book
  let book = await prisma.book.findUnique({
    where: { fileName },
  });

  if (!book) {
    // Create new book entry
    const textFilePath = `/bookv2-furigana/${fileName}.txt`;

    book = await prisma.book.create({
      data: {
        fileName,
        title: fileName, // Use fileName as title for now
        author: 'Unknown',
        textFilePath,
        originalEpubName: `${fileName}.epub`,
      },
    });

    console.log(`  Created book: ${fileName}`);
  }

  // Create or update bookmark
  await prisma.userBookmark.upsert({
    where: {
      bookId_userId: {
        bookId: book.id,
        userId: 'default',
      },
    },
    create: {
      bookId: book.id,
      userId: 'default',
      bookmarkText,
    },
    update: {
      bookmarkText,
    },
  });

  console.log(`  Migrated bookmark for: ${fileName} (${bookmarkText.length} chars)`);
}

/**
 * Main migration function
 */
export async function migrateBookmarks(
  prismaClient: PrismaClient
): Promise<{
  success: boolean;
  migrated: number;
  errors: string[];
}> {
  console.log('Starting bookmark migration...\n');

  const errors: string[] = [];
  let migratedCount = 0;

  try {
    // Read old bookmarks
    const oldBookmarks = await readOldBookmarks();
    const bookmarkCount = Object.keys(oldBookmarks).length;

    if (bookmarkCount === 0) {
      console.log('No bookmarks to migrate.');
      return { success: true, migrated: 0, errors: [] };
    }

    console.log(`Found ${bookmarkCount} bookmarks to migrate\n`);

    // Get all text files
    const textFiles = await getAllTextFiles();
    console.log(`Found ${textFiles.length} text files in bookv2-furigana/\n`);

    // Migrate each bookmark
    for (const [fileName, bookmarkText] of Object.entries(oldBookmarks)) {
      try {
        await migrateBookmark(prismaClient, fileName, bookmarkText);
        migratedCount++;
      } catch (error) {
        const errorMsg = `Failed to migrate ${fileName}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`  ✗ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Create empty bookmarks for files without bookmarks
    console.log('\nCreating empty bookmarks for remaining files...');
    for (const fileName of textFiles) {
      if (!oldBookmarks[fileName]) {
        try {
          await migrateBookmark(prismaClient, fileName, '');
          console.log(`  Created empty bookmark for: ${fileName}`);
        } catch (error) {
          const errorMsg = `Failed to create bookmark for ${fileName}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`  ✗ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✓ Migration complete!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Migrated: ${migratedCount} bookmarks`);
    console.log(`Errors: ${errors.length}`);
    console.log(`${'='.repeat(60)}\n`);

    if (errors.length > 0) {
      console.log('Errors encountered:');
      errors.forEach((error) => console.log(`  - ${error}`));
    }

    return {
      success: errors.length === 0,
      migrated: migratedCount,
      errors,
    };
  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    errors.push(errorMsg);

    return {
      success: false,
      migrated: migratedCount,
      errors,
    };
  }
}

// Run migration if this script is executed directly (for CLI usage)
if (require.main === module) {
  (async () => {
    const { PrismaClient: Client } = await import('@/lib/generated/prisma');
    const prisma = new Client();

    try {
      const result = await migrateBookmarks(prisma);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}
