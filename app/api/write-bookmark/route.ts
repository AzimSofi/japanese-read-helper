/**
 * ブックマークデータを更新するためのAPIルート
 */

import { NextResponse } from 'next/server';
import { updateBookmarkSync } from '@/lib/services/fileService';
import type { BookmarkRequest, WriteResponse } from '@/lib/types';

export async function POST(request: Request): Promise<NextResponse<WriteResponse>> {
  if (request.headers.get('content-type') !== 'application/json') {
    return NextResponse.json(
      { message: '無効なContent-Typeです' },
      { status: 400 }
    );
  }

  try {
    const { target, content }: BookmarkRequest = await request.json();

    if (!target || content === undefined) {
      return NextResponse.json(
        { message: '必須フィールドがありません: targetとcontent' },
        { status: 400 }
      );
    }

    updateBookmarkSync(target, content);

    return NextResponse.json({ success: true, message: 'ブックマークを更新しました' });
  } catch (error) {
    console.error('ブックマークの更新中にエラーが発生しました:', error);
    return NextResponse.json(
      { message: 'ブックマークの更新に失敗しました' },
      { status: 500 }
    );
  }
}
