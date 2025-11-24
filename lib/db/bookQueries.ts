/**
 * Database query functions using Prisma for the new schema
 * Replaces old SQL-based queries with Prisma ORM
 */

import { prisma } from './prisma';

// ============================================================================
// BOOK QUERIES
// ============================================================================

/**
 * Get book by fileName (for backward compatibility with old API)
 */
export async function getBookByFileName(fileName: string) {
  return await prisma.book.findUnique({
    where: { fileName },
    include: {
      images: {
        orderBy: { orderIndex: 'asc' },
      },
      userBookmarks: {
        where: { userId: 'default' },
      },
    },
  });
}

/**
 * Get or create book by fileName
 * Used for backward compatibility when transitioning from file-based to database system
 */
export async function getOrCreateBookByFileName(
  fileName: string,
  defaults: {
    title?: string;
    author?: string;
    textFilePath?: string;
    originalEpubName?: string;
  } = {}
) {
  let book = await getBookByFileName(fileName);

  if (!book) {
    // Create a new book entry if it doesn't exist
    book = await prisma.book.create({
      data: {
        fileName,
        title: defaults.title || fileName,
        author: defaults.author || 'Unknown',
        textFilePath: defaults.textFilePath || `/public/bookv2-furigana/${fileName}.txt`,
        originalEpubName: defaults.originalEpubName || `${fileName}.epub`,
      },
      include: {
        images: true,
        userBookmarks: {
          where: { userId: 'default' },
        },
      },
    });
  }

  return book;
}

// ============================================================================
// BOOKMARK QUERIES
// ============================================================================

/**
 * Get bookmark for a specific book
 */
export async function getBookmark(
  fileName: string,
  userId: string = 'default'
): Promise<string> {
  try {
    // Get or create book
    const book = await getOrCreateBookByFileName(fileName);

    // Find bookmark for this book
    const bookmark = await prisma.userBookmark.findUnique({
      where: {
        bookId_userId: {
          bookId: book.id,
          userId,
        },
      },
    });

    return bookmark?.bookmarkText || '';
  } catch (error) {
    console.error('Error fetching bookmark:', error);
    return ''; // Return empty string on error for graceful degradation
  }
}

/**
 * Create or update bookmark (upsert)
 */
export async function upsertBookmark(
  fileName: string,
  bookmarkText: string,
  userId: string = 'default'
): Promise<void> {
  try {
    // Get or create book
    const book = await getOrCreateBookByFileName(fileName);

    // Upsert bookmark
    await prisma.userBookmark.upsert({
      where: {
        bookId_userId: {
          bookId: book.id,
          userId,
        },
      },
      create: {
        bookId: book.id,
        userId,
        bookmarkText,
      },
      update: {
        bookmarkText,
      },
    });
  } catch (error) {
    console.error('Error upserting bookmark:', error);
    throw error;
  }
}

/**
 * Get all bookmarks for a specific user
 */
export async function getAllBookmarks(
  userId: string = 'default'
): Promise<Record<string, string>> {
  try {
    const bookmarks = await prisma.userBookmark.findMany({
      where: { userId },
      include: {
        book: {
          select: { fileName: true },
        },
      },
    });

    const result: Record<string, string> = {};
    bookmarks.forEach((bookmark) => {
      result[bookmark.book.fileName] = bookmark.bookmarkText;
    });

    return result;
  } catch (error) {
    console.error('Error fetching all bookmarks:', error);
    throw error;
  }
}

/**
 * Delete bookmark for a specific book
 */
export async function deleteBookmark(
  fileName: string,
  userId: string = 'default'
): Promise<void> {
  try {
    const book = await getBookByFileName(fileName);
    if (!book) return;

    await prisma.userBookmark.delete({
      where: {
        bookId_userId: {
          bookId: book.id,
          userId,
        },
      },
    });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    throw error;
  }
}

/**
 * Initialize empty bookmarks for books that don't have one
 */
export async function initializeBookmarksForFiles(
  fileNames: string[],
  userId: string = 'default'
): Promise<void> {
  try {
    for (const fileName of fileNames) {
      const book = await getOrCreateBookByFileName(fileName);

      // Check if bookmark exists
      const existingBookmark = await prisma.userBookmark.findUnique({
        where: {
          bookId_userId: {
            bookId: book.id,
            userId,
          },
        },
      });

      // Create empty bookmark if it doesn't exist
      if (!existingBookmark) {
        await prisma.userBookmark.create({
          data: {
            bookId: book.id,
            userId,
            bookmarkText: '',
          },
        });
      }
    }
  } catch (error) {
    console.error('Error initializing bookmarks:', error);
    throw error;
  }
}

/**
 * Clean up bookmarks for books that no longer exist
 */
export async function cleanupBookmarks(
  existingFileNames: string[],
  userId: string = 'default'
): Promise<number> {
  try {
    // Get all books not in the existing file names list
    const booksToDelete = await prisma.book.findMany({
      where: {
        fileName: {
          notIn: existingFileNames,
        },
      },
      select: { id: true },
    });

    if (booksToDelete.length === 0) {
      return 0;
    }

    const bookIdsToDelete = booksToDelete.map((book) => book.id);

    // Delete bookmarks for those books
    const result = await prisma.userBookmark.deleteMany({
      where: {
        bookId: {
          in: bookIdsToDelete,
        },
        userId,
      },
    });

    return result.count;
  } catch (error) {
    console.error('Error cleaning up bookmarks:', error);
    throw error;
  }
}
