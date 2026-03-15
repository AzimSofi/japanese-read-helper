/**
 * ブックマークデータを読み込むためのAPIルート
 * Uses PostgreSQL database
 */

import { NextResponse } from 'next/server';
import { getBookmark } from '@/lib/db/queries';
import { DEFAULT_FILE_NAME } from '@/lib/constants';
import type { BookmarkResponse } from '@/lib/types';

// Mark as dynamic to prevent static generation during build
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse<BookmarkResponse>> {
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('fileName') || DEFAULT_FILE_NAME;

  // バリデーション（ディレクトリトラバーサル攻撃を防ぐ）
  // Note: No default file set - app will auto-redirect to first available file
  if (!fileName || fileName.includes('..')) {
    console.error(`無効なファイル名: "${fileName}"`);
    return NextResponse.json({ text: '' }, { status: 400 });
  }

  try {
    // Extract directory and filename - last segment is file, rest is directory
    // e.g., "bookv2-furigana/book-name/file-name" -> dir="bookv2-furigana/book-name", file="file-name"
    const parts = fileName.split('/');
    const directory = parts.length > 1 ? parts.slice(0, -1).join('/') : 'public';
    const file = parts[parts.length - 1];

    const bookmarkContent = await getBookmark(file, directory);
    return NextResponse.json({ text: bookmarkContent });
  } catch (error) {
    console.error('ブックマークの読み込み中にエラーが発生しました:', error);
    return NextResponse.json({ text: '' });
  }
}
