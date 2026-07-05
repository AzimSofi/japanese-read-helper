'use client';

import Link from 'next/link';
import { COLORS, DARK_COLORS } from '@/lib/constants';

interface GuestModeBannerProps {
  message?: string;
  isDarkMode?: boolean;
}

export default function GuestModeBanner({ message, isDarkMode = false }: GuestModeBannerProps) {
  const theme = isDarkMode
    ? {
        bg: DARK_COLORS.SURFACE,
        border: 'rgba(255,193,77,0.25)',
        text: '#E0B872',
        chipBg: 'rgba(255,193,77,0.18)',
        chipText: '#F0C674',
        link: DARK_COLORS.PRIMARY,
      }
    : {
        bg: '#FFF7E6',
        border: '#FFE1A8',
        text: '#8A6D3B',
        chipBg: '#FFE1A8',
        chipText: '#7A5A1E',
        link: COLORS.PRIMARY,
      };

  return (
    <div style={{ backgroundColor: theme.bg, borderBottom: `1px solid ${theme.border}` }}>
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm" style={{ color: theme.text }}>
          <span
            className="px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap"
            style={{ backgroundColor: theme.chipBg, color: theme.chipText }}
          >
            Guest mode
          </span>
          <span>
            {message || 'You are reading a free preview. Sign in for the full library.'}
          </span>
        </div>
        <Link
          href="/login"
          className="text-sm font-semibold whitespace-nowrap interactive-link"
          style={{ color: theme.link }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
