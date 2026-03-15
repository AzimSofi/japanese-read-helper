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
  total_pages: number;
  total_characters: number;
  created_at: string;
  bookmark_page: number | null;
  bookmark_text: string | null;
  bookmark_updated_at: string | null;
}

export async function GET() {
  try {
    const result = await sql`
      SELECT
        t.file_name,
        t.directory,
        COALESCE(t.total_pages, 0) as total_pages,
        COALESCE(t.total_characters, 0) as total_characters,
        t.created_at,
        b.bookmark_page,
        b.bookmark_text,
        b.updated_at as bookmark_updated_at
      FROM text_entries t
      LEFT JOIN bookmarks b ON t.file_name = b.file_name AND t.directory = b.directory
    `;

    const rows = normalizeResult<EntryRow>(result);
    const progressData: ProgressResponse = {};

    const needsBackfill = rows.filter(r => r.bookmark_text && !r.bookmark_page);

    if (needsBackfill.length > 0) {
      const contentResult = await sql`
        SELECT t.file_name, t.directory, t.content
        FROM text_entries t
        INNER JOIN bookmarks b ON t.file_name = b.file_name AND t.directory = b.directory
        WHERE b.bookmark_text IS NOT NULL
          AND b.bookmark_text != ''
          AND b.bookmark_page IS NULL
      `;
      const contentRows = normalizeResult<{ file_name: string; directory: string; content: string }>(contentResult);
      const contentMap = new Map(contentRows.map(r => [`${r.directory}/${r.file_name}`, r.content]));

      for (const row of needsBackfill) {
        const key = `${row.directory}/${row.file_name}`;
        const content = contentMap.get(key);
        if (content && row.bookmark_text) {
          const page = calculatePageFromText(row.bookmark_text, content);
          if (page) {
            row.bookmark_page = page;
            sql`
              UPDATE bookmarks SET bookmark_page = ${page}
              WHERE file_name = ${row.file_name} AND directory = ${row.directory}
            `.catch(() => {});
          }
        }
      }
    }

    for (const row of rows) {
      const key = `${row.directory}/${row.file_name}`;
      const totalPages = row.total_pages || 0;
      const bookmarkPage = row.bookmark_page || null;

      let progress = 0;
      if (bookmarkPage && totalPages > 0) {
        progress = (bookmarkPage / totalPages) * 100;
      }

      progressData[key] = {
        progress,
        totalCharacters: row.total_characters || 0,
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
