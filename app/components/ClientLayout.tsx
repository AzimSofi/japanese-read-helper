/**
 * クライアントサイドレイアウトラッパー
 * TopNavigationをクライアント専用でレンダリングしてハイドレーションエラーを回避
 * Minimal reader pages (/library, /read) hide the navigation for distraction-free reading
 */

'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { usePathname } from 'next/navigation';

const TopNavigation = dynamic(() => import('@/app/components/ui/TopNavigation'), {
  ssr: false,
});

interface ClientLayoutProps {
  children: React.ReactNode;
}

const MINIMAL_LAYOUT_PATHS = ['/library', '/read'];

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isMinimalLayout = MINIMAL_LAYOUT_PATHS.some(path => pathname?.startsWith(path));

  if (isMinimalLayout) {
    return <>{children}</>;
  }

  return (
    <>
      <TopNavigation />
      <div className="my-18">
        {children}
      </div>
    </>
  );
}
