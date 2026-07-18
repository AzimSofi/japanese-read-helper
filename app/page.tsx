'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { READER_THEME, COLORS } from '@/lib/constants';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/library');
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: READER_THEME.SURFACE_MUTED }}
    >
      <div
        className="w-12 h-12 border-4 rounded-full animate-spin"
        style={{
          borderColor: COLORS.NEUTRAL,
          borderTopColor: COLORS.PRIMARY,
        }}
      />
    </div>
  );
}
