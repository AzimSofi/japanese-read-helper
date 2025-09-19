"use client";
import CollapsibleItem from "./CollapsibleItem";
import { parseMarkdown } from "../lib/parserMarkdown";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "./layout/sidebar";

export default function Home() {
  const fileName: string = useSearchParams().get("fileName") || "text-1";
  const dropdownAlwaysOpenParam = useSearchParams().get("dropdownAlwaysOpen");
  const [inputText, setInputText] = useState<string>("");
  const [bookmarkText, setBookmarkText] = useState<string>("");
  const [dropdownAlwaysOpenState, setDropdownAlwaysOpenState] = useState<boolean>(true);
  const englishRegex = /[a-zA-Z]/;
  const exampleText = `
  <膨大な資料を短時間で読み解くための 「仮説」と「異常値」>>大量の資料を短い時間で理解するために使う
        「仮説」と「例外」
        >>たくさんの資料を短い時間で理解するヒントは
        「仮説」と「普通ではないこと」
        >>資料を早く読むコツは「仮説」と「異常値」
  `;


  // ※ 学んだこと
  // ※ useEffectを使わないと：　fetch → setInputText → 再レンダリング → fetch → setInputText → ... という無限ループに陥ってしまう
  // useEffect のコールバック関数は、コンポーネントが レンダリングされた後 に実行されます

  // コンポーネントがマウントされたときに一度実行、useEffectの第2引数の配列 []
  // マウントされたコンポーネントが レンダリングされるたびに毎回 実行される
  useEffect(() => {
    setDropdownAlwaysOpenState(dropdownAlwaysOpenParam === null ? true : dropdownAlwaysOpenParam === "true");
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
    }

    const fetchBookmark = async () => {
      try {
        const response = await fetch(`/api/read-bookmark`, {
          method: "GET",
        });
        if (response.ok) {
          const data = await response.json();
          setBookmarkText(data.text);
          // console.log(data.text);
        } else {
          console.error(response);
        }
      } catch (e) {
        console.error(e);
      }
    }
    ;

    fetchData();
    fetchBookmark();
  }, []);

  if (!inputText) {
    return <div className="mx-36 my-5">Loading content...</div>;
  }

  return (
    <div className="mx-36 my-5">
      <Sidebar setDropdownAlwaysOpenState={setDropdownAlwaysOpenState} dropdownAlwaysOpenState={dropdownAlwaysOpenState} />
      <a
        href="#bookmark"
        className="hover:underline outline-1"
        onClick={() => {
          // console.log("ブックマークへ", bookmarkText);
          // console.log("結果：", document.getElementById("bookmark"));
        }}
      >
        ブックマークへ
      </a>
      {parseMarkdown(inputText).map((item, index) => (
        <CollapsibleItem
          {...(item.head.includes(bookmarkText) ? { id: "bookmark" } : {})}
          key={index}
          head={item.head}
          subItems={item.subItems}
          initialDropdownState={ dropdownAlwaysOpenState
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
