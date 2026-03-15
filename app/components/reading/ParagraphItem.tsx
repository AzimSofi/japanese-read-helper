"use client";

import React, { useState } from "react";
import BookmarkUnfilled from "@/app/components/icons/BookmarkUnfilled";
import BookmarkFilled from "@/app/components/icons/BookmarkFilled";
import TranslateIcon from "@/app/components/icons/TranslateIcon";
import BookImage from "@/app/components/reading/BookImage";
import { EXPLANATION_CONFIG } from "@/lib/constants";
import { parseFurigana, segmentsToHTML } from "@/lib/utils/furiganaParser";

const IMAGE_PATTERN = /\[IMAGE:([^\]]+)\]/;

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
  imageMap?: Record<string, string>;
  currentPage?: number;
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
  currentPage,
}) => {
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const handleBookmarkClick = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch("/api/write-bookmark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target: fileName, content: text, page: currentPage }),
      });
      if (!response.ok) {
        throw new Error("Failed");
      }
      onBookmarkSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslateClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    if (translatedText) {
      setShowTranslation(true);
      return;
    }

    try {
      setTranslating(true);
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Translation failed");
      }

      const data = await response.json();
      setTranslatedText(data.translatedText);
      setShowTranslation(true);
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setTranslating(false);
    }
  };

  const hasImage = IMAGE_PATTERN.test(text);

  const parseContentWithImages = (content: string) => {
    const parts: Array<{ type: "text" | "image"; content: string }> = [];
    let lastIndex = 0;
    const regex = /\[IMAGE:([^\]]+)\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push({ type: "text", content: textBefore });
        }
      }

      const imageName = match[1];
      parts.push({ type: "image", content: imageName });

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      const textAfter = content.substring(lastIndex);
      if (textAfter.trim()) {
        parts.push({ type: "text", content: textAfter });
      }
    }

    return parts;
  };

  const splitIntoSentences = (sentenceText: string): string[] => {
    const delimiters: readonly string[] = EXPLANATION_CONFIG.SENTENCE_DELIMITERS;
    const sentences: string[] = [];
    let currentSentence = "";

    for (let i = 0; i < sentenceText.length; i++) {
      currentSentence += sentenceText[i];

      if (delimiters.includes(sentenceText[i])) {
        sentences.push(currentSentence.trim());
        currentSentence = "";
      }
    }

    if (currentSentence.trim()) {
      sentences.push(currentSentence.trim());
    }

    return sentences.filter((s) => s.length > 0);
  };

  const handleTripleClickSelect = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.detail >= 3) {
      e.stopPropagation();
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(e.currentTarget);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  const renderTextWithFurigana = (
    renderText: string,
    isClickable: boolean = false
  ) => {
    if (!isClickable || !onSentenceClick) {
      const segments = parseFurigana(renderText);
      const html = segmentsToHTML(segments, showFurigana);
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    }

    const sentences = splitIntoSentences(renderText);

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
                onSentenceClick(sentence);
              }}
              className="cursor-pointer transition-colors rounded-md px-1"
              style={{
                backgroundColor: "transparent",
                transition: "background-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(0, 122, 255, 0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            />
          );
        })}
      </>
    );
  };

  const renderContentWithImages = () => {
    if (showTranslation && translatedText) {
      return (
        <div
          className="paragraph-text whitespace-pre-wrap"
          style={{ color: "#636366" }}
        >
          {translatedText}
        </div>
      );
    }

    if (!hasImage) {
      return (
        <div
          className="paragraph-text whitespace-pre-wrap"
          onClickCapture={handleTripleClickSelect}
        >
          {renderTextWithFurigana(text, true)}
        </div>
      );
    }

    const parts = parseContentWithImages(text);

    return (
      <div className="paragraph-content">
        {parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <div
                key={index}
                className="paragraph-text whitespace-pre-wrap"
                onClickCapture={handleTripleClickSelect}
              >
                {renderTextWithFurigana(part.content, true)}
              </div>
            );
          } else {
            const originalName = part.content;
            const actualFileName =
              imageMap?.[originalName] ||
              imageMap?.[`image/${originalName}`] ||
              originalName;
            const pathParts = fileName?.split("/") || [];
            const basePath = pathParts.slice(0, -1).join("/");
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

  const buttonBaseStyle: React.CSSProperties = {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    border: "none",
    background: "none",
    cursor: "pointer",
    transition: "transform 0.15s ease, background-color 0.15s ease",
  };

  return (
    <div className="paragraph-item relative" id={id} style={isBookmarked ? { scrollMarginTop: '80px' } : undefined}>
      <div
        className="p-5 my-3 rounded-xl"
        style={{
          backgroundColor: isBookmarked
            ? "rgba(0, 122, 255, 0.03)"
            : "transparent",
          borderLeft: isBookmarked ? "4px solid #007AFF" : "none",
          border: isBookmarked ? undefined : "1px solid rgba(0, 0, 0, 0.04)",
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
        }}
      >
        {renderContentWithImages()}
      </div>

      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "8px",
          display: "flex",
          flexDirection: "row",
          gap: "2px",
        }}
      >
        <button
          disabled={translating}
          onClick={handleTranslateClick}
          style={{
            ...buttonBaseStyle,
            opacity: translating ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.9)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
          aria-label="Translate"
        >
          <TranslateIcon isActive={showTranslation} />
        </button>
        <form
          onSubmit={handleBookmarkClick}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            disabled={loading}
            type="submit"
            style={buttonBaseStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.9)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            aria-label="Bookmark"
          >
            {isBookmarked ? <BookmarkFilled /> : <BookmarkUnfilled />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ParagraphItem;
