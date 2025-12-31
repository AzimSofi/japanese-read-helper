'use client';

import { READER_THEME } from '@/lib/constants';

interface ProgressBarProps {
  progress: number;
  currentPage: number;
  totalPages: number;
  visible?: boolean;
}

export default function ProgressBar({
  progress,
  currentPage,
  totalPages,
  visible = true,
}: ProgressBarProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-1 w-full"
        style={{ backgroundColor: READER_THEME.PROGRESS_TRACK }}
      >
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor: READER_THEME.PROGRESS_FILL,
          }}
        />
      </div>

      {progress > 5 && (
        <div
          className="absolute top-1 right-2 text-xs px-2 py-0.5 rounded-b-md transition-opacity duration-200"
          style={{
            backgroundColor: `${READER_THEME.SURFACE}E0`,
            color: READER_THEME.PROGRESS_FILL,
          }}
        >
          {currentPage}/{totalPages}
        </div>
      )}
    </div>
  );
}
