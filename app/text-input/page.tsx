"use client";
import React, { useState } from "react";

export default function Home() {
    const [inputText, setInputText] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSubmit = async (e:React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        const response = await fetch("/api/write-public-txt", {
            method: "POST",
            headers: { "Content-Type": "application/json", },
            body: JSON.stringify({ text: inputText }),
        });

        if (!response.ok) {
            console.error("/api/write-public-txtは失敗");
            console.error(response)
        } else {
            console.log("/api/write-public-txtは完了");
            setIsLoading(false);
            setInputText("");
            window.location.replace("./");            
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
                                className="bg-gray-200 w-4xl h-64 m-1 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            ></textarea>
                            <button
                                type="submit"
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded hover:cursor-pointer w-4xl"
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
