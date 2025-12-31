'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CSS_VARS, STORAGE_KEYS } from '@/lib/constants';
import { useRubyRegistry } from '@/app/hooks/useRubyRegistry';
import type { RubyEntry } from '@/lib/types';
import Link from 'next/link';

interface RubyLookupSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  directory: string;
  bookName: string;
}

function getStarredStorageKey(directory: string, bookName: string): string {
  return `${STORAGE_KEYS.STARRED_WORDS}_${directory}_${bookName}`;
}

export default function RubyLookupSidebar({
  isOpen,
  onClose,
  directory,
  bookName,
}: RubyLookupSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [starredWords, setStarredWords] = useState<Set<string>>(new Set());
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { registry, isLoading, searchEntries } = useRubyRegistry({
    directory,
    bookName,
    enabled: isOpen && !!directory && !!bookName,
  });

  // Load starred words from localStorage
  useEffect(() => {
    if (!directory || !bookName) return;
    const key = getStarredStorageKey(directory, bookName);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setStarredWords(new Set(JSON.parse(stored)));
      } catch {
        setStarredWords(new Set());
      }
    } else {
      setStarredWords(new Set());
    }
  }, [directory, bookName, isOpen]);

  const toggleStar = useCallback((kanji: string) => {
    setStarredWords(prev => {
      const next = new Set(prev);
      if (next.has(kanji)) {
        next.delete(kanji);
      } else {
        next.add(kanji);
      }
      // Save to localStorage
      const key = getStarredStorageKey(directory, bookName);
      localStorage.setItem(key, JSON.stringify([...next]));
      return next;
    });
  }, [directory, bookName]);

  // Filter and sort entries: starred first, then alphabetical
  const sortedEntries = useMemo(() => {
    let entries = searchQuery ? searchEntries(searchQuery) : (registry?.entries || []);

    if (showStarredOnly) {
      entries = entries.filter(e => starredWords.has(e.kanji));
    }

    return [...entries].sort((a, b) => {
      const aStarred = starredWords.has(a.kanji);
      const bStarred = starredWords.has(b.kanji);
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      return a.kanji.localeCompare(b.kanji, 'ja');
    });
  }, [registry?.entries, searchQuery, searchEntries, starredWords, showStarredOnly]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={handleBackdropClick}
      />

      {/* Sidebar */}
      <div
        className="fixed right-0 top-0 h-full w-80 z-50 shadow-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: CSS_VARS.BASE }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: CSS_VARS.NEUTRAL }}
        >
          <h2 className="font-bold text-lg">Ruby Lookup</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b" style={{ borderColor: CSS_VARS.NEUTRAL }}>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search kanji or reading..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 bg-white"
              style={{ borderColor: CSS_VARS.NEUTRAL }}
            />
            <button
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className="p-2 rounded-lg border transition-colors"
              style={{
                borderColor: CSS_VARS.NEUTRAL,
                backgroundColor: showStarredOnly ? CSS_VARS.PRIMARY : 'white',
                color: showStarredOnly ? 'white' : CSS_VARS.PRIMARY,
              }}
              title={showStarredOnly ? 'Show all' : 'Show starred only'}
            >
              <svg className="w-5 h-5" fill={showStarredOnly ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          </div>
          {starredWords.size > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              {starredWords.size} starred word{starredWords.size !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : !registry || registry.entries.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="mb-4">No entries yet</p>
              <Link
                href={`/ruby-registry?directory=${encodeURIComponent(directory)}&bookName=${encodeURIComponent(bookName)}`}
                className="text-sm underline"
                style={{ color: CSS_VARS.PRIMARY }}
              >
                Set up registry
              </Link>
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {showStarredOnly
                ? 'No starred words yet'
                : `No matches for "${searchQuery}"`}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedEntries.map((entry: RubyEntry) => {
                const isStarred = starredWords.has(entry.kanji);
                return (
                  <div
                    key={entry.kanji}
                    className="p-3 rounded-lg border bg-white"
                    style={{
                      borderColor: isStarred ? CSS_VARS.PRIMARY : CSS_VARS.NEUTRAL,
                      borderWidth: isStarred ? 2 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-xl font-medium"
                          style={{ color: CSS_VARS.PRIMARY }}
                        >
                          {entry.kanji}
                        </span>
                        <span className="text-lg">{entry.reading}</span>
                      </div>
                      <button
                        onClick={() => toggleStar(entry.kanji)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        title={isStarred ? 'Unstar' : 'Star'}
                      >
                        <svg
                          className="w-5 h-5"
                          fill={isStarred ? CSS_VARS.PRIMARY : 'none'}
                          stroke={CSS_VARS.PRIMARY}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                    </div>
                    {entry.note && (
                      <p className="text-sm text-gray-500 mt-1">{entry.note}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t text-center"
          style={{ borderColor: CSS_VARS.NEUTRAL }}
        >
          <Link
            href={`/ruby-registry?directory=${encodeURIComponent(directory)}&bookName=${encodeURIComponent(bookName)}`}
            className="text-sm underline"
            style={{ color: CSS_VARS.PRIMARY }}
          >
            Edit Registry
          </Link>
          <span className="mx-2 text-gray-400">|</span>
          <span className="text-xs text-gray-500">
            Esc to close | Ctrl+K to toggle
          </span>
        </div>
      </div>
    </>
  );
}
