"use client";
import React, { useState } from "react";

export default function Home() {

    const [inputText, setInputText] = useState<string>("");

    const handleSubmit = async (e:React.FormEvent) => {
        e.preventDefault();
        const response = await fetch("/api/save-text", {
            method: "POST",
            headers: { "Content-Type": "application/json", },
            body: JSON.stringify({ text: inputText }),
        });

        if (!response.ok) {
            console.error("/api/saveTextは失敗");
        } else {
            console.log("/api/saveTextは完了");
        }

        setInputText("");
        window.location.reload();
    }

    return (
        <div className="">
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col items-center h-screen mt-5">
                    <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="bg-gray-200 w-4xl h-64 m-1 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                    <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded hover:cursor-pointer w-4xl"
                    >
                        保存
                    </button>
                </div>
            </form>
        </div>
    )
}
