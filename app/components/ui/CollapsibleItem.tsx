"use client";

import React, { useEffect, useState } from "react";
import BookmarkUnfilled from "@/app/components/icons/BookmarkUnfilled";
import BookmarkFilled from "@/app/components/icons/BookmarkFilled";
import ChevronUp from "@/app/components/icons/ChevronUp";
import ChevronDown from "@/app/components/icons/ChevronDown";
import { useSearchParams } from "next/navigation";

interface CollapsibleItemProps {
  id?: string;
  head: string;
  subItems: string[];
  initialDropdownState?: boolean;
  onSubmitSuccess: () => void;
}

const CollapsibleItem: React.FC<CollapsibleItemProps> = ({
  id,
  head,
  subItems,
  initialDropdownState = false,
  onSubmitSuccess,
}) => {
  const fileName: string = useSearchParams().get("fileName") || "text-1";
  const [isOpen, setIsOpen] = useState(initialDropdownState);
  const [loading, setLoading] = useState(false);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    setIsOpen(initialDropdownState);
  }, [initialDropdownState]);

  function KanjiReadingMeaningSplit(item: string) {
    const kanji = item.split("[")[0];
    let reading: string = "";
    let meaning: string = "";
    if (item.includes("[") && item.includes("]")) {
      if (item.split("[")[1].split("]")[0].includes("・")) {
        //　例：>>ジッパー[チャック、ファスナー]＊ノック[ドアなどを軽く叩くこと]　つまり　単語[意味]＊…
        reading = item.split("[")[1].split("・")[0];
        meaning = item.split("[")[1].split("・")[1].replace("]", "").trim();
      } else {
        reading = "";
        meaning = item.split("[")[1].split("]")[0];
      }
    } else {
      console.error("error: ", item);
    }

    return { kanji, reading, meaning };
  }

  function Jisho(
    subItem: string
  ): { kanji: string; reading: string; meaning: string }[] {
    let parsed: string[] = [];
    if (subItem.includes("＊")) {
      parsed = subItem.split("＊");
    } else if (subItem.includes("]")) {
      parsed = subItem.split("]");
      const mappedParsed = parsed.map((element) => {
        return element + "]";
      });
      mappedParsed.pop();
      parsed = mappedParsed;
    } else if (subItem.includes("、")) {
      parsed = subItem.split("、");
    } else {
      if (
        !(
          subItem === "無い" ||
          subItem === "ない" ||
          subItem === "無し" ||
          subItem === "なし" ||
          subItem === "無"
        )
      ) {
        console.error("Error: ", subItem);
      }
      parsed = [subItem];
    }
    const words: { kanji: string; reading: string; meaning: string }[] = [];
    const multipleDefinition: string[] = [];
    parsed.forEach((item) => {
      if (item.includes("[") /*&& item.includes("・")*/ && item.includes("]")) {
        words.push(KanjiReadingMeaningSplit(item));
      } else {
        multipleDefinition.push(item);
        if (item.includes("]")) {
          words.push(KanjiReadingMeaningSplit(multipleDefinition.toString()));
          multipleDefinition.length = 0;
        }
      }
    });
    return words;
  }

  const itemRef = React.useRef<HTMLDivElement>(null);
  const headRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [headSize, setHeadSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  useEffect(() => {
    if (itemRef.current) {
      setSize({
        width: itemRef.current.offsetWidth,
        height: itemRef.current.offsetHeight,
      });
    }
    if (headRef.current) {
      setHeadSize({
        width: headRef.current.offsetWidth,
        height: headRef.current.offsetHeight,
      });
    }
  }, [itemRef]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch("/api/write-bookmark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target: fileName, content: head }),
      });
      if (!response.ok) {
        throw new Error("失敗");
      }
      onSubmitSuccess();
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex collapsibleItem" id={id}>
      <div
        className={`p-2 my-1 w-full ${id === "bookmark" ? "bg-yellow-100" : ""}`}
        id="collapsible-item"
        ref={itemRef}
      >
        <div
          className={"head-text font-bold text-lg whitespace-pre-wrap"}
          ref={headRef}
        >
          {head}
        </div>
        {/* <div className="ml-4 mt-2">
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
                        ：<span className="text-green-700">{word.meaning}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  null
                )}
              </div>
            ))}
          </div>
        </div> */}
        {isOpen && (
          <div className="ml-4 mt-2">
            {subItems.map((subItem, index) => (
              <div key={index} className="sub-item-text my-1">
                {index === 4
                  ? /*<div className="jisho-output-container bg-gray-50 p-2 rounded">
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
                        ：<span className="text-green-700">{word.meaning}</span>
                      </div>
                    ))}
                  </div>*/ ""
                  : subItem}
              </div>
            ))}
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit}>
        <button
          // onClick={() => console.log("Bookmark機能は未実装")}
          disabled={loading}
          type="submit"
          style={{
            position: "absolute",
            marginLeft: '0.5rem',
            marginTop: '0.3rem',
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer"
          }}
          className={id === "bookmark" ? 'cursor-pointer' : ''}
          aria-label="Bookmark"
        >
          {id === "bookmark" ? <BookmarkFilled /> : <BookmarkUnfilled />}
        </button> 
      </form>
      <span onClick={toggleOpen} className="cursor-pointer select-none"
        style={{
            marginLeft: '0.35rem',
            marginTop: '1.3rem',
            background: "none",
            border: "none",
            padding: 0,
        }}
      >
        {isOpen ? <ChevronUp /> : <ChevronDown />}
      </span>

    </div>
  );
};

export default CollapsibleItem;
