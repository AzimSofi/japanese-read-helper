/**
 * publicディレクトリからテキストファイルを読み込むためのAPIルート
 * All text content now stored in Vercel Postgres database
 */

import { NextResponse } from 'next/server';
import { getTextEntry } from '@/lib/db/queries';
import { DEFAULT_FILE_NAME } from '@/lib/constants';
import type { TextResponse } from '@/lib/types';

export async function GET(request: Request): Promise<NextResponse<TextResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName') || DEFAULT_FILE_NAME;

    console.log(`テキストファイル読み込み: fileName="${fileName}"`);

    // ファイル名のバリデーション（ディレクトリトラバーサル攻撃を防ぐ）
    // サブディレクトリ対応のため "/" は許可する（例: "bookv1-rephrase/readable-code"）
    if (!fileName || fileName.includes('..')) {
      console.error(`無効なファイル名: "${fileName}"`);
      return NextResponse.json(
        { text: '' },
        { status: 400 }
      );
    }

    // Split fileName into directory and file parts
    const parts = fileName.split('/');
    const directory = parts.length > 1 ? parts[0] : 'public';
    const file = parts.length > 1 ? parts.slice(1).join('/') : fileName;

    // Read from database
    const content = await getTextEntry(file, directory);
    console.log(`テキストエントリ読み込み (データベース): fileName="${fileName}", length=${content.length}`);

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
