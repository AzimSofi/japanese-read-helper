/**
 * publicディレクトリ内のすべてのテキストファイルをリストするAPIルート
 * ファイルリストを取得する際、ブックマークを同期する（削除されたファイルのエントリを削除し、新しいファイルのエントリを追加）
 */

import { NextResponse } from 'next/server';
import { listTextFiles, syncBookmarks } from '@/lib/services/fileService';

export interface TextFileListResponse {
  files: string[];
  bookmarkSync?: {
    cleaned: number;
    added: number;
  };
}

export async function GET(): Promise<NextResponse<TextFileListResponse>> {
  try {
    // テキストファイルのリストを取得
    const textFiles = await listTextFiles();

    // ブックマークを同期（存在しないファイルのブックマークを削除し、新しいファイルのエントリを追加）
    const { cleaned, added } = await syncBookmarks();

    if (cleaned > 0 || added > 0) {
      console.log(`ブックマーク同期完了: ${cleaned}個削除, ${added}個追加`);
    }

    return NextResponse.json({
      files: textFiles,
      ...((cleaned > 0 || added > 0) ? { bookmarkSync: { cleaned, added } } : {})
    });
  } catch (error) {
    console.error('Error reading text files:', error);
    return NextResponse.json({ files: [] });
  }
}
