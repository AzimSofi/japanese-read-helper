/**
 * ブックマークデータを読み込むためのAPIルート
 * Now uses Prisma with PostgreSQL database
 */

import { NextResponse } from 'next/server';
import { getBookmark } from '@/lib/db/bookQueries';
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
    // Extract just the filename without directory prefix
    // e.g., "bookv1-rephrase/readable-code" -> "readable-code"
    const parts = fileName.split('/');
    const file = parts.length > 1 ? parts.slice(1).join('/') : fileName;

    const bookmarkContent = await getBookmark(file);
    return NextResponse.json({ text: bookmarkContent });
  } catch (error) {
    console.error('ブックマークの読み込み中にエラーが発生しました:', error);
    return NextResponse.json({ text: '' });
  }
}
