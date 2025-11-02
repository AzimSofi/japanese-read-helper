"use client";
import React, { useState } from "react";
import { API_ROUTES, PAGE_ROUTES } from "@/lib/constants";

export default function Home() {
    const [inputText, setInputText] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSubmit = async (e:React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        const response = await fetch(API_ROUTES.WRITE_TEXT, {
            method: "POST",
            headers: { "Content-Type": "application/json", },
            body: JSON.stringify({ text: inputText }),
        });

        if (!response.ok) {
            console.error("テキストの保存に失敗しました");
            console.error(response)
        } else {
            console.log("テキストの保存が完了しました");
            setIsLoading(false);
            setInputText("");
            window.location.replace(PAGE_ROUTES.HOME);
        }
    }

    return (
        <div>
            {isLoading ? (
                <div className="flex justify-center m-30 h-screen text-5xl font-semibold">
                    処理中...
                </div>
            ) : (
                // isLoadingがfalseの場合
                <div className="">
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col items-center h-screen mt-5">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="bg-[#D1D3D8] w-4xl h-64 m-1 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#86B0BD]"
                            ></textarea>
                            <button
                                type="submit"
                                className="bg-[#86B0BD] hover:bg-[#6a98a8] text-white font-bold py-2 px-4 rounded hover:cursor-pointer w-4xl"
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
