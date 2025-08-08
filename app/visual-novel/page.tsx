"use client";

import React from "react";
import { GoogleGenAI } from "@google/genai";
import { useState } from "react";
import { parseMarkdown } from "../../lib/parserMarkdown";
import CollapsibleItem from "../CollapsibleItem";

export default function Home() {
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
>>鎖錠さんの家から逃げようとしたその時、

---
それでは、以下の文章でお願いします：
        `;
    const [response, setResponse] = useState('');


    const findLastPTagContent = (): string | null => {
        const pElements = document.querySelectorAll("p");
        if (pElements.length > 0) {
            const lastP = pElements[pElements.length - 1];
            return lastP.textContent;
        }
        return null;
    };

    const handleButtonClick = async () => {
        // console.log(aiInstructions + findLastPTagContent());
        const res = await fetch('/api/gemini-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt_post: aiInstructions + findLastPTagContent() }),
        });
        const data = await res.json();
        setResponse(data.response);
    };

  return (
    <div className="p-2 bg-gray-100 flex flex-col">
        <input
            value={aiInstructions + findLastPTagContent()}
            type="hidden"
        />
        <button
            onClick={handleButtonClick}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            最後のPタグ
        </button>
        <div className="">
            {parseMarkdown(response).map((item, index) => (
                <CollapsibleItem
                    key={index}
                    head={item.head}
                    subItems={item.subItems}
                    initialDropdownState={true}
                />
            ))}
      </div>

    </div>
  );
}
