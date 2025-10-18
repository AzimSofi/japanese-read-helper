/**
 * ブックマークデータを読み込むためのAPIルート
 */

import { NextResponse } from 'next/server';
import { readBookmark } from '@/lib/services/fileService';
import { DEFAULT_FILE_NAME } from '@/lib/constants';
import type { BookmarkResponse } from '@/lib/types';

export async function GET(request: Request): Promise<NextResponse<BookmarkResponse>> {
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('fileName') || DEFAULT_FILE_NAME;

  try {
    const bookmarkContent = await readBookmark(fileName);
    return NextResponse.json({ text: bookmarkContent });
  } catch (error) {
    console.error('ブックマークの読み込み中にエラーが発生しました:', error);
    return NextResponse.json({ text: '' });
  }
}
