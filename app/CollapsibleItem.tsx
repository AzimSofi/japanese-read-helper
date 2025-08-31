"use client";

import React, { useState } from "react";

interface CollapsibleItemProps {
  head: string;
  subItems: string[];
  initialDropdownState?: boolean;
}

const CollapsibleItem: React.FC<CollapsibleItemProps> = ({
  head,
  subItems,
  initialDropdownState = false,
}) => {
  const [isOpen, setIsOpen] = useState(initialDropdownState);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  function Jisho(
    subItem: string
  ): { kanji: string; reading: string; meaning: string }[] {
    function KanjiReadingMeaningSplit(item: string) {
      const kanji = item.split("[")[0];
      let reading: string = "";
      let meaning: string = "";
      if (item.split("[")[1].split("]").includes("・")) { //　例：>>ジッパー[チャック、ファスナー]＊ノック[ドアなどを軽く叩くこと]　つまり　単語[意味]＊…
          reading = item.split("[")[1].split("・")[0];
          meaning = item.split("[")[1].split("・")[1].replace("]", "").trim();
      } else {
        reading = "";
        meaning = item.split("[")[1].split("]")[0];
      }

      // try {
      // } catch (e) {
      //   console.error(e, item); 
      //   meaning = "エラー";
      // }

      return { kanji, reading, meaning };
    }

    const parsed = subItem.split("＊");
    const words: { kanji: string; reading: string; meaning: string }[] = [];
    const doubleDefinition: string[] = [];
    parsed.forEach((item) => {
      if (item.includes("[") /*&& item.includes("・")*/ && item.includes("]")) {
        words.push(KanjiReadingMeaningSplit(item));
      } else {
        // debugger;
        doubleDefinition.push(item);
        if (doubleDefinition.length === 2) {
          words.push(KanjiReadingMeaningSplit(doubleDefinition.toString()));
          doubleDefinition.length = 0;
        }
      }
    });
    return words;
  }

  return (
    <div className="flex collapsibleItem">
      <div className="border p-2 my-1 w-full">
        <div
          className="head-text cursor-pointer font-bold text-lg"
          onClick={toggleOpen}
        >
          {head}
        </div>
        {isOpen && (
          <div className="ml-4 mt-2">
            {subItems.map((subItem, index) => (
              <div key={index} className="sub-item-text my-1">
                {index === 2 ? (
                  <div className="jisho-output-container bg-gray-50 p-2 rounded">
                    {Jisho(subItem).map((word, wordIndex) => (
                      <div
                        key={wordIndex}
                        className="jisho-word-entry mb-1 last:mb-0"
                      >
                        <ruby>
                          <span className="font-bold text-blue-700">
                            {word.kanji}
                          </span>
                          <rt>
                            <span className="text-black">{word.reading}</span>
                          </rt>
                        </ruby>
                        {/* <span className="font-bold text-blue-700">{word.kanji}</span> (
                        <span className="text-gray-600">{word.reading}</span>):{' '} */}
                        ：<span className="text-green-700">{word.meaning}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  subItem
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollapsibleItem;
