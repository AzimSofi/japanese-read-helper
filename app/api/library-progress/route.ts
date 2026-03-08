import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/connection';

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

interface EntryRow {
  file_name: string;
  directory: string;
  total_pages: number;
  total_characters: number;
  created_at: string;
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
        b.bookmark_text,
        b.updated_at as bookmark_updated_at
      FROM text_entries t
      LEFT JOIN bookmarks b ON t.file_name = b.file_name AND t.directory = b.directory
    `;

    const rows = normalizeResult<EntryRow>(result);
    const progressData: ProgressResponse = {};

    for (const row of rows) {
      const key = `${row.directory}/${row.file_name}`;
      const totalPages = row.total_pages || 0;

      let bookmarkPage: number | null = null;
      if (row.bookmark_text) {
        const match = row.bookmark_text.match(/^page:(\d+)$/);
        if (match) {
          bookmarkPage = parseInt(match[1], 10);
        }
      }

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
