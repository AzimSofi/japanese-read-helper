'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CSS_VARS, API_ROUTES } from '@/lib/constants';
import { useRubyRegistry } from '@/app/hooks/useRubyRegistry';
import type { TextFileListResponse, RubyEntry } from '@/lib/types';

interface BookOption {
  directory: string;
  bookName: string;
  label: string;
}

function RubyRegistryContent() {
  const searchParams = useSearchParams();
  const initialDirectory = searchParams.get('directory') || '';
  const initialBookName = searchParams.get('bookName') || '';

  const [books, setBooks] = useState<BookOption[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookOption | null>(
    initialDirectory && initialBookName
      ? { directory: initialDirectory, bookName: initialBookName, label: `${initialDirectory}/${initialBookName}` }
      : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RubyEntry | null>(null);
  const [formData, setFormData] = useState({ kanji: '', reading: '', note: '' });

  const {
    registry,
    isLoading,
    error,
    addEntry,
    deleteEntry,
    ignoreSuggestion,
    searchEntries,
  } = useRubyRegistry({
    directory: selectedBook?.directory || '',
    bookName: selectedBook?.bookName || '',
    enabled: !!selectedBook,
  });

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await fetch(API_ROUTES.LIST_TEXT_FILES);
      const data: TextFileListResponse = await response.json();

      const options: BookOption[] = [];
      for (const [dir, files] of Object.entries(data.filesByDirectory)) {
        for (const file of files) {
          options.push({
            directory: dir,
            bookName: file,
            label: `${dir}/${file}`,
          });
        }
      }
      setBooks(options);

      if (!selectedBook && options.length > 0) {
        setSelectedBook(options[0]);
      }
    } catch (err) {
      console.error('Error fetching books:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kanji || !formData.reading) return;

    try {
      await addEntry({
        kanji: formData.kanji,
        reading: formData.reading,
        note: formData.note,
        source: editingEntry?.source || 'user',
      });
      setFormData({ kanji: '', reading: '', note: '' });
      setShowAddForm(false);
      setEditingEntry(null);
    } catch (err) {
      console.error('Error saving entry:', err);
    }
  };

  const handleEdit = (entry: RubyEntry) => {
    setEditingEntry(entry);
    setFormData({
      kanji: entry.kanji,
      reading: entry.reading,
      note: entry.note,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (kanji: string) => {
    if (!confirm(`「${kanji}」を削除しますか？`)) return;
    try {
      await deleteEntry(kanji);
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  const handleAddSuggestion = (kanji: string) => {
    setFormData({ kanji, reading: '', note: '' });
    setEditingEntry(null);
    setShowAddForm(true);
  };

  const handleIgnoreSuggestion = async (kanji: string) => {
    try {
      await ignoreSuggestion(kanji);
    } catch (err) {
      console.error('Error ignoring suggestion:', err);
    }
  };

  const filteredEntries = searchQuery ? searchEntries(searchQuery) : (registry?.entries || []);

  return (
    <div className="min-h-screen pt-24 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Ruby Registry</h1>
          <p className="text-gray-600">
            Character name readings and special vocabulary lookups
          </p>
        </div>

        {/* Book Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Book
          </label>
          <select
            value={selectedBook?.label || ''}
            onChange={(e) => {
              const book = books.find(b => b.label === e.target.value);
              setSelectedBook(book || null);
            }}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 bg-white"
            style={{
              borderColor: CSS_VARS.NEUTRAL,
            }}
          >
            <option value="">Select a book...</option>
            {books.map((book) => (
              <option key={book.label} value={book.label}>
                {book.label}
              </option>
            ))}
          </select>
        </div>

        {selectedBook && (
          <>
            {/* Search and Add */}
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries..."
                className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 bg-white"
                style={{ borderColor: CSS_VARS.NEUTRAL }}
              />
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingEntry(null);
                  setFormData({ kanji: '', reading: '', note: '' });
                }}
                className="px-6 py-3 rounded-lg font-medium shadow-sm transition-all hover:shadow-md"
                style={{ backgroundColor: CSS_VARS.PRIMARY, color: 'white' }}
              >
                + Add Entry
              </button>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
              <div
                className="mb-6 p-4 rounded-lg border"
                style={{ borderColor: CSS_VARS.NEUTRAL, backgroundColor: 'white' }}
              >
                <h3 className="font-medium mb-4">
                  {editingEntry ? 'Edit Entry' : 'Add New Entry'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Kanji</label>
                      <input
                        type="text"
                        value={formData.kanji}
                        onChange={(e) => setFormData({ ...formData, kanji: e.target.value })}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2"
                        style={{ borderColor: CSS_VARS.NEUTRAL }}
                        placeholder="e.g., 月"
                        disabled={!!editingEntry}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Reading</label>
                      <input
                        type="text"
                        value={formData.reading}
                        onChange={(e) => setFormData({ ...formData, reading: e.target.value })}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2"
                        style={{ borderColor: CSS_VARS.NEUTRAL }}
                        placeholder="e.g., るな"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Note (optional)</label>
                    <input
                      type="text"
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2"
                      style={{ borderColor: CSS_VARS.NEUTRAL }}
                      placeholder="e.g., main character"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded font-medium"
                      style={{ backgroundColor: CSS_VARS.PRIMARY, color: 'white' }}
                    >
                      {editingEntry ? 'Update' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingEntry(null);
                      }}
                      className="px-4 py-2 rounded font-medium border"
                      style={{ borderColor: CSS_VARS.NEUTRAL }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Loading / Error */}
            {isLoading && (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            )}
            {error && (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-6">
                {error.message}
              </div>
            )}

            {/* Entries List */}
            {!isLoading && registry && (
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-medium">
                    Entries ({filteredEntries.length})
                  </h2>
                </div>

                {filteredEntries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No matching entries found' : 'No entries yet'}
                  </div>
                ) : (
                  <div className="space-y-2 mb-8">
                    {filteredEntries.map((entry) => (
                      <div
                        key={entry.kanji}
                        className="flex items-center justify-between p-3 rounded-lg border hover:shadow-sm transition-shadow"
                        style={{ borderColor: CSS_VARS.NEUTRAL, backgroundColor: 'white' }}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-medium" style={{ color: CSS_VARS.PRIMARY }}>
                            {entry.kanji}
                          </span>
                          <span className="text-lg">{entry.reading}</span>
                          {entry.note && (
                            <span className="text-sm text-gray-500">({entry.note})</span>
                          )}
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: entry.source === 'epub' ? '#e0f2fe' : '#fef3c7',
                              color: entry.source === 'epub' ? '#0369a1' : '#92400e',
                            }}
                          >
                            {entry.source}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="px-3 py-1 text-sm rounded hover:bg-gray-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(entry.kanji)}
                            className="px-3 py-1 text-sm rounded hover:bg-red-100 text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {registry.suggestions.length > 0 && !searchQuery && (
                  <>
                    <div className="mb-4">
                      <h2 className="text-lg font-medium">
                        Suggestions ({registry.suggestions.length})
                      </h2>
                      <p className="text-sm text-gray-500">
                        Frequent kanji compounds without readings - click to add
                      </p>
                    </div>

                    <div className="space-y-2">
                      {registry.suggestions.map((suggestion) => (
                        <div
                          key={suggestion.kanji}
                          className="flex items-center justify-between p-3 rounded-lg border"
                          style={{ borderColor: CSS_VARS.NEUTRAL, backgroundColor: '#fafafa' }}
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-xl">{suggestion.kanji}</span>
                            <span className="text-sm text-gray-500">
                              ({suggestion.occurrences} occurrences)
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddSuggestion(suggestion.kanji)}
                              className="px-3 py-1 text-sm rounded font-medium"
                              style={{ backgroundColor: CSS_VARS.SECONDARY, color: 'white' }}
                            >
                              Add Reading
                            </button>
                            <button
                              onClick={() => handleIgnoreSuggestion(suggestion.kanji)}
                              className="px-3 py-1 text-sm rounded hover:bg-gray-200"
                            >
                              Ignore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Back Link */}
        <div className="mt-8 pt-4 border-t" style={{ borderColor: CSS_VARS.NEUTRAL }}>
          <Link
            href="/library"
            className="text-gray-600 hover:underline"
          >
            Back to Library
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RubyRegistryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-8 px-4 text-center">Loading...</div>}>
      <RubyRegistryContent />
    </Suspense>
  );
}
