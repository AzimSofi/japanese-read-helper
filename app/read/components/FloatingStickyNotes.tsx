'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { READER_THEME, COLORS, STORAGE_KEYS } from '@/lib/constants';
import { useRubyRegistry } from '@/app/hooks/useRubyRegistry';

interface FloatingStickyNotesProps {
  directory: string;
  bookName: string;
}

function getStarredStorageKey(directory: string, bookName: string): string {
  return `${STORAGE_KEYS.STARRED_WORDS}_${directory}_${bookName}`;
}

const COLLAPSED_SIZE = 44;
const PANEL_WIDTH = 280;
const MAX_HEIGHT = 400;

interface Position {
  x: number;
  y: number;
}

function getInitialPosition(): Position {
  if (typeof window === 'undefined') {
    return { x: 20, y: 200 };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STICKY_NOTES_POSITION);
    if (stored) {
      const pos = JSON.parse(stored);
      return {
        x: Math.min(Math.max(0, pos.x), window.innerWidth - COLLAPSED_SIZE),
        y: Math.min(Math.max(0, pos.y), window.innerHeight - COLLAPSED_SIZE),
      };
    }
  } catch {}

  return { x: 20, y: 200 };
}

function getInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STICKY_NOTES_COLLAPSED);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

export default function FloatingStickyNotes({
  directory,
  bookName,
}: FloatingStickyNotesProps) {
  const [position, setPosition] = useState<Position>({ x: 20, y: 200 });
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [starredWords, setStarredWords] = useState<Set<string>>(new Set());

  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  } | null>(null);

  const justDraggedRef = useRef(false);

  const { registry } = useRubyRegistry({
    directory,
    bookName,
    enabled: !!directory && !!bookName,
  });

  useEffect(() => {
    setPosition(getInitialPosition());
    setIsCollapsed(getInitialCollapsed());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isDragging) {
      try {
        localStorage.setItem(STORAGE_KEYS.STICKY_NOTES_POSITION, JSON.stringify(position));
      } catch {}
    }
  }, [position, isDragging, mounted]);

  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(STORAGE_KEYS.STICKY_NOTES_COLLAPSED, String(isCollapsed));
      } catch {}
    }
  }, [isCollapsed, mounted]);

  const loadStarredWords = useCallback(() => {
    if (!directory || !bookName) return;
    const key = getStarredStorageKey(directory, bookName);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setStarredWords(new Set(JSON.parse(stored)));
      } catch {
        setStarredWords(new Set());
      }
    } else {
      setStarredWords(new Set());
    }
  }, [directory, bookName]);

  useEffect(() => {
    loadStarredWords();
  }, [loadStarredWords]);

  useEffect(() => {
    const handleStarredChange = () => {
      loadStarredWords();
    };
    window.addEventListener('starredWordsChanged', handleStarredChange);
    return () => window.removeEventListener('starredWordsChanged', handleStarredChange);
  }, [loadStarredWords]);

  const starredEntries = useMemo(() => {
    if (!registry || starredWords.size === 0) return [];
    return registry.entries.filter(e => starredWords.has(e.kanji));
  }, [registry, starredWords]);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: position.x,
      initialY: position.y,
      hasMoved: false,
    };
    setIsDragging(true);
  }, [position]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current) return;

    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      dragRef.current.hasMoved = true;
    }

    if (dragRef.current.hasMoved) {
      const width = isCollapsed ? COLLAPSED_SIZE : PANEL_WIDTH;
      const newX = Math.min(
        Math.max(0, dragRef.current.initialX + deltaX),
        window.innerWidth - width
      );
      const newY = Math.min(
        Math.max(0, dragRef.current.initialY + deltaY),
        window.innerHeight - COLLAPSED_SIZE
      );

      setPosition({ x: newX, y: newY });
    }
  }, [isCollapsed]);

  const handleDragEnd = useCallback(() => {
    const wasDragging = dragRef.current?.hasMoved;
    dragRef.current = null;
    setIsDragging(false);

    if (wasDragging) {
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 100);
    }

    return wasDragging;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragRef.current?.hasMoved || justDraggedRef.current) return;
    setIsCollapsed(prev => !prev);
  }, []);

  if (!mounted) return null;
  if (starredWords.size === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9998,
        touchAction: 'none',
      }}
    >
      {isCollapsed ? (
        <button
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleToggle}
          className="relative select-none"
          style={{
            width: `${COLLAPSED_SIZE}px`,
            height: `${COLLAPSED_SIZE}px`,
            borderRadius: '50%',
            backgroundColor: COLORS.PRIMARY,
            color: '#FFFFFF',
            border: 'none',
            boxShadow: isDragging
              ? '0 8px 32px rgba(0, 0, 0, 0.35)'
              : '0 4px 20px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'box-shadow 200ms, transform 200ms',
            transform: isDragging ? 'scale(1.08)' : 'scale(1)',
          }}
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          {starredEntries.length > 0 && (
            <span
              className="absolute -top-1 -right-1 text-xs font-bold rounded-full flex items-center justify-center"
              style={{
                width: 20,
                height: 20,
                backgroundColor: COLORS.SECONDARY,
                color: '#FFFFFF',
              }}
            >
              {starredEntries.length}
            </span>
          )}
        </button>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            width: `${PANEL_WIDTH}px`,
            maxHeight: `${MAX_HEIGHT}px`,
            backgroundColor: READER_THEME.SURFACE,
            boxShadow: isDragging
              ? '0 8px 32px rgba(0, 0, 0, 0.35)'
              : '0 4px 20px rgba(0, 0, 0, 0.25)',
            border: `1px solid ${COLORS.NEUTRAL}`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex items-center justify-between px-4 py-3 select-none"
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              borderBottom: `1px solid ${COLORS.NEUTRAL}`,
              backgroundColor: READER_THEME.SURFACE_MUTED,
            }}
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill={COLORS.PRIMARY}
                viewBox="0 0 24 24"
              >
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="font-medium text-sm" style={{ color: COLORS.PRIMARY_DARK }}>
                Starred ({starredEntries.length})
              </span>
            </div>
            <button
              onClick={handleToggle}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              style={{ color: COLORS.PRIMARY_DARK }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div
            className="overflow-y-auto p-3 space-y-2"
            style={{ maxHeight: MAX_HEIGHT - 52 }}
          >
            {starredEntries.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No starred words
              </p>
            ) : (
              starredEntries.map(entry => (
                <div
                  key={entry.kanji}
                  className="p-2 rounded-lg bg-white border"
                  style={{ borderColor: COLORS.NEUTRAL }}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-lg font-medium"
                      style={{ color: COLORS.PRIMARY }}
                    >
                      {entry.kanji}
                    </span>
                    <span className="text-base">{entry.reading}</span>
                  </div>
                  {entry.note && (
                    <p className="text-xs text-gray-500 mt-1">{entry.note}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
