'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';
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
      const key = getStarredStorageKey(directory, bookName);
      localStorage.setItem(key, JSON.stringify([...next]));
      window.dispatchEvent(new CustomEvent('starredWordsChanged'));
      return next;
    });
  }, [directory, bookName]);

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
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        onClick={handleBackdropClick}
      />

      <div
        className="fixed right-0 top-0 h-full w-[360px] max-w-[calc(100vw-16px)] z-50 overflow-hidden flex flex-col rounded-l-2xl"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.1)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-semibold text-lg" style={{ color: '#1D1D1F' }}>
            Word Lookup
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full interactive-close"
            style={{ backgroundColor: '#F2F2F7', color: '#8E8E93' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="flex gap-2">
            <div
              className="flex-1 flex items-center gap-2 rounded-xl px-4 py-2.5"
              style={{ backgroundColor: '#F2F2F7' }}
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#8E8E93"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search kanji or reading..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: '#1D1D1F' }}
              />
            </div>
            <button
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className="w-11 h-11 flex items-center justify-center rounded-xl interactive-pill"
              style={{
                backgroundColor: showStarredOnly ? '#007AFF' : '#F2F2F7',
                color: showStarredOnly ? '#FFFFFF' : '#8E8E93',
              }}
              title={showStarredOnly ? 'Show all' : 'Show starred only'}
            >
              <svg className="w-5 h-5" fill={showStarredOnly ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          </div>
          {starredWords.size > 0 && (
            <div className="mt-2 text-xs" style={{ color: '#8E8E93' }}>
              {starredWords.size} starred word{starredWords.size !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div
                className="animate-spin rounded-full h-7 w-7 border-2 border-transparent"
                style={{ borderTopColor: '#007AFF', borderRightColor: '#007AFF' }}
              />
              <span className="mt-3 text-sm" style={{ color: '#8E8E93' }}>Loading...</span>
            </div>
          ) : !registry || registry.entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="mb-4 text-sm" style={{ color: '#8E8E93' }}>No entries yet</p>
              <Link
                href={`/ruby-registry?directory=${encodeURIComponent(directory)}&bookName=${encodeURIComponent(bookName)}`}
                className="text-sm font-medium interactive-link"
                style={{ color: '#007AFF' }}
              >
                Set up registry
              </Link>
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: '#8E8E93' }}>
                {showStarredOnly
                  ? 'No starred words yet'
                  : `No matches for "${searchQuery}"`}
              </p>
            </div>
          ) : (
            <div>
              {sortedEntries.map((entry: RubyEntry, index: number) => {
                const isStarred = starredWords.has(entry.kanji);
                return (
                  <div
                    key={entry.kanji}
                    className="flex items-center justify-between py-3"
                    style={{
                      borderBottom: index < sortedEntries.length - 1 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none',
                    }}
                  >
                    <div className="flex items-baseline gap-3 min-w-0">
                      <span className="text-xl font-semibold" style={{ color: '#1D1D1F' }}>
                        {entry.kanji}
                      </span>
                      <span className="text-lg" style={{ color: '#636366' }}>
                        {entry.reading}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {entry.note && (
                        <span className="text-sm truncate max-w-[100px]" style={{ color: '#8E8E93' }}>
                          {entry.note}
                        </span>
                      )}
                      <button
                        onClick={() => toggleStar(entry.kanji)}
                        className="p-1 interactive-star"
                        title={isStarred ? 'Unstar' : 'Star'}
                      >
                        <svg
                          className="w-5 h-5"
                          fill={isStarred ? '#007AFF' : 'none'}
                          stroke={isStarred ? '#007AFF' : '#D1D1D6'}
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}
        >
          <Link
            href={`/ruby-registry?directory=${encodeURIComponent(directory)}&bookName=${encodeURIComponent(bookName)}`}
            className="text-sm font-medium interactive-link"
            style={{ color: '#007AFF' }}
          >
            Edit Registry
          </Link>
          <span className="text-xs" style={{ color: '#8E8E93' }}>
            Esc to close
          </span>
        </div>
      </div>
    </>
  );
}
