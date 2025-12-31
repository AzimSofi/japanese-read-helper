'use client';

import { COLORS, READER_THEME } from '@/lib/constants';
import LibraryGrid from './components/LibraryGrid';
import Link from 'next/link';

export default function LibraryPage() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: READER_THEME.SURFACE_MUTED }}
    >
      <header
        className="sticky top-0 z-40 backdrop-blur-sm border-b"
        style={{
          backgroundColor: `${READER_THEME.SURFACE}F5`,
          borderColor: COLORS.NEUTRAL,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1
            className="text-2xl font-semibold"
            style={{ color: COLORS.PRIMARY_DARK }}
          >
            Library
          </h1>

          <nav className="flex items-center gap-2">
            <Link
              href="/text-input-ai"
              className="p-2 rounded-lg transition-colors duration-150"
              style={{ color: COLORS.SECONDARY_DARK }}
              title="Add new text"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
            <Link
              href="/visual-novel"
              className="p-2 rounded-lg transition-colors duration-150"
              style={{ color: COLORS.SECONDARY_DARK }}
              title="Visual Novel mode"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <LibraryGrid />
      </main>
    </div>
  );
}
