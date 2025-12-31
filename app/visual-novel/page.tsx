"use client";

import React from "react";
import { useState, useCallback } from "react";
import { parseMarkdown } from "@/lib/utils/markdownParser";
import CollapsibleItem from "@/app/components/ui/CollapsibleItem";
import { ai_instructions } from "@/lib/ai";
import { VN_RETRY_CONFIG, AI_MODELS, API_ROUTES, CSS_VARS } from "@/lib/constants";

export default function Home() {
  const aiInstructions: string = ai_instructions;
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState<boolean>(false);

  const findLastPTagContent = (): string | null => {
    if (typeof document !== "undefined") {
      const pElements = document.querySelectorAll("p");
      if (pElements.length > 0) {
        const lastP = pElements[pElements.length - 1];
        return lastP.textContent;
      }
      return null;
    }
    return null;
  };

  const handleButtonClick = useCallback(
    async (initialInstruction = aiInstructions) => {
      if (isLoading) return;

      setIsLoading(true);
      let currentInstruction = initialInstruction;
      let attempt = 0;
      let success = false;
      let apiResponseData = null;

      while (attempt < VN_RETRY_CONFIG.MAX_ATTEMPTS && !success) {
        try {
          const contentToPrompt = findLastPTagContent();
          if (contentToPrompt === null) {
            console.error("対象となるPタグのコンテンツが見つかりません。");
            setIsLoading(false);
            return;
          }

        //   const formData = new FormData();
        //   formData.append("image", "");
        //   formData.append("prompt_post", currentInstruction + contentToPrompt);
        //   formData.append("ai_model", "gemini-2.5-flash");

        console.log(`${attempt + 1}回目の試行: プロンプトを送信中...`);
        const res = await fetch(API_ROUTES.GEMINI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt_post: currentInstruction + contentToPrompt,
              ai_model: AI_MODELS.GEMINI_FLASH
            }),
        });
        if (res.ok) {
          const text = await res.text();
          apiResponseData = JSON.parse(text);
        } else {
          console.error(res.statusText);
        }

        const parsedItems = parseMarkdown(apiResponseData.response);
          const allItemsValid = parsedItems.every(
            (item) =>
              item.head && item.head.length > 0 && item.subItems.length > 0
          );

          if (allItemsValid && parsedItems.length > 0) {
            success = true;
          } else {
            console.warn(
              `${
                attempt + 1
              }回目の試行でAPIレスポンスの形式が無効です。再試行します...`
            );
            console.log("無効なデータレスポンス: ", apiResponseData.response);
            console.log(
              "allItemsValid: ",
              allItemsValid,
              "parsedItems.length : ",
              parsedItems.length
            );
            currentInstruction =
              "回答のフォーマットが正しくありません。もう一度やり直してください。必ず下記の構成に従ってください。\n" +
              aiInstructions;
          }
        } catch (error) {
          console.error(`${attempt + 1}回目の試行でエラーが発生しました:`, error);
        }
        attempt++;
      }

      if (success && apiResponseData) {
        setResponse(apiResponseData.response);
      } else {
        console.error(
          `複数回(${attempt}回)試行しましたが、有効な応答を取得できませんでした。`
        );
        setResponse("エラー: 正しい形式の応答が得られませんでした。");
        setIsError(true);
      }
      setIsLoading(false);
    },
    [aiInstructions, isLoading]
  );

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
    <div
      className="p-2 flex flex-col"
      style={{ backgroundColor: CSS_VARS.BASE }}
    >
      <span
        style={{
          height: "20rem",
          overflow: "auto",
          alignContent:
            "end" /*display: "flex", flexDirection: "column-reverse"*/,
        }}
      ></span>
      <input
        value={aiInstructions + findLastPTagContent()}
        type="hidden"
        readOnly
      />
              <button
              onClick={handleFlushButtonClick}
              className="text-white font-bold py-2 px-4 rounded hover:cursor-pointer transition-colors"
              style={{
                background: `linear-gradient(to bottom, ${CSS_VARS.PRIMARY}, ${CSS_VARS.PRIMARY_DARK})`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = CSS_VARS.PRIMARY_DARK;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `linear-gradient(to bottom, ${CSS_VARS.PRIMARY}, ${CSS_VARS.PRIMARY_DARK})`;
              }}
            >
              クリア
            </button>
      <button
        onClick={() => handleButtonClick()}
        className={`text-white font-bold py-2 px-4 rounded hover:cursor-pointer transition-colors ${
          isLoading ? "opacity-50 cursor-not-allowed" : ""
        }`}
        style={{
          background: `linear-gradient(to bottom, ${CSS_VARS.SECONDARY}, ${CSS_VARS.SECONDARY_DARK})`,
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.background = CSS_VARS.SECONDARY_DARK;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = `linear-gradient(to bottom, ${CSS_VARS.SECONDARY}, ${CSS_VARS.SECONDARY_DARK})`;
        }}
        disabled={isLoading}
      >
        {isLoading ? "処理中..." : "最後のPタグ"}
      </button>
      <div className="">
        {parseMarkdown(response, isError).map((item, index) => (
          <CollapsibleItem
            key={index}
            head={item.head}
            subItems={item.subItems}
            initialDropdownState={true}
            onSubmitSuccess={() => {}}
          />
        ))}
      </div>
    </div>
  );
}
