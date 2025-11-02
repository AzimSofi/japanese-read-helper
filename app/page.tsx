"use client";

import CollapsibleItem from "@/app/components/ui/CollapsibleItem";
import { parseMarkdown } from "@/lib/utils/markdownParser";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/ui/Sidebar";
import { DEFAULT_DROPDOWN_STATE } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileNameParam = searchParams.get("fileName");
  const dropdownAlwaysOpenParam = searchParams.get("dropdownAlwaysOpen");

  const [fileName, setFileName] = useState<string | null>(fileNameParam);
  const [inputText, setInputText] = useState<string>("");
  const [bookmarkText, setBookmarkText] = useState<string>("");
  const [dropdownAlwaysOpenState, setDropdownAlwaysOpenState] = useState<boolean>(DEFAULT_DROPDOWN_STATE);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState<boolean>(false);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

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

  // URL パラメータの変更を監視してローカル state を更新
  useEffect(() => {
    if (fileNameParam) {
      setFileName(fileNameParam);
    }
  }, [fileNameParam]);

  // ファイルリストを取得し、ファイルが指定されていない場合は最初のファイルにリダイレクト
  useEffect(() => {
    const fetchFileList = async () => {
      try {
        const response = await fetch('/api/list-text-files');
        if (response.ok) {
          const data = await response.json();
          setAvailableFiles(data.files);

          // ファイルが指定されていない場合、最初のファイルにリダイレクト
          if (!fileNameParam && data.files.length > 0) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('fileName', data.files[0]);
            router.replace(`/?${params.toString()}`);
          }
        }
      } catch (e) {
        console.error('ファイルリストの取得に失敗しました:', e);
      }
    };

    fetchFileList();
  }, []);

  // ブックマークを再取得する関数（onSubmitSuccessから呼び出し用）
  const refetchBookmark = async () => {
    if (!fileName) return;

    try {
      const response = await fetch(`/api/read-bookmark?fileName=${fileName}`, {
        method: "GET",
      });
      if (response.ok) {
        const data = await response.json();
        setBookmarkText(data.text);
        // プログレスバーを更新するためにトリガーをインクリメント
        setRefreshTrigger(prev => prev + 1);
      } else {
        console.error(response);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // テキストコンテンツとブックマークを取得（ファイル変更時のみ）
  useEffect(() => {
    if (!fileName) return; // ファイル名が確定するまで待つ

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

    const loadAllData = async () => {
      setIsInitialLoadComplete(false);
      await Promise.all([fetchData(), fetchBookmark()]);
      setIsInitialLoadComplete(true);
    };

    loadAllData();
  }, [fileName, dropdownAlwaysOpenParam]);

  // ファイルがない場合の表示
  if (availableFiles.length === 0 && !fileName) {
    return (
      <div className="mx-36 my-5">
        <div className="p-6 bg-[#FFF0DD] border border-[#E2A16F] rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-[#E2A16F]">テキストファイルが見つかりません</h2>
          <p className="mb-4">
            public/ ディレクトリに .txt ファイルを追加してください。
          </p>
          <p className="text-sm text-gray-600">
            ファイルを追加後、ページを更新してください。
          </p>
        </div>
      </div>
    );
  }

  // データ読み込み中の表示
  if (!inputText || !isInitialLoadComplete) {
    return <div className="mx-36 my-5">コンテンツを読み込み中...</div>;
  }

  return (
    <div className="mx-36 my-5">
      <Sidebar
        setDropdownAlwaysOpen={setDropdownAlwaysOpenState}
        dropdownAlwaysOpen={dropdownAlwaysOpenState}
        fileName={fileName}
        refreshTrigger={refreshTrigger}
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
            onSubmitSuccess={refetchBookmark}
          />
        );
      })}
    </div>
  );
}
