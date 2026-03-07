'use client';

import { COLORS } from '@/lib/constants';
import LibraryGrid from './components/LibraryGrid';
import Link from 'next/link';

export default function LibraryPage() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F2F2F7' }}
    >
      <div className="max-w-6xl mx-auto px-5 pt-12 pb-8">
        <div className="flex items-start justify-between mb-8">
          <h1
            className="font-bold tracking-tight"
            style={{ fontSize: '34px', color: '#1D1D1F' }}
          >
            Library
          </h1>

          <nav className="flex items-center gap-1 pt-1">
            <Link
              href="/text-input-ai"
              className="p-2.5 rounded-xl transition-colors duration-200 hover:bg-black/5"
              style={{ color: COLORS.PRIMARY }}
              title="Add new text"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
            <Link
              href="/visual-novel"
              className="p-2.5 rounded-xl transition-colors duration-200 hover:bg-black/5"
              style={{ color: COLORS.PRIMARY }}
              title="Visual Novel mode"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </Link>
          </nav>
        </div>

        <LibraryGrid />
      </div>
    </div>
  );
}
