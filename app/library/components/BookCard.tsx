'use client';

import { READER_THEME, COLORS } from '@/lib/constants';
import Link from 'next/link';

interface BookCardProps {
  fileName: string;
  directory: string;
  progress: number;
  totalCharacters?: number;
}

export default function BookCard({
  fileName,
  directory,
  progress,
  totalCharacters,
}: BookCardProps) {
  const displayName = fileName.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
  const readUrl = `/read?directory=${encodeURIComponent(directory)}&fileName=${encodeURIComponent(fileName)}`;

  return (
    <Link
      href={readUrl}
      className="block group"
    >
      <div
        className="relative rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border"
        style={{
          backgroundColor: READER_THEME.SURFACE,
          borderColor: COLORS.NEUTRAL,
        }}
      >
        <div className="aspect-[3/4] flex flex-col">
          <div className="flex-1 p-4 flex items-center justify-center">
            <h3
              className="text-center font-medium text-lg leading-tight"
              style={{ color: COLORS.PRIMARY_DARK }}
            >
              {displayName}
            </h3>
          </div>

          <div className="p-3 border-t" style={{ borderColor: COLORS.NEUTRAL }}>
            <div
              className="h-2 rounded-full overflow-hidden mb-2"
              style={{ backgroundColor: READER_THEME.PROGRESS_TRACK }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  backgroundColor: READER_THEME.PROGRESS_FILL,
                }}
              />
            </div>

            <div className="flex justify-between items-center text-xs" style={{ color: COLORS.SECONDARY_DARK }}>
              <span>{Math.round(progress)}%</span>
              {totalCharacters && (
                <span>{totalCharacters.toLocaleString()} chars</span>
              )}
            </div>
          </div>
        </div>

        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(226, 161, 111, 0.1)' }}
        >
          <span
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: COLORS.PRIMARY,
              color: '#FFFFFF',
            }}
          >
            Read
          </span>
        </div>
      </div>
    </Link>
  );
}
