"use client";

import CollapsibleItem from "@/app/components/ui/CollapsibleItem";
import { parseMarkdown } from "@/lib/utils/markdownParser";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/app/components/ui/Sidebar";
import { DEFAULT_FILE_NAME, DEFAULT_DROPDOWN_STATE } from "@/lib/constants";

export default function Home() {
  const fileName: string = useSearchParams().get("fileName") || DEFAULT_FILE_NAME;
  const dropdownAlwaysOpenParam = useSearchParams().get("dropdownAlwaysOpen");
  const [inputText, setInputText] = useState<string>("");
  const [bookmarkText, setBookmarkText] = useState<string>("");
  const [dropdownAlwaysOpenState, setDropdownAlwaysOpenState] = useState<boolean>(DEFAULT_DROPDOWN_STATE);
  const [isBookmarkUpdated, setIsBookmarkUpdated] = useState<boolean>(false);

  const exampleText = `
  <膨大な資料を短時間で読み解くための 「仮説」と「異常値」>>大量の資料を短い時間で理解するために使う
        「仮説」と「例外」
        >>たくさんの資料を短い時間で理解するヒントは
        「仮説」と「普通ではないこと」
        >>資料を早く読むコツは「仮説」と「異常値」
  `;

  // ブックマーク比較用に改行を削除して正規化する
  const normalizeForComparison = (text: string): string => {
    return text.replace(/[\r\n]/g, '');
  };

  // useEffectは、コンポーネントがマウントされた後にデータ取得が行われることを保証します
  // これにより、無限レンダリングループ（フェッチ → setState → 再レンダリング → フェッチ...）を防ぎます
  useEffect(() => {
    setDropdownAlwaysOpenState(
      dropdownAlwaysOpenParam === null
        ? DEFAULT_DROPDOWN_STATE
        : dropdownAlwaysOpenParam === "true"
    );

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

    const fetchBookmark = async () => {
      try {
        const response = await fetch(`/api/read-bookmark?fileName=${fileName}`, {
          method: "GET",
        });
        if (response.ok) {
          const data = await response.json();
          setBookmarkText(data.text);
        } else {
          console.error(response);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
    fetchBookmark();
  }, [isBookmarkUpdated, fileName, dropdownAlwaysOpenParam]);

  if (!inputText) {
    return <div className="mx-36 my-5">コンテンツを読み込み中...</div>;
  }

  return (
    <div className="mx-36 my-5">
      <Sidebar
        setDropdownAlwaysOpen={setDropdownAlwaysOpenState}
        dropdownAlwaysOpen={dropdownAlwaysOpenState}
      />
      {parseMarkdown(inputText).map((item, index) => {
        // 改行を削除して比較（複数行ヘッダー対応）
        const isBookmarked = bookmarkText && normalizeForComparison(item.head).includes(normalizeForComparison(bookmarkText));

        return (
          <CollapsibleItem
            {...(isBookmarked ? { id: "bookmark" } : {})}
            key={index}
            head={item.head}
            subItems={item.subItems}
            initialDropdownState={dropdownAlwaysOpenState}
            onSubmitSuccess={() => {
              setIsBookmarkUpdated(!isBookmarkUpdated);
            }}
          />
        );
      })}
    </div>
  );
}
