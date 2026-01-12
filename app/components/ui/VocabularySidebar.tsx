'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CSS_VARS } from '@/lib/constants';
import type { VocabularyEntry } from '@/lib/types';

interface VocabularySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToWord?: (entry: VocabularyEntry) => void;
}

export default function VocabularySidebar({
  isOpen,
  onClose,
  onNavigateToWord,
}: VocabularySidebarProps) {
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch today's vocabulary entries
  useEffect(() => {
    if (isOpen) {
      fetchTodaysEntries();
    }
  }, [isOpen]);

  const fetchTodaysEntries = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/vocabulary?today=true');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch vocabulary');
      }

      setEntries(data.entries || []);
    } catch (err) {
      console.error('Error fetching vocabulary:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vocabulary');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-96 max-w-[90vw] shadow-2xl transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ backgroundColor: CSS_VARS.BASE }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: CSS_VARS.NEUTRAL }}
        >
          <div>
            <h2 className="text-xl font-bold">今日の単語</h2>
            <p className="text-sm text-gray-600 mt-1">
              {entries.length}個の単語を保存しました
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="閉じる"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-5rem)] p-4">
          {loading && (
            <div className="text-center py-8 text-gray-500">
              読み込み中...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>今日はまだ単語を保存していません</p>
              <p className="text-sm mt-2">
                単語帳モードをONにして、<br />
                テキストを選択してください
              </p>
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                  style={{
                    borderColor: CSS_VARS.NEUTRAL,
                    backgroundColor: 'white',
                  }}
                  onClick={() => onNavigateToWord?.(entry)}
                >
                  {/* Word and Reading */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span
                        className="text-lg font-bold"
                        style={{ color: CSS_VARS.PRIMARY }}
                      >
                        {entry.word}
                      </span>
                      {entry.reading && (
                        <span className="text-sm text-gray-600 ml-2">
                          ({entry.reading})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(entry.createdAt)}
                    </span>
                  </div>

                  {/* Sentence context */}
                  <div className="text-sm text-gray-700 line-clamp-2 mb-2">
                    {entry.sentence}
                  </div>

                  {/* File info */}
                  <div className="text-xs text-gray-500">
                    {entry.directory}/{entry.fileName}
                  </div>

                  {/* Notes */}
                  {entry.notes && (
                    <div
                      className="text-sm mt-2 p-2 rounded"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${CSS_VARS.SECONDARY} 10%, white)`,
                      }}
                    >
                      {entry.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 border-t"
          style={{
            backgroundColor: CSS_VARS.BASE,
            borderColor: CSS_VARS.NEUTRAL,
          }}
        >
          <Link
            href="/vocabulary"
            className="block w-full py-3 px-4 rounded-lg text-center font-medium transition-all hover:shadow-md"
            style={{
              backgroundColor: CSS_VARS.PRIMARY,
              color: 'white',
            }}
          >
            すべての単語を見る →
          </Link>
        </div>
      </div>
    </>
  );
}
