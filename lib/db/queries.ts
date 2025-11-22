import { sql } from './connection';
import type { Bookmark, TextEntry } from './schema';

/**
 * Database query functions for bookmarks and text entries
 */

/**
 * Helper function to normalize query results
 * @vercel/postgres returns {rows: [...]}
 * postgres library returns [...] directly
 */
function normalizeResult(result: any): any[] {
  // If result has a rows property, return it (Vercel Postgres)
  if (result && Array.isArray(result.rows)) {
    return result.rows;
  }
  // Otherwise, result is already the array (postgres library)
  if (Array.isArray(result)) {
    return result;
  }
  // Fallback to empty array
  return [];
}

// ============================================================================
// BOOKMARK QUERIES
// ============================================================================

/**
 * Get bookmark for a specific file and directory
 */
export async function getBookmark(
  fileName: string,
  directory: string = 'public'
): Promise<string> {
  try {
    const result = await sql`
      SELECT bookmark_text
      FROM bookmarks
      WHERE file_name = ${fileName} AND directory = ${directory}
    `;

    const rows = normalizeResult(result);
    if (rows.length === 0) {
      return ''; // Return empty string if no bookmark exists
    }

    return rows[0].bookmark_text;
  } catch (error) {
    console.error('Error fetching bookmark:', error);
    throw error;
  }
}

/**
 * Create or update bookmark (upsert)
 */
export async function upsertBookmark(
  fileName: string,
  bookmarkText: string,
  directory: string = 'public'
): Promise<void> {
  try {
    await sql`
      INSERT INTO bookmarks (file_name, directory, bookmark_text, updated_at)
      VALUES (${fileName}, ${directory}, ${bookmarkText}, CURRENT_TIMESTAMP)
      ON CONFLICT (file_name, directory)
      DO UPDATE SET
        bookmark_text = ${bookmarkText},
        updated_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error('Error upserting bookmark:', error);
    throw error;
  }
}

/**
 * Get all bookmarks for a specific directory
 */
export async function getAllBookmarks(
  directory: string = 'public'
): Promise<Record<string, string>> {
  try {
    const result = await sql`
      SELECT file_name, bookmark_text
      FROM bookmarks
      WHERE directory = ${directory}
    `;

    const rows = normalizeResult(result);
    const bookmarks: Record<string, string> = {};
    rows.forEach((row: any) => {
      bookmarks[row.file_name] = row.bookmark_text;
    });

    return bookmarks;
  } catch (error) {
    console.error('Error fetching all bookmarks:', error);
    throw error;
  }
}

/**
 * Delete bookmark for a specific file
 */
export async function deleteBookmark(
  fileName: string,
  directory: string = 'public'
): Promise<void> {
  try {
    await sql`
      DELETE FROM bookmarks
      WHERE file_name = ${fileName} AND directory = ${directory}
    `;
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    throw error;
  }
}

/**
 * Initialize empty bookmark for files that don't have one
 */
export async function initializeBookmarksForFiles(
  fileNames: string[],
  directory: string = 'public'
): Promise<void> {
  try {
    // Get existing bookmarks
    const existing = await sql`
      SELECT file_name FROM bookmarks WHERE directory = ${directory}
    `;

    const rows = normalizeResult(existing);
    const existingFiles = new Set(rows.map((row: any) => row.file_name));

    // Insert empty bookmarks for files that don't have one
    for (const fileName of fileNames) {
      if (!existingFiles.has(fileName)) {
        await sql`
          INSERT INTO bookmarks (file_name, directory, bookmark_text)
          VALUES (${fileName}, ${directory}, '')
          ON CONFLICT (file_name, directory) DO NOTHING
        `;
      }
    }
  } catch (error) {
    console.error('Error initializing bookmarks:', error);
    throw error;
  }
}

/**
 * Clean up bookmarks for files that no longer exist
 */
export async function cleanupBookmarks(
  existingFileNames: string[],
  directory: string = 'public'
): Promise<number> {
  try {
    const result = await sql`
      DELETE FROM bookmarks
      WHERE directory = ${directory}
      AND file_name != ALL(${existingFileNames})
      RETURNING id
    `;

    const rows = normalizeResult(result);
    return rows.length;
  } catch (error) {
    console.error('Error cleaning up bookmarks:', error);
    throw error;
  }
}

// ============================================================================
// TEXT ENTRY QUERIES
// ============================================================================

/**
 * Get text entry for a specific file
 */
export async function getTextEntry(
  fileName: string,
  directory: string = 'public'
): Promise<string> {
  try {
    const result = await sql`
      SELECT content
      FROM text_entries
      WHERE file_name = ${fileName} AND directory = ${directory}
    `;

    const rows = normalizeResult(result);
    if (rows.length === 0) {
      return '';
    }

    return rows[0].content;
  } catch (error) {
    console.error('Error fetching text entry:', error);
    throw error;
  }
}

/**
 * Create or update text entry (upsert)
 */
export async function upsertTextEntry(
  fileName: string,
  content: string,
  directory: string = 'public'
): Promise<void> {
  try {
    await sql`
      INSERT INTO text_entries (file_name, directory, content, created_at)
      VALUES (${fileName}, ${directory}, ${content}, CURRENT_TIMESTAMP)
      ON CONFLICT (file_name, directory)
      DO UPDATE SET
        content = ${content},
        created_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error('Error upserting text entry:', error);
    throw error;
  }
}

/**
 * Delete text entry for a specific file
 */
export async function deleteTextEntry(
  fileName: string,
  directory: string = 'public'
): Promise<void> {
  try {
    await sql`
      DELETE FROM text_entries
      WHERE file_name = ${fileName} AND directory = ${directory}
    `;
  } catch (error) {
    console.error('Error deleting text entry:', error);
    throw error;
  }
}

/**
 * Get all text entries grouped by directory
 */
export async function getAllTextEntries(): Promise<{
  directories: string[];
  filesByDirectory: Record<string, string[]>;
}> {
  try {
    const result = await sql`
      SELECT DISTINCT directory, file_name
      FROM text_entries
      ORDER BY directory, file_name
    `;

    const rows = normalizeResult(result);
    const filesByDirectory: Record<string, string[]> = {};
    const directoriesSet = new Set<string>();

    rows.forEach((row: any) => {
      const dir = row.directory;
      const fileName = row.file_name;

      directoriesSet.add(dir);

      if (!filesByDirectory[dir]) {
        filesByDirectory[dir] = [];
      }
      filesByDirectory[dir].push(fileName);
    });

    return {
      directories: Array.from(directoriesSet).sort(),
      filesByDirectory,
    };
  } catch (error) {
    console.error('Error fetching all text entries:', error);
    throw error;
  }
}

/**
 * Get all file names in a specific directory
 */
export async function getTextEntriesInDirectory(
  directory: string
): Promise<string[]> {
  try {
    const result = await sql`
      SELECT file_name
      FROM text_entries
      WHERE directory = ${directory}
      ORDER BY file_name
    `;

    const rows = normalizeResult(result);
    return rows.map((row: any) => row.file_name);
  } catch (error) {
    console.error('Error fetching text entries in directory:', error);
    throw error;
  }
}
