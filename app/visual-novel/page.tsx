"use client";

import React from "react";

export default function Home() {
    const findLastPTagContent = (): string | null => {
        const pElements = document.querySelectorAll("p");
        if (pElements.length > 0) {
            const lastP = pElements[pElements.length - 1];
            return lastP.textContent;
        }
        return null;
    };

    const handleButtonClick = () => {
    const lastPText = findLastPTagContent();

    if (lastPText !== null) {
        console.log(lastPText);
    } else {
        // console.log("ページに<p>タグが見つかりませんでした。");
    }
  };

  return (
    <div className="p-2 bg-gray-100 flex flex-col" id="page-container">
      <button
        onClick={handleButtonClick}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        最後のPタグ
      </button>
    </div>
  );
}
