/**
 * API route to get reading progress for all books in the library
 * Returns bookmark page, total pages, and calculated percentage for each book
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/connection';
import { PAGINATION_CONFIG, READER_CONFIG } from '@/lib/constants';
import { parseMarkdown } from '@/lib/utils/markdownParser';
import { stripFurigana } from '@/lib/utils/furiganaParser';

export const dynamic = 'force-dynamic';

interface BookProgress {
  progress: number;
  totalCharacters: number;
  bookmarkPage: number | null;
  totalPages: number;
}

interface ProgressResponse {
  [key: string]: BookProgress;
}

function normalizeResult<T>(result: unknown): T[] {
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows: T[] }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  if (Array.isArray(result)) {
    return result;
  }
  return [];
}

function countItems(content: string): number {
  if (!content) return 0;
  if (content.includes('>>')) {
    const headingCount = (content.match(/^< /gm) || []).length;
    return headingCount || 1;
  }
  return content.split(READER_CONFIG.PARAGRAPH_SPLIT_PATTERN).filter(p => p.trim()).length;
}

function countOriginalCharacters(content: string): number {
  if (!content) return 0;

  if (content.includes('>>')) {
    const items = parseMarkdown(content);
    let totalChars = 0;
    for (const item of items) {
      if (item.head) {
        const cleanText = stripFurigana(item.head);
        totalChars += cleanText.length;
      }
    }
    return totalChars;
  }

  return stripFurigana(content).length;
}

function findBookmarkPage(bookmarkText: string, content: string, totalItems: number): number | null {
  if (!bookmarkText) return null;

  const match = bookmarkText.match(/^page:(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }

  if (!content) return null;

  const normalizedBookmark = stripFurigana(bookmarkText).replace(/[\r\n]/g, '').trim();
  if (!normalizedBookmark) return null;

  let items: { head?: string; text?: string }[] = [];
  if (content.includes('>>')) {
    items = parseMarkdown(content);
  } else {
    items = content
      .split(READER_CONFIG.PARAGRAPH_SPLIT_PATTERN)
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(p => ({ text: p }));
  }

  const itemIndex = items.findIndex(item => {
    const itemText = item.head || item.text || '';
    const normalizedItem = stripFurigana(itemText).replace(/[\r\n]/g, '').trim();
    return normalizedItem === normalizedBookmark;
  });

  if (itemIndex === -1) return null;

  return Math.floor(itemIndex / PAGINATION_CONFIG.ITEMS_PER_PAGE) + 1;
}

export async function GET(): Promise<NextResponse<ProgressResponse>> {
  try {
    const entriesResult = await sql`
      SELECT file_name, directory, content
      FROM text_entries
    `;

    const bookmarksResult = await sql`
      SELECT file_name, directory, bookmark_text
      FROM bookmarks
    `;

    const entries = normalizeResult<{ file_name: string; directory: string; content: string }>(entriesResult);
    const bookmarks = normalizeResult<{ file_name: string; directory: string; bookmark_text: string }>(bookmarksResult);

    const bookmarkMap = new Map<string, string>();
    bookmarks.forEach(b => {
      const key = `${b.directory}/${b.file_name}`;
      bookmarkMap.set(key, b.bookmark_text);
    });

    const progressData: ProgressResponse = {};

    for (const entry of entries) {
      const key = `${entry.directory}/${entry.file_name}`;
      const content = entry.content || '';
      const bookmarkText = bookmarkMap.get(key) || '';

      const totalItems = countItems(content);
      const totalPages = Math.ceil(totalItems / PAGINATION_CONFIG.ITEMS_PER_PAGE);
      const bookmarkPage = findBookmarkPage(bookmarkText, content, totalItems);

      let progress = 0;
      if (bookmarkPage && totalPages > 0) {
        progress = (bookmarkPage / totalPages) * 100;
      }

      progressData[key] = {
        progress,
        totalCharacters: countOriginalCharacters(content),
        bookmarkPage,
        totalPages,
      };
    }

    return NextResponse.json(progressData);
  } catch (error) {
    console.error('Error fetching library progress:', error);
    return NextResponse.json({});
  }
}
