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

    console.log(`ブックマーク保存: fileName="${target}", content length=${content.length}`);
    updateBookmarkSync(target, content);
    console.log(`ブックマーク保存成功: fileName="${target}"`);

    return NextResponse.json({ success: true, message: 'ブックマークを更新しました' });
  } catch (error) {
    console.error('ブックマークの更新中にエラーが発生しました:', error);
    console.error('エラー詳細:', error instanceof Error ? error.message : String(error));
    console.error('スタックトレース:', error instanceof Error ? error.stack : 'スタックトレースなし');
    return NextResponse.json(
      { message: 'ブックマークの更新に失敗しました' },
      { status: 500 }
    );
  }
}
