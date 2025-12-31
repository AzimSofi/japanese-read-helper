'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { READER_THEME, COLORS } from '@/lib/constants';

interface ReaderHeaderProps {
  currentPage: number;
  totalPages: number;
  bookmarkPage: number | null;
  showFurigana: boolean;
  showRephrase: boolean;
  directoryParam: string | null;
  fileNameParam: string | null;
  onPageChange: (page: number) => void;
  onToggleFurigana: () => void;
  onToggleRephrase: () => void;
  onOpenRubyLookup: () => void;
}

export default function ReaderHeader({
  currentPage,
  totalPages,
  bookmarkPage,
  showFurigana,
  showRephrase,
  directoryParam,
  fileNameParam,
  onPageChange,
  onToggleFurigana,
  onToggleRephrase,
  onOpenRubyLookup,
}: ReaderHeaderProps) {
  const router = useRouter();
  const [pageInput, setPageInput] = useState(currentPage.toString());
  const [isPageInputFocused, setIsPageInputFocused] = useState(false);

  const handleGoToPage = useCallback(() => {
    const page = parseInt(pageInput, 10);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  }, [pageInput, totalPages, currentPage, onPageChange]);

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGoToPage();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleGoToBookmark = () => {
    if (bookmarkPage && bookmarkPage >= 1 && bookmarkPage <= totalPages) {
      onPageChange(bookmarkPage);
    }
  };

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-sm border-b"
      style={{
        backgroundColor: `${READER_THEME.SURFACE}F5`,
        borderColor: COLORS.NEUTRAL,
      }}
    >
      <div className="max-w-3xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => router.push('/library')}
            className="p-2 rounded-lg transition-colors hover:bg-opacity-80 flex-shrink-0"
            style={{ color: COLORS.SECONDARY_DARK }}
            title="Back to Library"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded disabled:opacity-30 transition-opacity"
              style={{ color: COLORS.SECONDARY_DARK }}
              title="Previous page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                value={isPageInputFocused ? pageInput : currentPage.toString()}
                onChange={(e) => setPageInput(e.target.value)}
                onFocus={() => {
                  setIsPageInputFocused(true);
                  setPageInput(currentPage.toString());
                }}
                onBlur={() => {
                  setIsPageInputFocused(false);
                  handleGoToPage();
                }}
                onKeyDown={handlePageInputKeyDown}
                className="w-12 text-center text-sm py-1 px-1 rounded border focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: READER_THEME.SURFACE,
                  borderColor: COLORS.NEUTRAL,
                  color: COLORS.PRIMARY_DARK,
                }}
              />
              <span className="text-sm" style={{ color: COLORS.SECONDARY_DARK }}>
                / {totalPages}
              </span>
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded disabled:opacity-30 transition-opacity"
              style={{ color: COLORS.SECONDARY_DARK }}
              title="Next page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {bookmarkPage && bookmarkPage !== currentPage && (
              <button
                onClick={handleGoToBookmark}
                className="p-2 rounded-lg transition-colors text-sm flex items-center gap-1"
                style={{ color: COLORS.PRIMARY }}
                title={`Go to bookmark (page ${bookmarkPage})`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="hidden sm:inline">{bookmarkPage}</span>
              </button>
            )}

            <button
              onClick={onToggleFurigana}
              className="p-2 rounded-lg transition-colors text-xs font-medium"
              style={{
                backgroundColor: showFurigana ? COLORS.PRIMARY : 'transparent',
                color: showFurigana ? '#FFFFFF' : COLORS.SECONDARY_DARK,
                boxShadow: showFurigana ? `0 0 0 1px ${COLORS.PRIMARY}` : 'none',
              }}
              title={showFurigana ? 'Hide furigana' : 'Show furigana'}
            >
              ruby
            </button>

            <button
              onClick={onOpenRubyLookup}
              className="p-2 rounded-lg transition-colors text-xs font-medium"
              style={{
                backgroundColor: 'transparent',
                color: COLORS.SECONDARY_DARK,
              }}
              title="Ruby lookup"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <button
              onClick={onToggleRephrase}
              className="p-2 rounded-lg transition-colors text-xs font-medium"
              style={{
                backgroundColor: showRephrase ? COLORS.SECONDARY : 'transparent',
                color: showRephrase ? '#FFFFFF' : COLORS.SECONDARY_DARK,
                boxShadow: showRephrase ? `0 0 0 1px ${COLORS.SECONDARY}` : 'none',
              }}
              title={showRephrase ? 'Collapse rephrases' : 'Expand rephrases'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {showRephrase ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
