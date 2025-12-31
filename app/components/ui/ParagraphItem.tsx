"use client";

import React, { useState } from "react";
import BookmarkUnfilled from "@/app/components/icons/BookmarkUnfilled";
import BookmarkFilled from "@/app/components/icons/BookmarkFilled";
import BookImage from "@/app/components/ui/BookImage";
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
  imageMap?: Record<string, string>; // Map from original names to renamed files
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
  imageMap,
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

  // 画像プレースホルダーを検出
  const IMAGE_PATTERN = /\[IMAGE:([^\]]+)\]/g;
  const hasImage = IMAGE_PATTERN.test(text);

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

  // 画像を含むコンテンツをレンダリング
  const renderContentWithImages = () => {
    if (!hasImage) {
      // 画像がない場合は通常のテキストレンダリング
      return (
        <div className="paragraph-text whitespace-pre-wrap">
          {renderTextWithFurigana(text, true)}
        </div>
      );
    }

    // 画像がある場合はパーツごとにレンダリング
    const parts = parseContentWithImages(text);

    return (
      <div className="paragraph-content">
        {parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <div key={index} className="paragraph-text whitespace-pre-wrap">
                {renderTextWithFurigana(part.content, true)}
              </div>
            );
          } else {
            // 画像のパスを構築 - imageMapで実際のファイル名を検索
            const originalName = part.content;
            const actualFileName = imageMap?.[originalName] || imageMap?.[`image/${originalName}`] || originalName;
            // fileName format is like "bookv2-furigana/book-name/file-name-rephrase"
            // For rephrase files, strip the "-rephrase" suffix and the file name part
            // to get the directory path where images are stored
            const pathParts = fileName?.split('/') || [];
            const basePath = pathParts.slice(0, -1).join('/'); // Remove file name, keep directory
            const imagePath = `/${basePath}/images/${actualFileName}`;
            return (
              <BookImage
                key={index}
                fileName={actualFileName}
                imagePath={imagePath}
                altText={`Illustration from ${fileName}`}
              />
            );
          }
        })}
      </div>
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
        {renderContentWithImages()}
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
