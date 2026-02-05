'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { parseMarkdown } from '@/lib/utils/markdownParser';
import { READER_CONFIG, READER_THEME, COLORS, DARK_COLORS } from '@/lib/constants';
import { stripFurigana } from '@/lib/utils/furiganaParser';

const CollapsibleItem = dynamic(
  () => import('@/app/components/ui/CollapsibleItem'),
  { ssr: false }
);

const ParagraphItem = dynamic(
  () => import('@/app/components/ui/ParagraphItem'),
  { ssr: false }
);

type ContentType = 'rephrase' | 'furigana' | 'plain';

interface ReadingContentProps {
  content: string;
  fileName: string;
  directory: string;
  bookmarkText: string;
  showFurigana: boolean;
  fontSize: number;
  lineHeight: number;
  displayMode: 'collapsed' | 'expanded';
  aiExplanationEnabled: boolean;
  currentPage: number;
  itemsPerPage: number;
  isDarkMode: boolean;
  onBookmarkSuccess: () => void;
  onSentenceClick?: (sentence: string) => void;
  imageMap?: Record<string, string>;
}

function detectContentType(text: string): ContentType {
  if (text.includes('>>') && (text.includes('<') || text.includes('\u003c'))) {
    return 'rephrase';
  }
  if (/<ruby>/.test(text) || /[^\[\]]+\[[^\[\]]+\]/.test(text)) {
    return 'furigana';
  }
  return 'plain';
}

function normalizeForComparison(text: string): string {
  const stripped = stripFurigana(text);
  return stripped.replace(/[\r\n]/g, '').trim();
}

export default function ReadingContent({
  content,
  fileName,
  directory,
  bookmarkText,
  showFurigana,
  fontSize,
  lineHeight,
  displayMode,
  aiExplanationEnabled,
  currentPage,
  itemsPerPage,
  isDarkMode,
  onBookmarkSuccess,
  onSentenceClick,
  imageMap,
}: ReadingContentProps) {
  const contentType = useMemo(() => detectContentType(content), [content]);

  const fullFilePath = directory ? `${directory}/${fileName}` : fileName;

  const parsedItems = useMemo(() => {
    if (contentType === 'rephrase') {
      return parseMarkdown(content);
    }
    return content
      .split(READER_CONFIG.PARAGRAPH_SPLIT_PATTERN)
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(p => ({ text: p }));
  }, [content, contentType]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return parsedItems.slice(start, end);
  }, [parsedItems, currentPage, itemsPerPage]);

  if (parsedItems.length === 0) {
    return (
      <div
        className="p-8 text-center rounded-xl"
        style={{ backgroundColor: READER_THEME.SURFACE }}
      >
        <p style={{ color: COLORS.SECONDARY_DARK }}>No content to display</p>
      </div>
    );
  }

  if (contentType === 'rephrase') {
    return (
      <div className="space-y-2">
        {paginatedItems.map((item, index) => {
          const typedItem = item as { head: string; subItems: string[] };
          const normalizedHead = normalizeForComparison(typedItem.head);
          const normalizedBookmark = normalizeForComparison(bookmarkText);
          const isBookmarked = !!(
            bookmarkText && normalizedHead === normalizedBookmark
          );

          return (
            <CollapsibleItem
              key={`${currentPage}-${index}`}
              {...(isBookmarked ? { id: 'bookmark' } : {})}
              head={typedItem.head}
              subItems={typedItem.subItems}
              initialDropdownState={displayMode === 'expanded'}
              showFurigana={showFurigana}
              aiExplanationEnabled={aiExplanationEnabled}
              isDarkMode={isDarkMode}
              onSubmitSuccess={onBookmarkSuccess}
              onSentenceClick={onSentenceClick}
              imageMap={imageMap}
              bookDirectory={directory}
              bookFileName={fileName}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paginatedItems.map((item, index) => {
        const typedItem = item as { text: string };
        const normalizedText = normalizeForComparison(typedItem.text);
        const normalizedBookmark = normalizeForComparison(bookmarkText);
        const isBookmarked = !!(
          bookmarkText && normalizedText === normalizedBookmark
        );

        return (
          <ParagraphItem
            key={`${currentPage}-${index}`}
            {...(isBookmarked ? { id: 'bookmark' } : {})}
            text={typedItem.text}
            isBookmarked={isBookmarked}
            fileName={fullFilePath}
            showFurigana={showFurigana}
            onBookmarkSuccess={onBookmarkSuccess}
            onSentenceClick={onSentenceClick}
            fontSize={fontSize}
            lineHeight={lineHeight}
            imageMap={imageMap}
          />
        );
      })}
    </div>
  );
}
