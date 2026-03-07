'use client';

import { useState, useRef, useEffect } from 'react';
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  const displayName = directory
    .replace(/-/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());

  const avgProgress = books.length > 0
    ? books.reduce((sum, b) => sum + b.progress, 0) / books.length
    : 0;

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [books, isExpanded]);

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver(() => {
      if (contentRef.current && isExpanded) {
        setContentHeight(contentRef.current.scrollHeight);
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [isExpanded]);

  return (
    <div className="mt-8 first:mt-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 group cursor-pointer"
      >
        <svg
          className="w-3.5 h-3.5 transition-transform duration-300"
          style={{
            color: '#8E8E93',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
        <h2
          className="font-semibold"
          style={{ fontSize: '20px', color: '#1D1D1F' }}
        >
          {displayName}
        </h2>
        <span
          className="text-sm"
          style={{ color: '#8E8E93' }}
        >
          {books.length} {books.length === 1 ? 'book' : 'books'}
        </span>
        <span
          className="text-sm"
          style={{ color: '#8E8E93' }}
        >
          {Math.round(avgProgress)}% avg
        </span>
      </button>

      <div
        style={{
          height: isExpanded ? contentHeight : 0,
          overflow: 'hidden',
          transition: 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div ref={contentRef} className="pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
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
        </div>
      </div>
    </div>
  );
}
