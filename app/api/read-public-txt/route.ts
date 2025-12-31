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
    // Note: No default file set - app will auto-redirect to first available file
    if (!fileName || fileName.includes('..')) {
      console.error(`無効なファイル名: "${fileName}"`);
      return NextResponse.json(
        { text: '' },
        { status: 400 }
      );
    }

    // Support separate directory parameter for nested directories
    // URL format: /api/read-public-txt?directory=bookv2-furigana/subdir&fileName=file-name
    // OR legacy: /api/read-public-txt?fileName=dir/file-name
    let directory = searchParams.get('directory');
    let file: string;
    let content = '';

    if (directory) {
      // New format: separate directory and fileName
      file = fileName;
      content = await getTextEntry(file, directory);
    } else {
      // Legacy format: try multiple directory splits (most nested first)
      // For path "a/b/c", try: (dir="a/b", file="c"), then (dir="a", file="b/c")
      const parts = fileName.split('/');

      if (parts.length > 1) {
        // Try from most nested to least nested
        for (let i = parts.length - 1; i > 0; i--) {
          const tryDir = parts.slice(0, i).join('/');
          const tryFile = parts.slice(i).join('/');
          content = await getTextEntry(tryFile, tryDir);
          if (content) {
            directory = tryDir;
            file = tryFile;
            console.log(`Found content with directory="${tryDir}", file="${tryFile}"`);
            break;
          }
        }
      }

      // If still not found, try with default public directory
      if (!content) {
        directory = 'public';
        file = fileName;
        content = await getTextEntry(file, directory);
      }
    }

    console.log(`テキストエントリ読み込み (データベース): fileName="${fileName}", directory="${directory}", length=${content.length}`);

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
