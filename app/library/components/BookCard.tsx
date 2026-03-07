'use client';

import Link from 'next/link';

const GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#fccb90', '#d57eeb'],
  ['#e0c3fc', '#8ec5fc'],
  ['#f5576c', '#ff6f61'],
  ['#96fbc4', '#f9f586'],
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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
  const gradient = GRADIENTS[hashString(fileName) % GRADIENTS.length];
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <Link
      href={readUrl}
      className="block group"
    >
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${gradient[0]}, ${gradient[1]})`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
          transition: 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.03)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)';
        }}
      >
        <div className="aspect-[3/4] flex flex-col">
          <div className="flex-1 flex items-center justify-center px-4">
            <h3
              className="text-center font-semibold text-base leading-snug text-white"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
            >
              {displayName}
            </h3>
          </div>

          <div className="px-3 pb-3">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span
                className="text-white/80"
                style={{ fontSize: '10px' }}
              >
                {Math.round(clampedProgress)}%
              </span>
              {totalCharacters && (
                <span
                  className="text-white/80"
                  style={{ fontSize: '10px' }}
                >
                  {totalCharacters.toLocaleString()} chars
                </span>
              )}
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${clampedProgress}%`,
                  backgroundColor: 'rgba(255,255,255,0.9)',
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
