"use client";

import React, { useEffect, useState } from "react";
import BookmarkUnfilled from "@/app/components/icons/BookmarkUnfilled";
import BookmarkFilled from "@/app/components/icons/BookmarkFilled";
import ChevronUp from "@/app/components/icons/ChevronUp";
import ChevronDown from "@/app/components/icons/ChevronDown";
import BookImage from "@/app/components/ui/BookImage";
import TTSButton from "@/app/components/ui/TTSButton";
import { useSearchParams } from "next/navigation";
import { CSS_VARS, EXPLANATION_CONFIG } from "@/lib/constants";
import { parseFurigana, segmentsToHTML } from "@/lib/utils/furiganaParser";

interface CollapsibleItemProps {
  id?: string;
  head: string;
  subItems: string[];
  initialDropdownState?: boolean;
  onSubmitSuccess: () => void;
  showFurigana?: boolean;
  /** AI解説機能の有効/無効（無効時はテキスト選択可能） */
  aiExplanationEnabled?: boolean;
  onSentenceClick?: (sentence: string) => void;
  imageMap?: Record<string, string>;
  bookDirectory?: string;
  bookFileName?: string;
  onVocabularySelect?: (data: {
    word: string;
    sentence: string;
    paragraphText: string;
  }) => void;
  /** 長押し時に連続再生を開始するコールバック */
  onStartContinuousPlay?: () => void;
}

const CollapsibleItem: React.FC<CollapsibleItemProps> = ({
  id,
  head,
  subItems,
  initialDropdownState = false,
  onSubmitSuccess,
  showFurigana = false,
  aiExplanationEnabled = true,
  onSentenceClick,
  imageMap,
  bookDirectory,
  bookFileName,
  onVocabularySelect,
  onStartContinuousPlay,
}) => {
  const searchParams = useSearchParams();
  const directoryParam = searchParams.get("directory");
  const fileNameParam = searchParams.get("fileName");
  const highlightWord = searchParams.get("highlight");

  // Construct full file path (directory/fileName) to match how page.tsx handles it
  const fileName: string = (directoryParam && fileNameParam
    ? `${directoryParam}/${fileNameParam}`
    : fileNameParam) || "text-1";

  const [isOpen, setIsOpen] = useState(initialDropdownState);
  const [loading, setLoading] = useState(false);
  const [vocabularyMode, setVocabularyMode] = useState(false);
  const [shouldHighlight, setShouldHighlight] = useState(false);

  // Listen for vocabulary mode changes
  useEffect(() => {
    const handleVocabularyModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled: boolean }>;
      setVocabularyMode(customEvent.detail.enabled);
    };

    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vocabulary_mode');
      if (stored !== null) {
        setVocabularyMode(stored === 'true');
      }
    }

    window.addEventListener('vocabularyModeChanged', handleVocabularyModeChange);
    return () => window.removeEventListener('vocabularyModeChanged', handleVocabularyModeChange);
  }, []);

  // Handle word highlighting when navigating from vocabulary page
  useEffect(() => {
    if (highlightWord && head.includes(highlightWord)) {
      setShouldHighlight(true);
      // Remove highlight after 3 seconds
      const timer = setTimeout(() => {
        setShouldHighlight(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightWord, head]);

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

  // Extract text from a Range while excluding <rt> (furigana) elements
  const extractTextWithoutRuby = (range: Range): string => {
    // Clone the selection content to avoid modifying the actual DOM
    const fragment = range.cloneContents();

    // Remove all <rt> elements (furigana) from the cloned fragment
    const rtElements = fragment.querySelectorAll('rt');
    rtElements.forEach(rt => rt.remove());

    // Now get the text content (with <rt> removed)
    return fragment.textContent || '';
  };

  // Handle text selection in vocabulary mode
  const handleTextSelection = () => {
    if (!vocabularyMode || !onVocabularySelect) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Use DOM traversal to extract text without furigana
    const cleanedText = extractTextWithoutRuby(range).trim();

    if (!cleanedText) return;

    // Call the vocabulary select handler with the cleaned word and context
    onVocabularySelect({
      word: cleanedText,
      sentence: head, // Use the full head as sentence context
      paragraphText: head, // Full paragraph for location reference
    });

    // Clear selection
    selection.removeAllRanges();
  };

  // 文を区切り文字で分割
  const splitIntoSentences = (text: string): string[] => {
    const delimiters: readonly string[] = EXPLANATION_CONFIG.SENTENCE_DELIMITERS;
    const sentences: string[] = [];
    let currentSentence = '';

    for (let i = 0; i < text.length; i++) {
      currentSentence += text[i];

      if (delimiters.includes(text[i])) {
        sentences.push(currentSentence.trim());
        currentSentence = '';
      }
    }

    if (currentSentence.trim()) {
      sentences.push(currentSentence.trim());
    }

    return sentences.filter(s => s.length > 0);
  };

  // 振り仮名付きテキストをレンダリング
  const renderTextWithFurigana = (text: string, isClickable: boolean = false) => {
    // AI解説無効時またはクリック不可の場合は単純なテキストレンダリング
    if (!isClickable || !aiExplanationEnabled) {
      const segments = parseFurigana(text);
      const html = segmentsToHTML(segments, showFurigana);
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    }

    // クリック可能な場合は文ごとに分割
    const sentences = splitIntoSentences(text);

    return (
      <>
        {sentences.map((sentence, index) => {
          const segments = parseFurigana(sentence);
          const html = segmentsToHTML(segments, showFurigana);

          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{ __html: html }}
              onClick={(e) => {
                e.stopPropagation();
                if (!vocabularyMode) onSentenceClick?.(sentence);
              }}
              className={onSentenceClick && !vocabularyMode ? "cursor-pointer hover:bg-opacity-50 transition-colors rounded px-1" : ""}
              style={
                onSentenceClick && !vocabularyMode
                  ? {
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.2s',
                    }
                  : {}
              }
              onMouseEnter={(e) => {
                if (onSentenceClick && !vocabularyMode) {
                  e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${CSS_VARS.SECONDARY} 30%, transparent)`;
                }
              }}
              onMouseLeave={(e) => {
                if (onSentenceClick && !vocabularyMode) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            />
          );
        })}
      </>
    );
  };

  // 画像プレースホルダーを検出
  const IMAGE_PATTERN = /\[IMAGE:([^\]]+)\]/g;
  const hasImage = IMAGE_PATTERN.test(head);

  // テキストと画像を分割して処理
  const parseContentWithImages = (content: string) => {
    const parts: Array<{ type: 'text' | 'image'; content: string }> = [];
    let lastIndex = 0;
    const regex = /\[IMAGE:([^\]]+)\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // 画像の前のテキスト
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push({ type: 'text', content: textBefore });
        }
      }

      // 画像プレースホルダー
      const imageName = match[1];
      parts.push({ type: 'image', content: imageName });

      lastIndex = regex.lastIndex;
    }

    // 画像の後のテキスト
    if (lastIndex < content.length) {
      const textAfter = content.substring(lastIndex);
      if (textAfter.trim()) {
        parts.push({ type: 'text', content: textAfter });
      }
    }

    return parts;
  };

  // 画像を含むコンテンツをレンダリング
  const renderHeadWithImages = () => {
    if (!hasImage) {
      // 画像がない場合は通常のテキストレンダリング
      return renderTextWithFurigana(head, true);
    }

    // 画像がある場合はパーツごとにレンダリング
    const parts = parseContentWithImages(head);

    return (
      <div className="head-content">
        {parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <div key={index} className="whitespace-pre-wrap">
                {renderTextWithFurigana(part.content, true)}
              </div>
            );
          } else {
            // 画像のパスを構築 - imageMapで実際のファイル名を検索
            const originalName = part.content;
            const actualFileName = imageMap?.[originalName] || imageMap?.[`image/${originalName}`] || originalName;
            // For nested directories (e.g., bookv2-furigana/book-name/), bookDirectory already contains the full path
            // For flat directories (e.g., bookv2-furigana/), we need to add bookFileName
            const isNestedDirectory = bookDirectory?.includes('/');
            const imagePath = isNestedDirectory
              ? `/${bookDirectory}/images/${actualFileName}`
              : `/${bookDirectory}/${bookFileName?.replace(/-rephrase$/, '')}/images/${actualFileName}`;

            return (
              <BookImage
                key={index}
                fileName={actualFileName}
                imagePath={imagePath}
                altText={`Illustration from ${bookFileName}`}
              />
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="collapsibleItem relative" id={id}>
      <div
        className="p-3 my-2 rounded-lg transition-all duration-500"
        style={
          shouldHighlight
            ? {
                backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 40%, transparent)`,
                boxShadow: '0 0 20px rgba(226, 161, 111, 0.5)',
              }
            : id === "bookmark"
            ? { backgroundColor: CSS_VARS.BASE }
            : {}
        }
        id="collapsible-item"
        ref={itemRef}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div
              className={"head-text font-bold text-lg whitespace-pre-wrap"}
              ref={headRef}
              onMouseUp={handleTextSelection}
              style={(vocabularyMode || !aiExplanationEnabled) ? { userSelect: 'text', cursor: 'text' } : {}}
            >
              {renderHeadWithImages()}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 pt-1">
            <TTSButton text={head} onLongPress={onStartContinuousPlay} />
            <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="inline-flex">
              <button
                disabled={loading}
                type="submit"
                className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                aria-label="Bookmark"
              >
                {id === "bookmark" ? <BookmarkFilled /> : <BookmarkUnfilled />}
              </button>
            </form>
            {subItems.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOpen();
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer select-none"
                aria-label={isOpen ? "Collapse" : "Expand"}
              >
                {isOpen ? <ChevronUp /> : <ChevronDown />}
              </button>
            )}
          </div>
        </div>
        {isOpen && (
          <div className="ml-4 mt-2">
            {subItems.map((subItem, index) => (
              <div key={index} className="sub-item-text my-1">
                {index === 4 ? "" : renderTextWithFurigana(subItem, false)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollapsibleItem;
