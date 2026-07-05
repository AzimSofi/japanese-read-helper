'use client';

import Link from 'next/link';
import { COLORS } from '@/lib/constants';

interface GuestModeBannerProps {
  message?: string;
}

export default function GuestModeBanner({ message }: GuestModeBannerProps) {
  return (
    <div style={{ backgroundColor: '#FFF7E6', borderBottom: '1px solid #FFE1A8' }}>
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm" style={{ color: '#8A6D3B' }}>
          <span
            className="px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap"
            style={{ backgroundColor: '#FFE1A8', color: '#7A5A1E' }}
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
          style={{ color: COLORS.PRIMARY }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
