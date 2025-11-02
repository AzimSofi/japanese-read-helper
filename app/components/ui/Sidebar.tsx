'use client';

import * as React from "react";
import { useReadingProgress } from "@/app/hooks/useReadingProgress";
import { COLORS } from "@/lib/constants";

interface SidebarProps {
  setDropdownAlwaysOpen: (state: boolean) => void;
  dropdownAlwaysOpen: boolean;
  fileName?: string | null;
  refreshTrigger?: number;
}

export default function Sidebar({
  setDropdownAlwaysOpen,
  dropdownAlwaysOpen,
  fileName,
  refreshTrigger,
}: SidebarProps) {
  const { progress, isLoading, refetch } = useReadingProgress({
    fileName: fileName || '',
    enabled: !!fileName,
  });

  // ブックマーク更新時にプログレスバーを自動更新
  React.useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  const scrollToBookmark = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById("bookmark");
    if (el) {
      const offset = -window.innerHeight / 5 + el.offsetHeight / 5;
      const top = el.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const showProgress = progress && progress.totalItems > 0 && !isLoading;

  return (
    <div className="fixed top-20 left-4 z-40 text-xs flex flex-col gap-3">
      {/* 表示/隠す ボタン */}
      <button
        onClick={() => setDropdownAlwaysOpen(!dropdownAlwaysOpen)}
        className={`px-4 py-2.5 rounded-lg font-medium shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95 border ${
          dropdownAlwaysOpen
            ? `bg-[${COLORS.BOOKMARK_HIGHLIGHT}] border-[${COLORS.SIDEBAR_BUTTON}] text-gray-700 hover:bg-[${COLORS.BOOKMARK_HIGHLIGHT}]/80`
            : `bg-[${COLORS.SIDEBAR_BUTTON}] border-[${COLORS.SIDEBAR_BUTTON}] text-gray-600 hover:bg-[${COLORS.SIDEBAR_BUTTON}]/80`
        }`}
      >
        {dropdownAlwaysOpen ? "表示" : "隠す"}
      </button>

      {/* プログレスインジケーター */}
      {showProgress && (
        <div className={`bg-[${COLORS.BOOKMARK_HIGHLIGHT}] rounded-lg shadow-lg border border-[${COLORS.SIDEBAR_BUTTON}] p-3 w-64`}>
          <div className="space-y-2">
            {/* プログレスバー */}
            <div className={`relative h-6 bg-[${COLORS.SIDEBAR_BUTTON}] rounded-full overflow-hidden`}>
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r from-[${COLORS.BOOKMARK_UNFILLED}] to-[#6a98a8] transition-all duration-300 ease-out flex items-center justify-center`}
                style={{ width: `${progress.percentage}%` }}
              >
                {progress.percentage > 15 && (
                  <span className="text-white font-bold text-xs">
                    {progress.percentage}%
                  </span>
                )}
              </div>
              {progress.percentage <= 15 && (
                <span className="absolute inset-0 flex items-center justify-center text-gray-600 font-bold text-xs">
                  {progress.percentage}%
                </span>
              )}
            </div>

            {/* 統計情報 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className={`bg-[${COLORS.BOOKMARK_UNFILLED}]/20 rounded-lg px-2 py-1.5 border border-[${COLORS.BOOKMARK_UNFILLED}]`}>
                <div className={`text-[${COLORS.BOOKMARK_UNFILLED}] font-medium text-xs`}>文字数</div>
                <div className="text-[#6a98a8] font-bold text-xs">
                  {progress.currentCharCount.toLocaleString()} / {progress.totalCharCount.toLocaleString()}
                </div>
              </div>
              <div className={`bg-[${COLORS.BOOKMARK_FILLED}]/20 rounded-lg px-2 py-1.5 border border-[${COLORS.BOOKMARK_FILLED}]`}>
                <div className={`text-[${COLORS.BOOKMARK_FILLED}] font-medium text-xs`}>文章数</div>
                <div className="text-[#d18a54] font-bold text-xs">
                  {progress.currentItemIndex} / {progress.totalItems}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ブックマークへ ボタン */}
      <a
        href="#"
        onClick={scrollToBookmark}
        className={`px-4 py-2.5 rounded-lg bg-[${COLORS.BOOKMARK_FILLED}]/20 border border-[${COLORS.BOOKMARK_FILLED}] text-[${COLORS.BOOKMARK_FILLED}] font-medium shadow-lg transition-all hover:bg-[${COLORS.BOOKMARK_FILLED}]/30 hover:shadow-xl hover:scale-105 active:scale-95 text-center`}
      >
        ブックマークへ
      </a>
    </div>
  );
}
