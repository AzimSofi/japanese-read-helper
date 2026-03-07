'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DARK_COLORS } from '@/lib/constants';

interface ReaderHeaderProps {
  currentPage: number;
  totalPages: number;
  bookmarkPage: number | null;
  isDarkMode: boolean;
  directoryParam: string | null;
  fileNameParam: string | null;
  onPageChange: (page: number) => void;
}

export default function ReaderHeader({
  currentPage,
  totalPages,
  bookmarkPage,
  isDarkMode,
  directoryParam,
  fileNameParam,
  onPageChange,
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

  const theme = isDarkMode
    ? { surface: 'rgba(28,28,30,0.85)', border: 'rgba(255,255,255,0.06)', text: DARK_COLORS.TEXT, textMuted: '#8E8E93', inputBg: DARK_COLORS.SECONDARY }
    : { surface: 'rgba(255,255,255,0.85)', border: 'rgba(0,0,0,0.06)', text: '#1D1D1F', textMuted: '#8E8E93', inputBg: '#F2F2F7' };

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl border-b transition-colors duration-300"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
        height: '48px',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 h-full">
        <div className="flex items-center justify-between h-full">
          <button
            onClick={() => router.push('/library')}
            className="flex items-center gap-1 transition-all duration-200 hover:opacity-70 flex-shrink-0"
            style={{ color: '#007AFF' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">Library</span>
          </button>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg disabled:opacity-30 transition-all duration-200 hover:bg-black/5"
              style={{ color: theme.textMuted }}
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
                className="w-10 text-center text-sm font-medium py-1 rounded-lg border-none focus:outline-none focus:ring-2 bg-transparent"
                style={{
                  color: theme.text,
                  ...(isPageInputFocused ? { backgroundColor: theme.inputBg, boxShadow: '0 0 0 3px rgba(0,122,255,0.3)' } : {}),
                }}
              />
              <span className="text-sm" style={{ color: theme.textMuted }}>
                / {totalPages}
              </span>
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg disabled:opacity-30 transition-all duration-200 hover:bg-black/5"
              style={{ color: theme.textMuted }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex-shrink-0" style={{ minWidth: '48px' }}>
            {bookmarkPage && bookmarkPage !== currentPage && (
              <button
                onClick={() => onPageChange(bookmarkPage)}
                className="text-sm font-medium transition-all duration-200 hover:opacity-70"
                style={{ color: '#007AFF' }}
                title={`Go to bookmark (page ${bookmarkPage})`}
              >
                p.{bookmarkPage}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
