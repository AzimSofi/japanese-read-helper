'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CSS_VARS } from '@/lib/constants';
import { useRubyRegistry } from '@/app/hooks/useRubyRegistry';
import type { RubyEntry } from '@/lib/types';
import Link from 'next/link';

interface RubyLookupSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  directory: string;
  bookName: string;
}

export default function RubyLookupSidebar({
  isOpen,
  onClose,
  directory,
  bookName,
}: RubyLookupSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { registry, isLoading, searchEntries } = useRubyRegistry({
    directory,
    bookName,
    enabled: isOpen && !!directory && !!bookName,
  });

  const filteredEntries = searchQuery ? searchEntries(searchQuery) : (registry?.entries || []);

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
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search kanji or reading..."
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 bg-white"
            style={{ borderColor: CSS_VARS.NEUTRAL }}
          />
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
          ) : filteredEntries.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No matches for &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry: RubyEntry) => (
                <div
                  key={entry.kanji}
                  className="p-3 rounded-lg border bg-white"
                  style={{ borderColor: CSS_VARS.NEUTRAL }}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-xl font-medium"
                      style={{ color: CSS_VARS.PRIMARY }}
                    >
                      {entry.kanji}
                    </span>
                    <span className="text-lg">{entry.reading}</span>
                  </div>
                  {entry.note && (
                    <p className="text-sm text-gray-500 mt-1">{entry.note}</p>
                  )}
                </div>
              ))}
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
            Press Escape to close
          </span>
        </div>
      </div>
    </>
  );
}
