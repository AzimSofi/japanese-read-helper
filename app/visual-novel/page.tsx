"use client";

import React from "react";
import { useState, useCallback } from "react";
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
>>鎖錠さんの家から逃げようとしたその時

---
それでは、以下の文章でお願いします：
        `;
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const MAX_RETRY_ATTEMPTS = 5;

    const findLastPTagContent = (): string | null => {
        const pElements = document.querySelectorAll("p");
        if (pElements.length > 0) {
            const lastP = pElements[pElements.length - 1];
            return lastP.textContent;
        }
        return null;
    };

    const handleButtonClick = useCallback(async (initialInstruction = aiInstructions) => {
        if (isLoading) return;

        setIsLoading(true);
        let currentInstruction = initialInstruction;
        let attempt = 0;
        let success = false;
        let apiResponseData = null;

        while (attempt < MAX_RETRY_ATTEMPTS && !success) {
            try {
                const contentToPrompt = findLastPTagContent();
                if (contentToPrompt === null) {
                    console.error("対象となるPタグのコンテンツが見つかりません。");
                    setIsLoading(false);
                    return;
                }

                console.log(`Attempt ${attempt + 1}: Sending prompt...`);
                const res = await fetch('/api/gemini-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt_post: currentInstruction + contentToPrompt }),
                });

                apiResponseData = await res.json();

                const parsedItems = parseMarkdown(apiResponseData.response);
                const allItemsValid = parsedItems.every(item => 
                    item.head && item.head.length > 0 && item.subItems.length > 0
                );

                if (allItemsValid && parsedItems.length > 0) {
                    success = true;
                    // console.log("API response format is valid.");
                } else {
                    console.warn(`API response format invalid on attempt ${attempt + 1}. Retrying...`);
                    console.log("Invalid data response: ", apiResponseData.response);
                    currentInstruction = "回答のフォーマットが正しくありません。もう一度やり直してください。必ず下記の構成に従ってください。\n" + aiInstructions;
                }
            } catch (error) {
                console.error(`Error on attempt ${attempt + 1}:`, error);
            }
            attempt++;
        }

        if (success && apiResponseData) {
            setResponse(apiResponseData.response);
        } else {
            console.error(`Failed to get a valid response after multiple(${attempt}) attempts.`);
            setResponse("エラー: 正しい形式の応答が得られませんでした。");
        }
        setIsLoading(false);
    }, [aiInstructions, isLoading]);

    const handleFlushButtonClick = () => {
        const pElements = document.querySelectorAll("p");
        if (pElements.length > 0) {
            for (let i = 0; i < pElements.length - 1; i++) {
                pElements[i].innerHTML = "";
            }
        }
        // setResponse(''); // 応答もクリアする
    };

    return (
        <div className="p-2 bg-gray-100 flex flex-col">
            <input
                value={aiInstructions + findLastPTagContent()}
                type="hidden"
                readOnly
            />
            <button
                onClick={() => handleButtonClick()}
                className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
            >
                {isLoading ? '処理中...' : '最後のPタグ'}
            </button>
            <button
                onClick={handleFlushButtonClick}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
                Flush
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
