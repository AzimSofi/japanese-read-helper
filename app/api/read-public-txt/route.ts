/**
 * publicディレクトリからテキストファイルを読み込むためのAPIルート
 */

import { NextResponse } from 'next/server';
import { readTextFile } from '@/lib/services/fileService';
import { DEFAULT_FILE_NAME } from '@/lib/constants';
import type { TextResponse } from '@/lib/types';

export async function GET(request: Request): Promise<NextResponse<TextResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName') || DEFAULT_FILE_NAME;

    console.log(`テキストファイル読み込み: fileName="${fileName}"`);

    // ファイル名のバリデーション
    if (!fileName || fileName.includes('..') || fileName.includes('/')) {
      console.error(`無効なファイル名: "${fileName}"`);
      return NextResponse.json(
        { text: '' },
        { status: 400 }
      );
    }

    const content = await readTextFile(fileName);

    // 空のコンテンツもエラーではなく正常なレスポンスとして返す
    console.log(`テキストファイル読み込み成功: fileName="${fileName}", length=${content.length}`);

    return NextResponse.json({ text: content });
  } catch (error) {
    console.error('テキストファイルの読み込み中にエラーが発生しました:', error);
    console.error('エラー詳細:', error instanceof Error ? error.message : String(error));
    console.error('スタックトレース:', error instanceof Error ? error.stack : 'スタックトレースなし');

    // エラーの場合でも200で空文字列を返す（フロントエンドのエラーハンドリングを簡素化）
    return NextResponse.json(
      { text: '' },
      { status: 200 }
    );
  }
}
