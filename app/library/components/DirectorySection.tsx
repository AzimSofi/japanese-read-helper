'use client';

import { useState } from 'react';
import { COLORS } from '@/lib/constants';
import BookCard from './BookCard';

interface BookData {
  fileName: string;
  progress: number;
  totalCharacters?: number;
}

interface DirectorySectionProps {
  directory: string;
  books: BookData[];
  defaultExpanded?: boolean;
}

export default function DirectorySection({
  directory,
  books,
  defaultExpanded = true,
}: DirectorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const displayName = directory
    .replace(/-/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());

  const avgProgress = books.length > 0
    ? books.reduce((sum, b) => sum + b.progress, 0) / books.length
    : 0;

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-150 hover:bg-opacity-50"
        style={{
          backgroundColor: isExpanded ? 'transparent' : `${COLORS.NEUTRAL}20`,
        }}
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            style={{ color: COLORS.PRIMARY }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h2 className="text-lg font-medium" style={{ color: COLORS.PRIMARY_DARK }}>
            {displayName}
          </h2>
          <span
            className="px-2 py-0.5 text-xs rounded-full"
            style={{
              backgroundColor: `${COLORS.SECONDARY}20`,
              color: COLORS.SECONDARY_DARK,
            }}
          >
            {books.length} books
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.SECONDARY_DARK }}>
          <span>{Math.round(avgProgress)}% avg</span>
        </div>
      </button>

      {isExpanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 pl-4">
          {books.map((book) => (
            <BookCard
              key={book.fileName}
              fileName={book.fileName}
              directory={directory}
              progress={book.progress}
              totalCharacters={book.totalCharacters}
            />
          ))}
        </div>
      )}
    </div>
  );
}
