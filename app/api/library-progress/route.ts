import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/connection';
import { parseMarkdown } from '@/lib/utils/markdownParser';
import { stripFurigana } from '@/lib/utils/furiganaParser';
import { READER_CONFIG, PAGINATION_CONFIG } from '@/lib/constants';

export const dynamic = 'force-dynamic';

interface BookProgress {
  progress: number;
  totalCharacters: number;
  bookmarkPage: number | null;
  totalPages: number;
  bookmarkUpdatedAt: string | null;
  createdAt: string | null;
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

function calculatePageFromText(bookmarkText: string, content: string): number | null {
  const normalizedBookmark = stripFurigana(bookmarkText).replace(/[\r\n]/g, '').trim();
  if (!normalizedBookmark) return null;

  let items: { head?: string; text?: string }[];
  if (content.includes('>>') && content.includes('<')) {
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

interface EntryRow {
  file_name: string;
  directory: string;
  content: string;
  created_at: string;
  bookmark_text: string | null;
  bookmark_updated_at: string | null;
  bookmark_page?: number | null;
}

function countItems(content: string): number {
  if (content.includes('>>') && content.includes('<')) {
    return parseMarkdown(content).length;
  }
  return content
    .split(READER_CONFIG.PARAGRAPH_SPLIT_PATTERN)
    .map(p => p.trim())
    .filter(p => p.length > 0).length;
}

export async function GET() {
  try {
    const result = await sql`
      SELECT
        t.file_name,
        t.directory,
        t.content,
        t.created_at,
        b.bookmark_text,
        b.updated_at as bookmark_updated_at
      FROM text_entries t
      LEFT JOIN bookmarks b ON t.file_name = b.file_name AND t.directory = b.directory
    `;

    const rows = normalizeResult<EntryRow>(result);
    const progressData: ProgressResponse = {};

    for (const row of rows) {
      if (row.content && row.bookmark_text) {
        row.bookmark_page = calculatePageFromText(row.bookmark_text, row.content);
      }
    }

    for (const row of rows) {
      const key = `${row.directory}/${row.file_name}`;
      const itemCount = countItems(row.content || '');
      const totalPages = Math.ceil(itemCount / PAGINATION_CONFIG.ITEMS_PER_PAGE);
      const totalCharacters = (row.content || '').length;
      const bookmarkPage = row.bookmark_page || null;

      let progress = 0;
      if (bookmarkPage && totalPages > 0) {
        progress = (bookmarkPage / totalPages) * 100;
      }

      progressData[key] = {
        progress,
        totalCharacters: totalCharacters,
        bookmarkPage,
        totalPages,
        bookmarkUpdatedAt: row.bookmark_updated_at || null,
        createdAt: row.created_at || null,
      };
    }

    return NextResponse.json(progressData);
  } catch (error) {
    console.error('Error fetching library progress:', error);
    return NextResponse.json({ error: 'Failed to fetch library progress' }, { status: 500 });
  }
}
