/**
 * AI処理済みテキストを書き込むためのAPIルート
 * 大きなテキストをチャンクに分割し、Gemini AIで処理する
 */

import { NextResponse } from 'next/server';
import { generateGeminiContent, ai_instructions } from '@/lib/geminiService';
import { writeTextFile } from '@/lib/services/fileService';
import { DEFAULT_TEXT_FILES, MAX_CHUNK_SIZE, AI_MODELS } from '@/lib/constants';
import type { TextRequest, WriteResponse } from '@/lib/types';

/**
 * 文字数制限内に収まるように、テキストを行数に基づいてチャンクに分割する
 */
function splitTextIntoChunks(text: string, maxChars: number): string[][] {
  const lines = text.split('\n');
  const textLength = text.length;

  // チャンク数を決定する
  if (textLength / 2 < maxChars) {
    // 2つのチャンクに分割
    const midPoint = Math.floor(lines.length / 2);
    return [
      lines.slice(0, midPoint),
      lines.slice(midPoint + 1),
    ];
  } else if (textLength / 3 < maxChars) {
    // 3つのチャンクに分割
    const thirdPoint = Math.floor(lines.length / 3);
    const twoThirdPoint = Math.floor((lines.length * 2) / 3);
    return [
      lines.slice(0, thirdPoint),
      lines.slice(thirdPoint + 1, twoThirdPoint),
      lines.slice(twoThirdPoint + 1),
    ];
  } else {
    // テキストが大きすぎる場合
    throw new Error('入力の文字数が多すぎます（12000文字数を超えました）。');
  }
}

export async function POST(request: Request): Promise<NextResponse<WriteResponse>> {
  try {
    const { text }: TextRequest = await request.json();

    if (!text) {
      return NextResponse.json(
        { message: 'テキストが提供されていません。', success: false },
        { status: 400 }
      );
    }

    // Split text into processable chunks
    let textChunks: string[][];
    try {
      textChunks = splitTextIntoChunks(text, MAX_CHUNK_SIZE);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ message, success: false }, { status: 500 });
    }

    // Process each chunk with AI
    let combinedAiResponse = '';
    for (const chunk of textChunks) {
      const chunkText = chunk.join('\n');
      const aiResponse = await generateGeminiContent(
        ai_instructions + chunkText,
        AI_MODELS.GEMINI_FLASH
      );
      combinedAiResponse += aiResponse;
    }

    // Save combined result
    await writeTextFile(DEFAULT_TEXT_FILES.TEMP, combinedAiResponse);

    console.log('サーバー側ログ: テキストを保存しました。');
    return NextResponse.json(
      { message: 'テキストが保存されました。' },
      { status: 200 }
    );
  } catch (error) {
    console.error('サーバー側エラー: ファイルの書き込み中にエラーが発生しました:', error);
    return NextResponse.json(
      { message: 'サーバーでファイルの書き込みに失敗しました。', success: false },
      { status: 500 }
    );
  }
}
