import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateGeminiContent } from '@/lib/geminiService';

export async function POST(request: Request) {
  const aiInstructions = `
以下の文章について、日本語学習者が意味を掴みやすくするために、いくつかの異なる表現で書き換えてください。回答は必ず下記の構成に従ってください。

<（原文）
>>元の文の意図を保ちつつ、少しだけ表現を変えた自然な日本語の文。
>>元の文の意図を保ちつつ、別の視点や構造で表現した自然な日本語の文。
>>元の文の核心的な意味を最もシンプルに伝わるようにした、平易な日本語の文。

一行ずつ、このフォーマットを繰り返してください。

例：
<尻尾を巻いて鎖錠さんちの玄関から離れようとした瞬間、
>>鎖錠さんの家の玄関から、まるで逃げるように立ち去ろうとしたその時、
>>鎖錠さんの家の玄関から、臆病に逃げ出すように離れようとした瞬間、
>>鎖錠さんの家から逃げようとしたその時

---
それでは、以下の文章でお願いします：
    `;
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'テキストが提供されていません。' }, { status: 400 });
    }

    // AIとのやり取り
    const splittedInputText: string[] = text.split("\n")
    let splittedTextResult: string[][];
    let combinedAiResponse: string = "";
    if (text.length / 2 < 4000) {
      const firstHalfOfText = splittedInputText.slice(0, splittedInputText.length/2);
      const secondHalfOfText = splittedInputText.slice((splittedInputText.length/2)+1, splittedInputText.length);
      splittedTextResult = [firstHalfOfText, secondHalfOfText];
    } else if (text.length / 3 < 4000) {
      const firstThreeQuarterOfText = splittedInputText.slice(0, splittedInputText.length/3);
      const secondThreeQuarterOfText = splittedInputText.slice((splittedInputText.length/3)+1, splittedInputText.length*2/3);
      const lastThreeQuarterOfText = splittedInputText.slice((splittedInputText.length*2/3)+1, splittedInputText.length);
      splittedTextResult = [firstThreeQuarterOfText, secondThreeQuarterOfText, lastThreeQuarterOfText];
    } else {
        return NextResponse.json({ error: '入力の文字数が多すぎます（12000文字数を超えました）。' }, { status: 500 });
    }

    // splittedTextResult.forEach((sectionedText: string[]) => {
    //   const aiResponseText = await generateGeminiContent(aiInstructions + sectionedText.join("\n"), "gemini-2.5-flash");
    //   combinedAiResponse += aiResponseText;
    // });

    for (const sectionedText of splittedTextResult) {
      const aiResponseText = await generateGeminiContent(aiInstructions + sectionedText.join("\n"), "gemini-2.5-flash");
      combinedAiResponse += aiResponseText;
    }


    // テキストを保存する過程
    const filePath = path.join(process.cwd(), 'public', 'text.txt');
    await fs.promises.writeFile(filePath, combinedAiResponse);

    console.log(`サーバー側ログ: "${filePath}" にテキストを保存しました。`);
    return NextResponse.json({ message: 'テキストが保存されました。' }, { status: 200 });

  } catch (error) {
    console.error('サーバー側エラー: ファイルの書き込み中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'サーバーでファイルの書き込みに失敗しました。' }, { status: 500 });
  }
}
