/**
 * publicディレクトリにプレーンテキストファイルを書き込むためのAPIルート
 * Now uses Vercel Postgres database instead of file system
 */

import { NextResponse } from 'next/server';
import { upsertTextEntry } from '@/lib/db/queries';
import { DEFAULT_TEXT_FILES } from '@/lib/constants';
import type { TextRequest, WriteResponse } from '@/lib/types';

export async function POST(request: Request): Promise<NextResponse<WriteResponse>> {
  try {
    const { text }: TextRequest = await request.json();

    if (!text) {
      return NextResponse.json(
        { message: 'テキストは必須です' },
        { status: 400 }
      );
    }

    // Split fileName into directory and file parts
    // e.g., "temp/text" -> directory: "temp", file: "text"
    const parts = DEFAULT_TEXT_FILES.TEMP.split('/');
    const directory = parts.length > 1 ? parts[0] : 'public';
    const file = parts.length > 1 ? parts.slice(1).join('/') : DEFAULT_TEXT_FILES.TEMP;

    // Save to database
    await upsertTextEntry(file, text, directory);

    return NextResponse.json({ message: 'おけです！' });
  } catch (error) {
    console.error('テキストファイルの書き込み中にエラーが発生しました:', error);
    return NextResponse.json(
      { message: 'テキストファイルの書き込みに失敗しました' },
      { status: 500 }
    );
  }
}
