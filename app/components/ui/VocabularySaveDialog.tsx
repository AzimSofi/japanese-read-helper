'use client';

import { useState } from 'react';
import { CSS_VARS } from '@/lib/constants';

interface VocabularySaveDialogProps {
  isOpen: boolean;
  word: string;
  sentence: string;
  fileName: string;
  directory: string;
  paragraphText: string;
  onClose: () => void;
  onSave: () => void;
}

export default function VocabularySaveDialog({
  isOpen,
  word,
  sentence,
  fileName,
  directory,
  paragraphText,
  onClose,
  onSave,
}: VocabularySaveDialogProps) {
  const [reading, setReading] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word,
          reading: reading || undefined,
          sentence,
          fileName,
          directory,
          paragraphText,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save vocabulary');
      }

      // Reset form
      setReading('');
      setNotes('');
      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving vocabulary:', err);
      setError(err instanceof Error ? err.message : 'Failed to save vocabulary');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReading('');
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-lg shadow-xl"
        style={{ backgroundColor: CSS_VARS.BASE }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: CSS_VARS.NEUTRAL }}
        >
          <h2 className="text-xl font-bold">📝 単語を保存</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="閉じる"
          >
            <svg
              className="w-5 h-5"
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
          {/* Word (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              単語
            </label>
            <div
              className="w-full p-3 border rounded-lg font-bold text-lg"
              style={{
                backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 10%, white)`,
                borderColor: CSS_VARS.NEUTRAL,
                color: CSS_VARS.PRIMARY,
              }}
            >
              {word}
            </div>
          </div>

          {/* Reading (optional) */}
          <div>
            <label htmlFor="reading" className="block text-sm font-medium mb-2 text-gray-700">
              読み方 (任意)
            </label>
            <input
              id="reading"
              type="text"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              placeholder="ふりがな"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 bg-white"
              style={{
                borderColor: CSS_VARS.NEUTRAL,
                '--tw-ring-color': CSS_VARS.PRIMARY,
              } as React.CSSProperties}
            />
          </div>

          {/* Sentence context (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              文脈
            </label>
            <div
              className="w-full p-3 border rounded-lg text-sm whitespace-pre-wrap max-h-32 overflow-y-auto"
              style={{
                backgroundColor: '#f9fafb',
                borderColor: CSS_VARS.NEUTRAL,
              }}
            >
              {sentence}
            </div>
          </div>

          {/* Notes (optional) */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-2 text-gray-700">
              メモ (任意)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="この単語について気づいたことや覚え方など..."
              rows={3}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 bg-white resize-none"
              style={{
                borderColor: CSS_VARS.NEUTRAL,
                '--tw-ring-color': CSS_VARS.PRIMARY,
              } as React.CSSProperties}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 p-4 border-t"
          style={{ borderColor: CSS_VARS.NEUTRAL }}
        >
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2 rounded-lg font-medium transition-all hover:bg-gray-100 disabled:opacity-50"
            style={{ color: '#6b7280' }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 rounded-lg font-medium shadow-sm transition-all hover:shadow-md disabled:opacity-50"
            style={{
              backgroundColor: CSS_VARS.PRIMARY,
              color: 'white',
            }}
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
