"use client";

import CollapsibleItem from "@/app/components/ui/CollapsibleItem";
import { parseMarkdown } from "@/lib/utils/markdownParser";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/ui/Sidebar";
import ExplanationSidebar from "@/app/components/ui/ExplanationSidebar";
import Pagination from "@/app/components/ui/Pagination";
import { DEFAULT_DROPDOWN_STATE, CSS_VARS, STORAGE_KEYS, EXPLANATION_CONFIG, PAGINATION_CONFIG } from "@/lib/constants";
import { stripFurigana } from "@/lib/utils/furiganaParser";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const directoryParam = searchParams.get("directory");
  const fileNameParam = searchParams.get("fileName");
  const dropdownAlwaysOpenParam = searchParams.get("dropdownAlwaysOpen");

  // フルパス: "directory/fileName" 形式（APIに渡す際に使用）
  const fullFilePath = directoryParam && fileNameParam
    ? `${directoryParam}/${fileNameParam}`
    : fileNameParam;

  const [fileName, setFileName] = useState<string | null>(fullFilePath);
  const [inputText, setInputText] = useState<string>("");
  const [bookmarkText, setBookmarkText] = useState<string>("");
  const [dropdownAlwaysOpenState, setDropdownAlwaysOpenState] = useState<boolean>(DEFAULT_DROPDOWN_STATE);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState<boolean>(false);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // 振り仮名表示状態
  const [showFurigana, setShowFurigana] = useState<boolean>(false);

  // 説明サイドバー状態
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [selectedSentence, setSelectedSentence] = useState<string>("");
  const [sentenceContext, setSentenceContext] = useState<string>("");

  // ページネーション状態
  const pageParam = searchParams.get("page");
  const [currentPage, setCurrentPage] = useState<number>(pageParam ? parseInt(pageParam, 10) : 1);

  // ブックマーク自動ナビゲーション追跡用ref
  const hasAutoNavigatedRef = useRef<boolean>(false);

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

  // localStorageから振り仮名表示設定を読み込み & カスタムイベントを監視
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.FURIGANA_ENABLED);
      if (stored !== null) {
        setShowFurigana(stored === 'true');
      }

      // TopNavigationからのカスタムイベントを監視
      const handleFuriganaChange = (event: Event) => {
        const customEvent = event as CustomEvent<{ enabled: boolean }>;
        setShowFurigana(customEvent.detail.enabled);
      };

      window.addEventListener('furiganaChanged', handleFuriganaChange);

      return () => {
        window.removeEventListener('furiganaChanged', handleFuriganaChange);
      };
    }
  }, []);

  // URL パラメータの変更を監視してローカル state を更新
  useEffect(() => {
    if (fullFilePath) {
      setFileName(fullFilePath);
      // ファイルが変更されたら、ページを1にリセット
      setCurrentPage(1);
      // ブックマーク自動ナビゲーションフラグをリセット
      hasAutoNavigatedRef.current = false;
    }
  }, [fullFilePath]);

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

  // パースされたデータと文のリストをメモ化（大きいファイルの場合のパフォーマンス改善）
  const parsedData = useMemo(() => {
    if (!inputText) return { items: [], sentences: [], totalPages: 0, paginatedItems: [] };

    const items = parseMarkdown(inputText);
    const allHeads = items.map(item => stripFurigana(item.head)).join('\n');
    const sentences = allHeads.split(/[。！？]/g).filter(s => s.trim().length > 0);

    // ページネーション計算
    const totalPages = Math.ceil(items.length / PAGINATION_CONFIG.ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * PAGINATION_CONFIG.ITEMS_PER_PAGE;
    const endIndex = startIndex + PAGINATION_CONFIG.ITEMS_PER_PAGE;
    const paginatedItems = items.slice(startIndex, endIndex);

    return { items, sentences, totalPages, paginatedItems };
  }, [inputText, currentPage]);

  // ページネーション：ページ変更ハンドラー
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.replace(`/?${params.toString()}`, { scroll: false });
    // ページトップにスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, router]);

  // URL パラメータのページ番号の変更を監視
  useEffect(() => {
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    }
  }, [pageParam]);

  // ブックマークへ移動（サイドバーからの呼び出し用）
  const navigateToBookmark = useCallback(() => {
    if (!bookmarkText || !inputText) return;

    // Parse items to find bookmark
    const items = parseMarkdown(inputText);
    const bookmarkIndex = items.findIndex(item =>
      normalizeForComparison(item.head).includes(normalizeForComparison(bookmarkText))
    );

    if (bookmarkIndex !== -1) {
      const bookmarkPage = Math.floor(bookmarkIndex / PAGINATION_CONFIG.ITEMS_PER_PAGE) + 1;

      // Navigate to the page containing the bookmark
      handlePageChange(bookmarkPage);

      // Wait for page to render, then scroll to bookmark
      setTimeout(() => {
        const el = document.getElementById("bookmark");
        if (el) {
          const offset = -window.innerHeight / 5 + el.offsetHeight / 5;
          const top = el.getBoundingClientRect().top + window.scrollY + offset;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }, 300); // Wait 300ms for page render
    }
  }, [bookmarkText, inputText, handlePageChange]);

  // 文がクリックされたときの処理
  const handleSentenceClick = (sentence: string) => {
    const { sentences } = parsedData;

    // クリックされた文のインデックスを見つける（振り仮名を除去して比較）
    const cleanSentence = stripFurigana(sentence).trim();
    const sentenceIndex = sentences.findIndex(s => s.trim().includes(cleanSentence) || cleanSentence.includes(s.trim()));

    if (sentenceIndex === -1) {
      console.warn('文が見つかりませんでした:', sentence);
      setSentenceContext('');
    } else {
      // コンテキストサイズをlocalStorageから取得（なければデフォルト値）
      let contextSize: number = EXPLANATION_CONFIG.DEFAULT_CONTEXT_SIZE;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEYS.EXPLANATION_CONTEXT_SIZE);
        if (stored) {
          contextSize = parseInt(stored, 10);
        }
      }

      // 前後N文を抽出
      const startIndex = Math.max(0, sentenceIndex - contextSize);
      const endIndex = Math.min(sentences.length, sentenceIndex + contextSize + 1);
      const contextSentences = sentences.slice(startIndex, endIndex);

      setSentenceContext(contextSentences.join('。'));
    }

    setSelectedSentence(sentence);
    setIsSidebarOpen(true);
  };

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

  // ブックマークがある場合、そのページに自動的に移動（初回ロード時のみ）
  useEffect(() => {
    if (!bookmarkText || !isInitialLoadComplete || !inputText) return;
    if (hasAutoNavigatedRef.current) return; // 既に自動ナビゲーション済みならスキップ

    // Parse items to find bookmark (avoid using parsedData to prevent circular dependency)
    const items = parseMarkdown(inputText);
    const bookmarkIndex = items.findIndex(item =>
      normalizeForComparison(item.head).includes(normalizeForComparison(bookmarkText))
    );

    if (bookmarkIndex !== -1) {
      const bookmarkPage = Math.floor(bookmarkIndex / PAGINATION_CONFIG.ITEMS_PER_PAGE) + 1;

      // URLパラメータにページ番号がない、または異なる場合のみ更新
      if (!pageParam || parseInt(pageParam, 10) !== bookmarkPage) {
        handlePageChange(bookmarkPage);
        hasAutoNavigatedRef.current = true; // 自動ナビゲーション完了をマーク
      }
    }
  }, [bookmarkText, isInitialLoadComplete, inputText, handlePageChange]);

  // ファイルがない場合の表示
  if (availableFiles.length === 0 && !fileName) {
    return (
      <div className="mx-2 md:mx-12 lg:mx-36 my-5 pb-24 md:pb-5">
        <div
          className="p-6 border rounded-lg"
          style={{
            backgroundColor: CSS_VARS.BASE,
            borderColor: CSS_VARS.PRIMARY,
          }}
        >
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: CSS_VARS.PRIMARY }}
          >
            テキストファイルが見つかりません
          </h2>
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
    return <div className="mx-2 md:mx-12 lg:mx-36 my-5 pb-24 md:pb-5">コンテンツを読み込み中...</div>;
  }

  return (
    <div className="mx-2 md:mx-12 lg:mx-36 my-5 pb-24 md:pb-5">
      <Sidebar
        setDropdownAlwaysOpen={setDropdownAlwaysOpenState}
        dropdownAlwaysOpen={dropdownAlwaysOpenState}
        fileName={fileName}
        refreshTrigger={refreshTrigger}
        onNavigateToBookmark={navigateToBookmark}
      />

      <ExplanationSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sentence={selectedSentence}
        context={sentenceContext}
        fileName={fileName || ''}
        showFurigana={showFurigana}
      />

      {/* 上部のページネーションコントロール */}
      <Pagination
        currentPage={currentPage}
        totalPages={parsedData.totalPages}
        onPageChange={handlePageChange}
        maxButtons={PAGINATION_CONFIG.MAX_PAGE_BUTTONS}
      />

      {parsedData.paginatedItems.map((item, index) => {
        // 改行を削除して比較（複数行ヘッダー対応）
        const isBookmarked = bookmarkText && normalizeForComparison(item.head).includes(normalizeForComparison(bookmarkText));

        return (
          <CollapsibleItem
            {...(isBookmarked ? { id: "bookmark" } : {})}
            key={(currentPage - 1) * PAGINATION_CONFIG.ITEMS_PER_PAGE + index}
            head={item.head}
            subItems={item.subItems}
            initialDropdownState={dropdownAlwaysOpenState}
            onSubmitSuccess={refetchBookmark}
            showFurigana={showFurigana}
            onSentenceClick={handleSentenceClick}
          />
        );
      })}

      {/* 下部のページネーションコントロール */}
      <Pagination
        currentPage={currentPage}
        totalPages={parsedData.totalPages}
        onPageChange={handlePageChange}
        maxButtons={PAGINATION_CONFIG.MAX_PAGE_BUTTONS}
      />
    </div>
  );
}
