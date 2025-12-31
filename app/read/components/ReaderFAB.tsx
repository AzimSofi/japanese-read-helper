'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { READER_THEME, COLORS } from '@/lib/constants';
import { useRouter } from 'next/navigation';

interface ReaderFABProps {
  onBookmark: () => void;
  onToggleFurigana: () => void;
  onOpenSettings: () => void;
  onGoToBookmark?: () => void;
  isFuriganaEnabled: boolean;
  isBookmarked: boolean;
  bookmarkPage?: number | null;
  currentPage?: number;
  currentPageHeaders?: string[];
}

const STORAGE_KEY = 'fab_position';
const FAB_SIZE = 56;
const MENU_MARGIN = 12;

interface Position {
  x: number;
  y: number;
}

function getInitialPosition(): Position {
  if (typeof window === 'undefined') {
    return { x: 20, y: 80 };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const pos = JSON.parse(stored);
      return {
        x: Math.min(Math.max(0, pos.x), window.innerWidth - FAB_SIZE),
        y: Math.min(Math.max(0, pos.y), window.innerHeight - FAB_SIZE),
      };
    }
  } catch {}

  return {
    x: window.innerWidth - FAB_SIZE - 20,
    y: window.innerHeight - FAB_SIZE - 80,
  };
}

export default function ReaderFAB({
  onBookmark,
  onToggleFurigana,
  onOpenSettings,
  onGoToBookmark,
  isFuriganaEnabled,
  isBookmarked,
  bookmarkPage,
  currentPage,
  currentPageHeaders = [],
}: ReaderFABProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  } | null>(null);

  const justDraggedRef = useRef(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPosition(getInitialPosition());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isDragging) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
      } catch {}
    }
  }, [position, isDragging, mounted]);

  const handleCopyPageText = useCallback(async () => {
    if (currentPageHeaders.length === 0) return;

    try {
      const textToCopy = currentPageHeaders.join('\n');
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [currentPageHeaders]);

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
      const newX = Math.min(
        Math.max(0, dragRef.current.initialX + deltaX),
        window.innerWidth - FAB_SIZE
      );
      const newY = Math.min(
        Math.max(0, dragRef.current.initialY + deltaY),
        window.innerHeight - FAB_SIZE
      );

      setPosition({ x: newX, y: newY });
    }
  }, []);

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

  const handleFabClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragRef.current?.hasMoved || justDraggedRef.current) return;
    setIsExpanded(prev => !prev);
  }, []);

  const handleAction = useCallback((action: () => void, keepOpen?: boolean) => {
    action();
    if (!keepOpen) {
      setIsExpanded(false);
    }
  }, []);

  const handleBackdropClick = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const getMenuPosition = useCallback(() => {
    if (typeof window === 'undefined') return { top: 'auto', bottom: '72px', left: 'auto', right: '0' };

    const isNearBottom = position.y > window.innerHeight / 2;
    const isNearRight = position.x > window.innerWidth / 2;

    return {
      ...(isNearBottom ? { bottom: `${FAB_SIZE + MENU_MARGIN}px` } : { top: `${FAB_SIZE + MENU_MARGIN}px` }),
      ...(isNearRight ? { right: '0' } : { left: '0' }),
    };
  }, [position]);

  const hasBookmark = bookmarkPage != null && bookmarkPage > 0;
  const isOnBookmarkPage = hasBookmark && currentPage === bookmarkPage;

  const fabButtons = [
    {
      icon: (
        <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
      label: 'Bookmark',
      action: onBookmark,
      active: isBookmarked,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      ),
      label: isOnBookmarkPage ? 'Scroll to Bookmark' : `Go to p.${bookmarkPage}`,
      action: onGoToBookmark || (() => {}),
      active: isOnBookmarkPage,
      hidden: !hasBookmark || !onGoToBookmark,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      label: copyFeedback ? 'Copied!' : 'Copy Page',
      action: handleCopyPageText,
      active: copyFeedback,
      hidden: currentPageHeaders.length === 0,
      keepOpen: true,
    },
    {
      icon: <span className="text-sm font-medium">{isFuriganaEnabled ? 'A' : 'ruby'}</span>,
      label: 'Furigana',
      action: onToggleFurigana,
      active: isFuriganaEnabled,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: 'Settings',
      action: onOpenSettings,
      active: false,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      label: 'Library',
      action: () => router.push('/library'),
      active: false,
    },
  ];

  const visibleButtons = fabButtons.filter(btn => !btn.hidden);
  const menuStyle = getMenuPosition();
  const isMenuAbove = 'bottom' in menuStyle;

  if (!mounted) return null;

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={handleBackdropClick}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        />
      )}

      <div
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          touchAction: 'none',
        }}
      >
        <div className="relative">
          {isExpanded && (
            <div
              className="absolute flex flex-col gap-2"
              style={{
                ...menuStyle,
                flexDirection: isMenuAbove ? 'column-reverse' : 'column',
              }}
            >
              {visibleButtons.map((btn, index) => {
                const delay = isMenuAbove
                  ? (visibleButtons.length - 1 - index) * 40
                  : index * 40;

                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(btn.action, btn.keepOpen);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap animate-fab-item"
                    style={{
                      backgroundColor: btn.active ? COLORS.PRIMARY : READER_THEME.SURFACE,
                      color: btn.active ? '#FFFFFF' : COLORS.PRIMARY_DARK,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      animationDelay: `${delay}ms`,
                      opacity: 0,
                      transform: isMenuAbove ? 'translateY(8px)' : 'translateY(-8px)',
                    }}
                  >
                    {btn.icon}
                    <span className="text-sm font-medium">{btn.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            ref={fabRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleFabClick}
            className="relative select-none"
            style={{
              width: `${FAB_SIZE}px`,
              height: `${FAB_SIZE}px`,
              borderRadius: '50%',
              backgroundColor: isExpanded ? COLORS.SECONDARY : COLORS.PRIMARY,
              color: '#FFFFFF',
              border: 'none',
              boxShadow: isDragging
                ? '0 8px 32px rgba(0, 0, 0, 0.35)'
                : '0 4px 20px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isDragging ? 'grabbing' : 'grab',
              transition: isDragging ? 'none' : 'background-color 200ms, box-shadow 200ms, transform 200ms',
              transform: isDragging ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{
                transition: 'transform 200ms ease-out',
                transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)',
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>

            {isDragging && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  border: `2px dashed ${COLORS.SECONDARY}`,
                  animation: 'pulse 1s ease-in-out infinite',
                }}
              />
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fab-item-enter {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fab-item {
          animation: fab-item-enter 200ms ease-out forwards;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
