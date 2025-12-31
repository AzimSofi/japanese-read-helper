'use client';

import { useState, useEffect, useCallback } from 'react';
import { READER_THEME, COLORS } from '@/lib/constants';
import { useRouter } from 'next/navigation';

interface ReaderFABProps {
  onBookmark: () => void;
  onToggleFurigana: () => void;
  onOpenSettings: () => void;
  isFuriganaEnabled: boolean;
  isBookmarked: boolean;
}

export default function ReaderFAB({
  onBookmark,
  onToggleFurigana,
  onOpenSettings,
  isFuriganaEnabled,
  isBookmarked,
}: ReaderFABProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  const resetHideTimer = useCallback(() => {
    if (hideTimeout) clearTimeout(hideTimeout);
    setIsVisible(true);
    const timeout = setTimeout(() => {
      if (!isExpanded) {
        setIsVisible(false);
      }
    }, 3000);
    setHideTimeout(timeout);
  }, [hideTimeout, isExpanded]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, []);

  useEffect(() => {
    const handleActivity = () => resetHideTimer();
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('mousemove', handleActivity);

    return () => {
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
    };
  }, [resetHideTimer]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      if (hideTimeout) clearTimeout(hideTimeout);
    } else {
      resetHideTimer();
    }
  };

  const handleAction = (action: () => void) => {
    action();
    setIsExpanded(false);
    resetHideTimer();
  };

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

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-opacity duration-300 ${isVisible || isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="relative">
        {isExpanded && (
          <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-2 mb-2">
            {fabButtons.map((btn, index) => (
              <button
                key={index}
                onClick={() => handleAction(btn.action)}
                className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-200 hover:scale-105 whitespace-nowrap"
                style={{
                  backgroundColor: btn.active ? COLORS.PRIMARY : READER_THEME.SURFACE,
                  color: btn.active ? '#FFFFFF' : COLORS.PRIMARY_DARK,
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {btn.icon}
                <span className="text-sm">{btn.label}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleToggle}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            backgroundColor: isExpanded ? COLORS.SECONDARY : READER_THEME.FAB_BG,
            color: READER_THEME.FAB_ICON,
          }}
        >
          <svg
            className={`w-6 h-6 transition-transform duration-200 ${isExpanded ? 'rotate-45' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
