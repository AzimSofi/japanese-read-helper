"use client";

import React, { useState } from "react";
import BookmarkUnfilled from "@/app/components/icons/BookmarkUnfilled";
import BookmarkFilled from "@/app/components/icons/BookmarkFilled";
import { CSS_VARS, EXPLANATION_CONFIG } from "@/lib/constants";
import { parseFurigana, segmentsToHTML } from "@/lib/utils/furiganaParser";

interface ParagraphItemProps {
  id?: string;
  text: string;
  isBookmarked: boolean;
  fileName: string;
  showFurigana: boolean;
  onBookmarkSuccess: () => void;
  onSentenceClick?: (sentence: string) => void;
  fontSize: number;
  lineHeight: number;
}

const ParagraphItem: React.FC<ParagraphItemProps> = ({
  id,
  text,
  isBookmarked,
  fileName,
  showFurigana,
  onBookmarkSuccess,
  onSentenceClick,
  fontSize,
  lineHeight,
}) => {
  const [loading, setLoading] = useState(false);

  const handleBookmarkClick = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch("/api/write-bookmark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target: fileName, content: text }),
      });
      if (!response.ok) {
        throw new Error("失敗");
      }
      onBookmarkSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
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
    if (!isClickable || !onSentenceClick) {
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
              onClick={() => onSentenceClick(sentence)}
              className="cursor-pointer transition-colors rounded px-1"
              style={{
                backgroundColor: 'transparent',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${CSS_VARS.SECONDARY} 30%, transparent)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            />
          );
        })}
      </>
    );
  };

  return (
    <div className="flex paragraph-item relative" id={id}>
      <div
        className="p-4 my-2 w-full rounded-lg border"
        style={{
          backgroundColor: isBookmarked ? CSS_VARS.BASE : 'transparent',
          borderColor: isBookmarked ? CSS_VARS.PRIMARY : CSS_VARS.NEUTRAL,
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
        }}
      >
        <div className="paragraph-text whitespace-pre-wrap">
          {renderTextWithFurigana(text, true)}
        </div>
      </div>

      <form onSubmit={handleBookmarkClick}>
        <button
          disabled={loading}
          type="submit"
          style={{
            position: "absolute",
            marginLeft: '0.5rem',
            marginTop: '0.8rem',
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer"
          }}
          className={isBookmarked ? 'cursor-pointer' : ''}
          aria-label="Bookmark"
        >
          {isBookmarked ? <BookmarkFilled /> : <BookmarkUnfilled />}
        </button>
      </form>
    </div>
  );
};

export default ParagraphItem;
