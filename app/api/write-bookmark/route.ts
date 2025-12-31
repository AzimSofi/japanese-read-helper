/**
 * ブックマークデータを更新するためのAPIルート
 * Uses PostgreSQL database
 */

import { NextResponse } from 'next/server';
import { upsertBookmark } from '@/lib/db/queries';
import type { BookmarkRequest, WriteResponse } from '@/lib/types';

// Mark as dynamic to prevent static generation during build
export const dynamic = 'force-dynamic';

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

    // バリデーション（ディレクトリトラバーサル攻撃を防ぐ）
    if (target.includes('..')) {
      return NextResponse.json(
        { message: '無効なファイル名です' },
        { status: 400 }
      );
    }

    // Extract directory and filename
    // e.g., "bookv1-rephrase/readable-code" -> dir="bookv1-rephrase", file="readable-code"
    const parts = target.split('/');
    const directory = parts.length > 1 ? parts[0] : 'public';
    const file = parts.length > 1 ? parts.slice(1).join('/') : target;

    console.log(`ブックマーク保存: fileName="${target}", content length=${content.length}`);
    await upsertBookmark(file, content, directory);
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
