'use client';

import { useEffect, useState, useMemo } from 'react';
import { API_ROUTES } from '@/lib/constants';
import BookCard from './BookCard';

interface FileListResponse {
  directories: string[];
  filesByDirectory: Record<string, string[]>;
  files: string[];
}

interface BookProgressData {
  progress: number;
  totalCharacters: number;
  bookmarkPage: number | null;
  totalPages: number;
  bookmarkUpdatedAt: string | null;
  createdAt: string | null;
}

interface BookProgress {
  [key: string]: BookProgressData;
}

type SortMode = 'last-read' | 'last-added' | 'progress' | 'title';

interface FlatBook {
  fileName: string;
  directory: string;
  progress: number;
  totalCharacters: number;
  bookmarkPage: number | null;
  bookmarkUpdatedAt: string | null;
  createdAt: string | null;
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'last-read', label: 'Last Read' },
  { value: 'last-added', label: 'Last Added' },
  { value: 'progress', label: 'Progress' },
  { value: 'title', label: 'Title' },
];

function formatDirectoryTag(directory: string): string {
  const topLevel = directory.split('/')[0];
  return topLevel
    .replace(/-/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());
}

export default function LibraryGrid() {
  const [fileData, setFileData] = useState<FileListResponse | null>(null);
  const [bookProgress, setBookProgress] = useState<BookProgress>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('last-read');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [fileResponse, progressResponse] = await Promise.all([
          fetch(API_ROUTES.LIST_TEXT_FILES),
          fetch(API_ROUTES.LIBRARY_PROGRESS),
        ]);

        if (!fileResponse.ok) throw new Error('Failed to load library');
        if (!progressResponse.ok) throw new Error('Failed to load progress');

        const data: FileListResponse = await fileResponse.json();
        setFileData(data);

        const progressData: BookProgress = await progressResponse.json();
        setBookProgress(progressData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const sortedBooks = useMemo(() => {
    if (!fileData) return [];

    const books: FlatBook[] = [];
    for (const directory of fileData.directories) {
      const files = fileData.filesByDirectory[directory] || [];
      for (const fileName of files) {
        const key = `${directory}/${fileName}`;
        const pd = bookProgress[key];
        books.push({
          fileName,
          directory,
          progress: pd?.progress || 0,
          totalCharacters: pd?.totalCharacters || 0,
          bookmarkPage: pd?.bookmarkPage || null,
          bookmarkUpdatedAt: pd?.bookmarkUpdatedAt || null,
          createdAt: pd?.createdAt || null,
        });
      }
    }

    books.sort((a, b) => {
      switch (sortMode) {
        case 'last-read': {
          const aTime = a.bookmarkUpdatedAt ? new Date(a.bookmarkUpdatedAt).getTime() : 0;
          const bTime = b.bookmarkUpdatedAt ? new Date(b.bookmarkUpdatedAt).getTime() : 0;
          return bTime - aTime;
        }
        case 'last-added': {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        }
        case 'progress':
          return b.progress - a.progress;
        case 'title':
          return a.fileName.localeCompare(b.fileName);
        default:
          return 0;
      }
    });

    return books;
  }, [fileData, bookProgress, sortMode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4"
            style={{
              borderColor: '#E5E5EA',
              borderTopColor: '#007AFF',
            }}
          />
          <p className="text-sm" style={{ color: '#8E8E93' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-8 rounded-2xl text-center"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <p className="text-lg font-semibold mb-2" style={{ color: '#1D1D1F' }}>Could not load library</p>
        <p className="text-sm" style={{ color: '#8E8E93' }}>{error}</p>
      </div>
    );
  }

  if (sortedBooks.length === 0) {
    return (
      <div
        className="p-8 rounded-2xl text-center"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <p className="text-lg font-semibold mb-2" style={{ color: '#1D1D1F' }}>
          No books found
        </p>
        <p className="text-sm" style={{ color: '#8E8E93' }}>
          Add .txt files to the public/ directory to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setSortMode(option.value)}
            className="px-3 py-1.5 rounded-full text-sm font-medium interactive-pill"
            style={{
              backgroundColor: sortMode === option.value ? '#007AFF' : '#E5E5EA',
              color: sortMode === option.value ? '#FFFFFF' : '#1D1D1F',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {sortedBooks.map((book) => (
          <BookCard
            key={`${book.directory}/${book.fileName}`}
            fileName={book.fileName}
            directory={book.directory}
            progress={book.progress}
            totalCharacters={book.totalCharacters}
            directoryTag={formatDirectoryTag(book.directory)}
            bookmarkPage={book.bookmarkPage}
          />
        ))}
      </div>
    </div>
  );
}
