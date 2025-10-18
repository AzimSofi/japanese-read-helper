/**
 * publicディレクトリからテキストファイルを読み込むためのAPIルート
 */

import { NextResponse } from 'next/server';
import { readTextFile } from '@/lib/services/fileService';
import { DEFAULT_FILE_NAME } from '@/lib/constants';
import type { TextResponse } from '@/lib/types';

export async function GET(request: Request): Promise<NextResponse<TextResponse>> {
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('fileName') || DEFAULT_FILE_NAME;

  const content = await readTextFile(fileName);

  return NextResponse.json({ text: content });
}
