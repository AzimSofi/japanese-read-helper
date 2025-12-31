'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { READER_THEME, COLORS } from '@/lib/constants';

function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const directory = searchParams.get('directory');
  const fileName = searchParams.get('fileName');

  useEffect(() => {
    if (directory && fileName) {
      const params = new URLSearchParams();
      params.set('directory', directory);
      params.set('fileName', fileName);
      const page = searchParams.get('page');
      if (page) params.set('page', page);
      router.replace(`/read?${params.toString()}`);
    } else {
      router.replace('/library');
    }
  }, [directory, fileName, router, searchParams]);

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

export default function Home() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <HomeRedirect />
    </Suspense>
  );
}
