'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CSS_VARS, STORAGE_KEYS } from '@/lib/constants';
import { parseFurigana, segmentsToHTML } from '@/lib/utils/furiganaParser';
import type { VocabularyEntry } from '@/lib/types';

export default function VocabularyPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<VocabularyEntry | null>(null);
  const [showFurigana, setShowFurigana] = useState(true);

  // Load furigana preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.FURIGANA_ENABLED);
      if (stored !== null) {
        setShowFurigana(stored === 'true');
      }
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/vocabulary');
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

  const deleteEntry = async (id: string) => {
    if (!confirm('この単語を削除しますか？')) return;

    try {
      const response = await fetch(`/api/vocabulary/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete entry');
      }

      // Remove from list
      setEntries(entries.filter((e) => e.id !== id));
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
      alert('削除に失敗しました');
    }
  };

  const navigateToSource = (entry: VocabularyEntry) => {
    // Navigate to the book with the word highlighted
    const params = new URLSearchParams({
      directory: entry.directory,
      fileName: entry.fileName,
      highlight: entry.word,
    });
    router.push(`/?${params.toString()}`);
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render text with furigana support
  const renderTextWithFurigana = (text: string) => {
    const segments = parseFurigana(text);
    const html = segmentsToHTML(segments, showFurigana);
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Filter entries by search query
  const filteredEntries = entries.filter((entry) =>
    entry.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.sentence.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.reading && entry.reading.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (entry.notes && entry.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen pt-24 pb-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📝 単語帳</h1>
          <p className="text-gray-600">
            保存した単語: {entries.length}個
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="単語、文、メモで検索..."
            className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 bg-white"
            style={{
              borderColor: CSS_VARS.NEUTRAL,
              '--tw-ring-color': CSS_VARS.PRIMARY,
            } as React.CSSProperties}
          />
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="text-center py-12 text-gray-500">
            読み込み中...
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 mb-4">
              まだ単語を保存していません
            </p>
            <p className="text-gray-500 mb-6">
              単語帳モードをONにして、テキストを選択してください
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-lg font-medium shadow-sm transition-all hover:shadow-md"
              style={{
                backgroundColor: CSS_VARS.PRIMARY,
                color: 'white',
              }}
            >
              読書ページへ
            </Link>
          </div>
        )}

        {/* Vocabulary List */}
        {!loading && !error && filteredEntries.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-lg border hover:shadow-lg transition-all cursor-pointer"
                style={{
                  borderColor: CSS_VARS.NEUTRAL,
                  backgroundColor: 'white',
                }}
                onClick={() => setSelectedEntry(entry)}
              >
                {/* Word and Reading */}
                <div className="mb-3">
                  <h3
                    className="text-xl font-bold"
                    style={{ color: CSS_VARS.PRIMARY }}
                  >
                    {renderTextWithFurigana(entry.word)}
                  </h3>
                  {entry.reading && (
                    <p className="text-sm text-gray-600">
                      {entry.reading}
                    </p>
                  )}
                </div>

                {/* Sentence */}
                <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                  {renderTextWithFurigana(entry.sentence)}
                </p>

                {/* Notes */}
                {entry.notes && (
                  <div
                    className="text-sm p-2 rounded mb-3 line-clamp-2"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${CSS_VARS.SECONDARY} 10%, white)`,
                    }}
                  >
                    💡 {entry.notes}
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2"
                  style={{ borderColor: CSS_VARS.NEUTRAL }}
                >
                  <span>📖 {entry.directory}/{entry.fileName}</span>
                  <span>{new Date(entry.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Search Results */}
        {!loading && !error && entries.length > 0 && filteredEntries.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>「{searchQuery}」に一致する単語が見つかりませんでした</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="w-full max-w-2xl rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: CSS_VARS.BASE }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-6 border-b"
              style={{ borderColor: CSS_VARS.NEUTRAL }}
            >
              <div>
                <h2
                  className="text-2xl font-bold"
                  style={{ color: CSS_VARS.PRIMARY }}
                >
                  {renderTextWithFurigana(selectedEntry.word)}
                </h2>
                {selectedEntry.reading && (
                  <p className="text-gray-600 mt-1">{selectedEntry.reading}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
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

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Sentence */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">文脈</h3>
                <div
                  className="p-4 rounded-lg whitespace-pre-wrap"
                  style={{
                    backgroundColor: '#f9fafb',
                    borderColor: CSS_VARS.NEUTRAL,
                  }}
                >
                  {renderTextWithFurigana(selectedEntry.sentence)}
                </div>
              </div>

              {/* Notes */}
              {selectedEntry.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">メモ</h3>
                  <div
                    className="p-4 rounded-lg whitespace-pre-wrap"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${CSS_VARS.SECONDARY} 10%, white)`,
                    }}
                  >
                    {selectedEntry.notes}
                  </div>
                </div>
              )}

              {/* Source Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">出典</h3>
                <p className="text-gray-600">
                  📖 {selectedEntry.directory}/{selectedEntry.fileName}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  保存日時: {formatDate(selectedEntry.createdAt)}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between p-6 border-t"
              style={{ borderColor: CSS_VARS.NEUTRAL }}
            >
              <button
                onClick={() => deleteEntry(selectedEntry.id)}
                className="px-6 py-2 rounded-lg font-medium transition-all hover:bg-red-100"
                style={{ color: '#ef4444' }}
              >
                削除
              </button>
              <button
                onClick={() => navigateToSource(selectedEntry)}
                className="px-6 py-2 rounded-lg font-medium shadow-sm transition-all hover:shadow-md"
                style={{
                  backgroundColor: CSS_VARS.PRIMARY,
                  color: 'white',
                }}
              >
                元の文章を見る →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
