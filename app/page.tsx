"use client";
import CollapsibleItem from "./CollapsibleItem";
import { parseMarkdown } from "../lib/parserMarkdown";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function Home() {
  const [inputText, setInputText] = useState<string>("");
  const englishRegex = /[a-zA-Z]/;
  const exampleText = `
  <膨大な資料を短時間で読み解くための 「仮説」と「異常値」>>大量の資料を短い時間で理解するために使う
        「仮説」と「例外」
        >>たくさんの資料を短い時間で理解するヒントは
        「仮説」と「普通ではないこと」
        >>資料を早く読むコツは「仮説」と「異常値」
  `;
  const fileName: string = useSearchParams().get("fileName") || "text-1";
  const dropdownAlwaysOpenParam = useSearchParams().get("dropdownAlwaysOpen");
  const dropdownAlwaysOpen: boolean = dropdownAlwaysOpenParam === null ? true : dropdownAlwaysOpenParam === "true";

  // ※ 学んだこと
  // ※ useEffectを使わないと：　fetch → setInputText → 再レンダリング → fetch → setInputText → ... という無限ループに陥ってしまう
  // useEffect のコールバック関数は、コンポーネントが レンダリングされた後 に実行されます

  // コンポーネントがマウントされたときに一度実行、useEffectの第2引数の配列 []
  // マウントされたコンポーネントが レンダリングされるたびに毎回 実行される
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/read-public-txt?fileName=${fileName}`, {
          method: "GET",
        });
        if (response.ok) {
          const data = await response.json();
          setInputText(data.text);
        } else {
          console.error(response);
          setInputText(exampleText);
        }
      } catch (e) {
        console.error(e);
        setInputText(exampleText);
      }
    };

    fetchData();
  }, []);

  if (!inputText) {
    return <div className="mx-36 my-5">Loading content...</div>;
  }

  return (
    <div className="mx-36 my-5">
      {parseMarkdown(inputText).map((item, index) => (
        <CollapsibleItem
          key={index}
          head={item.head}
          subItems={item.subItems}
          initialDropdownState={ dropdownAlwaysOpen
            /*englishRegex.test(item.head) ||  item.subItems.length > 3
              ? true
              : false ||
                (item.subItems[2] !== "" && item.subItems[2] !== "無い")*/
          }
        />
      ))}
    </div>
  );
}
