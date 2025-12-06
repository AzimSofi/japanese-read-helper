import { NextResponse } from "next/server";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { TTS_CONFIG } from "@/lib/constants";
import type { TTSRequest, TTSResponse } from "@/lib/types";
import { cleanTextForTTS } from "@/lib/utils/ttsTextCleaner";

// Google Cloud TTS クライアント（認証情報は環境変数から自動取得）
let ttsClient: TextToSpeechClient | null = null;

function getTTSClient(): TextToSpeechClient {
  if (!ttsClient) {
    // GOOGLE_APPLICATION_CREDENTIALS 環境変数から認証情報を読み込む
    // または GOOGLE_CLOUD_PROJECT と API キーを使用
    ttsClient = new TextToSpeechClient();
  }
  return ttsClient;
}

/**
 * Text-to-Speech APIエンドポイント
 * テキストを受け取り、音声データ(base64)を返す
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body: TTSRequest = await request.json();
    const { text, speed = TTS_CONFIG.DEFAULT_SPEED, voiceGender = TTS_CONFIG.DEFAULT_VOICE_GENDER } = body;

    if (!text) {
      return NextResponse.json(
        { audioContent: '', message: 'テキストが提供されていません' },
        { status: 400 }
      );
    }

    // テキストをTTS用にクリーンアップ
    const cleanedText = cleanTextForTTS(text);

    if (!cleanedText) {
      return NextResponse.json(
        { audioContent: '', message: 'テキストが空です' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] TTS リクエスト受信 - 文字数: ${cleanedText.length}, 速度: ${speed}, 音声: ${voiceGender}`);

    // 音声名を選択
    const voiceName = voiceGender === 'MALE'
      ? TTS_CONFIG.VOICES.MALE
      : TTS_CONFIG.VOICES.FEMALE;

    const client = getTTSClient();

    const [response] = await client.synthesizeSpeech({
      input: { text: cleanedText },
      voice: {
        languageCode: TTS_CONFIG.LANGUAGE_CODE,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speed,
        pitch: 0, // デフォルトピッチ
      },
    });

    console.log(`[${new Date().toISOString()}] TTS 生成完了。経過時間: ${Date.now() - startTime}ms`);

    // 音声データをbase64に変換
    const audioContent = response.audioContent
      ? Buffer.from(response.audioContent).toString('base64')
      : '';

    const result: TTSResponse = {
      audioContent,
      message: '音声を生成しました',
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('TTS生成中にエラーが発生しました:', error);

    // 認証エラーの場合は特別なメッセージ
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    const isAuthError = errorMessage.includes('Could not load the default credentials');

    return NextResponse.json(
      {
        audioContent: '',
        message: isAuthError
          ? 'Google Cloud認証が設定されていません。GOOGLE_APPLICATION_CREDENTIALS環境変数を設定してください。'
          : errorMessage,
      },
      { status: 500 }
    );
  }
}
