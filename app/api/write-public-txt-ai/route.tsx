import { NextResponse } from 'next/server';
import { generateGeminiContent } from '@/lib/geminiService';
import { ai_instructions } from '@/lib/geminiService';
import { writePublicTxt } from "../write-public-txt/route"

export async function POST(request: Request) {
  const aiInstructions: string = ai_instructions;
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'テキストが提供されていません。' }, { status: 400 });
    }

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

    await writePublicTxt(combinedAiResponse);

    console.log(`サーバー側ログ: "テキストを保存しました。`);
    return NextResponse.json({ message: 'テキストが保存されました。' }, { status: 200 });

  } catch (error) {
    console.error('サーバー側エラー: ファイルの書き込み中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'サーバーでファイルの書き込みに失敗しました。' }, { status: 500 });
  }
}
