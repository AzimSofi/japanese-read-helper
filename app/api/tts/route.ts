import { NextResponse } from "next/server";
import { TTS_CONFIG } from "@/lib/constants";
import type { TTSRequest, TTSResponse } from "@/lib/types";
import { cleanTextForTTS } from "@/lib/utils/ttsTextCleaner";

const TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";

/**
 * Text-to-Speech APIエンドポイント
 * テキストを受け取り、音声データ(base64)を返す
 * Google Cloud TTS REST APIをAPIキーで直接呼び出す
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { audioContent: '', message: 'GOOGLE_TTS_API_KEY が設定されていません。' },
      { status: 500 }
    );
  }

  try {
    const body: TTSRequest = await request.json();
    const { text, speed = TTS_CONFIG.DEFAULT_SPEED, voiceGender = TTS_CONFIG.DEFAULT_VOICE_GENDER } = body;

    if (!text) {
      return NextResponse.json(
        { audioContent: '', message: 'テキストが提供されていません' },
        { status: 400 }
      );
    }

    const cleanedText = cleanTextForTTS(text);

    if (!cleanedText) {
      return NextResponse.json(
        { audioContent: '', message: 'テキストが空です' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] TTS リクエスト受信 - 文字数: ${cleanedText.length}, 速度: ${speed}, 音声: ${voiceGender}`);

    const voiceName = voiceGender === 'MALE'
      ? TTS_CONFIG.VOICES.MALE
      : TTS_CONFIG.VOICES.FEMALE;

    const response = await fetch(`${TTS_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: cleanedText },
        voice: {
          languageCode: TTS_CONFIG.LANGUAGE_CODE,
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: speed,
          pitch: 0,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('TTS生成中にエラーが発生しました:', response.status, errorBody);
      return NextResponse.json(
        { audioContent: '', message: `Google TTS エラー (${response.status})` },
        { status: 502 }
      );
    }

    // REST APIはaudioContentを既にbase64で返すため変換不要
    const data: { audioContent?: string } = await response.json();

    console.log(`[${new Date().toISOString()}] TTS 生成完了。経過時間: ${Date.now() - startTime}ms`);

    const result: TTSResponse = {
      audioContent: data.audioContent ?? '',
      message: '音声を生成しました',
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('TTS生成中にエラーが発生しました:', error);

    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';

    return NextResponse.json(
      { audioContent: '', message: errorMessage },
      { status: 500 }
    );
  }
}
