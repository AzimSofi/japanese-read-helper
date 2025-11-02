/**
 * クライアントサイドレイアウトラッパー
 * TopNavigationをクライアント専用でレンダリングしてハイドレーションエラーを回避
 */

'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// TopNavigationをクライアント専用でインポート（SSRなし）
const TopNavigation = dynamic(() => import('@/app/components/ui/TopNavigation'), {
  ssr: false,
});

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <>
      <TopNavigation />
      <div className="my-18">
        {children}
      </div>
    </>
  );
}
