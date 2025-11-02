"use client";
import React, { useState } from "react";
import { API_ROUTES, PAGE_ROUTES, CSS_VARS } from "@/lib/constants";

export default function Home() {
    const [inputText, setInputText] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSubmit = async (e:React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        const response = await fetch(API_ROUTES.WRITE_TEXT_AI, {
            method: "POST",
            headers: { "Content-Type": "application/json", },
            body: JSON.stringify({ text: inputText }),
        });

        if (!response.ok) {
            console.error("AIテキスト処理に失敗しました");
        } else {
            console.log("AIテキスト処理が完了しました");
            setIsLoading(false);
        }

        setInputText("");
        window.location.replace(PAGE_ROUTES.HOME);
    }

    return (
        <div>
            {isLoading ? (
                <div className="flex justify-center m-30 h-screen text-5xl font-semibold">
                    AIで処理中...
                </div>
            ) : (
                // isLoadingがfalseの場合
                <div className="">
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col items-center h-screen mt-5">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="w-4xl h-64 m-1 rounded-lg border border-gray-300 focus:outline-none focus:ring-2"
                                style={{
                                  backgroundColor: CSS_VARS.NEUTRAL,
                                  '--tw-ring-color': CSS_VARS.SECONDARY,
                                } as React.CSSProperties}
                            ></textarea>
                            <button
                                type="submit"
                                className="text-white font-bold py-2 px-4 rounded hover:cursor-pointer w-4xl transition-colors"
                                style={{
                                  background: `linear-gradient(to bottom, ${CSS_VARS.SECONDARY}, ${CSS_VARS.SECONDARY_DARK})`,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = CSS_VARS.SECONDARY_DARK;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = `linear-gradient(to bottom, ${CSS_VARS.SECONDARY}, ${CSS_VARS.SECONDARY_DARK})`;
                                }}
                            >
                                保存
                            </button>
                            <p>文字数: {inputText.length}</p>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
