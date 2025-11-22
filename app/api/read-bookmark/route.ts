/**
 * ブックマークデータを読み込むためのAPIルート
 * Now uses Vercel Postgres database instead of file system
 */

import { NextResponse } from 'next/server';
import { getBookmark } from '@/lib/db/queries';
import { DEFAULT_FILE_NAME } from '@/lib/constants';
import type { BookmarkResponse } from '@/lib/types';

export async function GET(request: Request): Promise<NextResponse<BookmarkResponse>> {
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('fileName') || DEFAULT_FILE_NAME;

  // バリデーション（ディレクトリトラバーサル攻撃を防ぐ）
  if (fileName.includes('..')) {
    console.error(`無効なファイル名: "${fileName}"`);
    return NextResponse.json({ text: '' }, { status: 400 });
  }

  try {
    // Split fileName into directory and file parts
    // e.g., "bookv1-rephrase/readable-code" -> directory: "bookv1-rephrase", file: "readable-code"
    const parts = fileName.split('/');
    const directory = parts.length > 1 ? parts[0] : 'public';
    const file = parts.length > 1 ? parts.slice(1).join('/') : fileName;

    const bookmarkContent = await getBookmark(file, directory);
    return NextResponse.json({ text: bookmarkContent });
  } catch (error) {
    console.error('ブックマークの読み込み中にエラーが発生しました:', error);
    return NextResponse.json({ text: '' });
  }
}
