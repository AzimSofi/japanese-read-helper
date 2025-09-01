import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const startTime = Date.now();

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let response;

  console.log(`[${new Date().toISOString()}] リクエスト受信。経過時間: ${Date.now() - startTime}ms`);

  if (request.headers.get("content-type") == "application/json") {
    const { prompt_post, ai_model } = await request.json();
    console.log(`[${new Date().toISOString()}] JSONペイロードを解析しました。経過時間: ${Date.now() - startTime}ms`);

    const aiCallStartTime = Date.now();
    response = await ai.models.generateContent({
      model: ai_model,
      contents: prompt_post,
    });
    console.log(`[${new Date().toISOString()}] Gemini API (JSON) レスポンス受信。AI呼び出し時間: ${Date.now() - aiCallStartTime}ms。合計経過時間: ${Date.now() - startTime}ms`);

  } else {
    const formData = await request.formData();
    const prompt_post = formData.get("prompt_post") as string;
    const ai_model = formData.get("ai_model") as string;

    console.log(`[${new Date().toISOString()}] FormDataを解析しました。経過時間: ${Date.now() - startTime}ms`);

    const imageFile = formData.get("image") as File;
    if (imageFile) {
      const imageArrayBuffer = await imageFile.arrayBuffer();
      const base64ImageData = Buffer.from(imageArrayBuffer).toString("base64");
      console.log(`[${new Date().toISOString()}] 画像を処理しました。経過時間: ${Date.now() - startTime}ms`);

      const aiCallStartTime = Date.now();
      response = await ai.models.generateContent({
        model: ai_model,
        contents: [
          {
            inlineData: {
              mimeType: imageFile.type || "image/jpeg",
              data: base64ImageData,
            },
          },
          { text: prompt_post },
        ],
      });
      console.log(`[${new Date().toISOString()}] Gemini API (画像) レスポンス受信。AI呼び出し時間: ${Date.now() - aiCallStartTime}ms。合計経過時間: ${Date.now() - startTime}ms`);
      console.log(response.text);
    } else {
      const aiCallStartTime = Date.now();
      response = await ai.models.generateContent({
        model: ai_model,
        contents: [{ text: prompt_post }],
      });
      console.log(`[${new Date().toISOString()}] Gemini API (テキストのみ) レスポンス受信。AI呼び出し時間: ${Date.now() - aiCallStartTime}ms。合計経過時間: ${Date.now() - startTime}ms`);
    }
  }

  console.log(`[${new Date().toISOString()}] レスポンスを送信します。合計リクエスト時間: ${Date.now() - startTime}ms`);
  
  return NextResponse.json({
    response: response.text, 
    message: "おけです！",
  });
}
