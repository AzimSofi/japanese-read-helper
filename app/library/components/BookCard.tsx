'use client';

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
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <Link href={readUrl} className="block group">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)';
        }}
      >
        <div className="aspect-[3/4] flex flex-col">
          <div className="flex-1 flex items-center justify-center px-4">
            <h3
              className="text-center font-semibold text-base leading-snug"
              style={{ color: '#1D1D1F' }}
            >
              {displayName}
            </h3>
          </div>

          <div className="px-3 pb-3">
            <div className="flex justify-between items-center mb-1.5" style={{ fontSize: '11px' }}>
              <span style={{ color: '#8E8E93' }}>
                {Math.round(clampedProgress)}%
              </span>
              {totalCharacters && (
                <span style={{ color: '#8E8E93' }}>
                  {totalCharacters.toLocaleString()} chars
                </span>
              )}
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: '#E5E5EA' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${clampedProgress}%`,
                  backgroundColor: '#007AFF',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
