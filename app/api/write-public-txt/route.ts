/**
 * publicディレクトリにプレーンテキストファイルを書き込むためのAPIルート
 */

import { NextResponse } from 'next/server';
import { writeTextFile } from '@/lib/services/fileService';
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

    // 一時テキストファイルに書き込む
    await writeTextFile(DEFAULT_TEXT_FILES.TEMP, text);

    return NextResponse.json({ message: 'おけです！' });
  } catch (error) {
    console.error('テキストファイルの書き込み中にエラーが発生しました:', error);
    return NextResponse.json(
      { message: 'テキストファイルの書き込みに失敗しました' },
      { status: 500 }
    );
  }
}
