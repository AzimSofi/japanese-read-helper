import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  ai_instructions_quick,
  ai_instructions_story,
  ai_instructions_nuance,
  ai_instructions_speaker,
  ai_instructions_narrative,
} from "@/lib/geminiService";
import { AI_MODELS, EXPLANATION_MODES } from "@/lib/constants";
import type { ExplanationRequest, ExplanationResponse } from "@/lib/types";

/**
 * 文の説明を生成するAPIエンドポイント
 * コンテキストを含めて文の意味を日本語で説明
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body: ExplanationRequest = await request.json();
    const { sentence, context, fileName, contextSize, mode } = body;

    console.log(`[${new Date().toISOString()}] 説明リクエスト受信 - ファイル: ${fileName}, モード: ${mode}, コンテキストサイズ: ${contextSize}. 経過時間: ${Date.now() - startTime}ms`);

    if (!sentence) {
      return NextResponse.json(
        { explanation: '', message: '文が提供されていません' },
        { status: 400 }
      );
    }

    // モードに応じた instruction を選択
    const instructionMap = {
      [EXPLANATION_MODES.QUICK]: ai_instructions_quick,
      [EXPLANATION_MODES.STORY]: ai_instructions_story,
      [EXPLANATION_MODES.NUANCE]: ai_instructions_nuance,
      [EXPLANATION_MODES.SPEAKER]: ai_instructions_speaker,
      [EXPLANATION_MODES.NARRATIVE]: ai_instructions_narrative,
    };

    const selectedInstruction = instructionMap[mode] || ai_instructions_quick;

    // プロンプトを構築（コンテキスト付き）
    const prompt = context
      ? `${selectedInstruction}

【コンテキスト（前後の文）】
${context}

【説明が必要な文】
${sentence}`
      : `${selectedInstruction}

${sentence}`;

    // Gemini APIを呼び出し
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const aiCallStartTime = Date.now();
    const response = await ai.models.generateContent({
      model: AI_MODELS.GEMINI_2_5_FLASH_LITE,
      contents: [{ text: prompt }],
    });

    console.log(`[${new Date().toISOString()}] Gemini API レスポンス受信。AI呼び出し時間: ${Date.now() - aiCallStartTime}ms。合計経過時間: ${Date.now() - startTime}ms`);

    const explanation = response.text || '';

    const result: ExplanationResponse = {
      explanation,
      message: '説明を取得しました',
    };

    console.log(`[${new Date().toISOString()}] レスポンスを送信します。合計リクエスト時間: ${Date.now() - startTime}ms`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('文の説明生成中にエラーが発生しました:', error);

    return NextResponse.json(
      {
        explanation: '',
        message: error instanceof Error ? error.message : '不明なエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
