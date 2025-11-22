'use client';

import * as React from "react";
import { useReadingProgress } from "@/app/hooks/useReadingProgress";
import { CSS_VARS } from "@/lib/constants";

interface SidebarProps {
  setDropdownAlwaysOpen: (state: boolean) => void;
  dropdownAlwaysOpen: boolean;
  fileName?: string | null;
  refreshTrigger?: number;
  onNavigateToBookmark?: () => void;
}

export default function Sidebar({
  setDropdownAlwaysOpen,
  dropdownAlwaysOpen,
  fileName,
  refreshTrigger,
  onNavigateToBookmark,
}: SidebarProps) {
  const { progress, refetch } = useReadingProgress({
    fileName: fileName || '',
    enabled: !!fileName,
  });

  const [mobileProgressExpanded, setMobileProgressExpanded] = React.useState(false);

  // ブックマーク更新時にプログレスバーを自動更新
  React.useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const scrollToBookmark = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    e.preventDefault();
    const el = document.getElementById("bookmark");

    if (el) {
      // Bookmark is on current page, just scroll
      const offset = -window.innerHeight / 5 + el.offsetHeight / 5;
      const top = el.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: "smooth" });
    } else if (onNavigateToBookmark) {
      // Bookmark is on different page, trigger navigation
      onNavigateToBookmark();
    }
  };

  const showProgress = progress && progress.totalItems > 0;

  return (
    <>
      {/* デスクトップ：左サイドバー */}
      <div className="hidden md:flex fixed top-20 left-4 z-40 text-xs flex-col gap-3">
        {/* 表示/隠す ボタン */}
        <button
          onClick={() => setDropdownAlwaysOpen(!dropdownAlwaysOpen)}
          className="px-4 py-2.5 rounded-lg font-medium shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95 border"
          style={{
            backgroundColor: dropdownAlwaysOpen ? CSS_VARS.BASE : CSS_VARS.NEUTRAL,
            borderColor: CSS_VARS.NEUTRAL,
            color: dropdownAlwaysOpen ? '#374151' : '#4b5563',
          }}
        >
          {dropdownAlwaysOpen ? "表示" : "隠す"}
        </button>

        {/* プログレスインジケーター */}
        {showProgress && (
          <div
            className="rounded-lg shadow-lg border p-3 w-64"
            style={{
              backgroundColor: CSS_VARS.BASE,
              borderColor: CSS_VARS.NEUTRAL,
            }}
          >
            <div className="space-y-2">
              {/* プログレスバー */}
              <div
                className="relative h-6 rounded-full overflow-hidden"
                style={{ backgroundColor: CSS_VARS.NEUTRAL }}
              >
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-300 ease-out flex items-center justify-center"
                  style={{
                    width: `${progress.percentage}%`,
                    background: `linear-gradient(to right, ${CSS_VARS.SECONDARY}, ${CSS_VARS.SECONDARY_DARK})`,
                  }}
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
                <div
                  className="rounded-lg px-2 py-1.5 border"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${CSS_VARS.SECONDARY} 20%, transparent)`,
                    borderColor: CSS_VARS.SECONDARY,
                  }}
                >
                  <div
                    className="font-medium text-xs"
                    style={{ color: CSS_VARS.SECONDARY }}
                  >
                    文字数
                  </div>
                  <div
                    className="font-bold text-xs"
                    style={{ color: CSS_VARS.SECONDARY_DARK }}
                  >
                    {progress.currentCharCount.toLocaleString()} / {progress.totalCharCount.toLocaleString()}
                  </div>
                </div>
                <div
                  className="rounded-lg px-2 py-1.5 border"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 20%, transparent)`,
                    borderColor: CSS_VARS.PRIMARY,
                  }}
                >
                  <div
                    className="font-medium text-xs"
                    style={{ color: CSS_VARS.PRIMARY }}
                  >
                    文章数
                  </div>
                  <div
                    className="font-bold text-xs"
                    style={{ color: CSS_VARS.PRIMARY_DARK }}
                  >
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
          className="px-4 py-2.5 rounded-lg border font-medium shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95 text-center"
          style={{
            backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 20%, transparent)`,
            borderColor: CSS_VARS.PRIMARY,
            color: CSS_VARS.PRIMARY,
          }}
        >
          ブックマークへ
        </a>
      </div>

      {/* モバイル：ボトムバー */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-sm shadow-2xl border-t"
        style={{
          backgroundColor: `color-mix(in srgb, ${CSS_VARS.BASE} 95%, transparent)`,
          borderColor: CSS_VARS.NEUTRAL,
        }}
      >
        {/* 展開されたプログレス詳細 */}
        {mobileProgressExpanded && showProgress && (
          <div
            className="border-b px-4 py-3"
            style={{
              backgroundColor: CSS_VARS.BASE,
              borderColor: CSS_VARS.NEUTRAL,
            }}
          >
            {/* 統計情報 */}
            <div className="grid grid-cols-2 gap-2">
              <div
                className="rounded-lg px-3 py-2 border"
                style={{
                  backgroundColor: `color-mix(in srgb, ${CSS_VARS.SECONDARY} 20%, transparent)`,
                  borderColor: CSS_VARS.SECONDARY,
                }}
              >
                <div
                  className="font-medium text-xs"
                  style={{ color: CSS_VARS.SECONDARY }}
                >
                  文字数
                </div>
                <div
                  className="font-bold text-sm"
                  style={{ color: CSS_VARS.SECONDARY_DARK }}
                >
                  {progress.currentCharCount.toLocaleString()} / {progress.totalCharCount.toLocaleString()}
                </div>
              </div>
              <div
                className="rounded-lg px-3 py-2 border"
                style={{
                  backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 20%, transparent)`,
                  borderColor: CSS_VARS.PRIMARY,
                }}
              >
                <div
                  className="font-medium text-xs"
                  style={{ color: CSS_VARS.PRIMARY }}
                >
                  文章数
                </div>
                <div
                  className="font-bold text-sm"
                  style={{ color: CSS_VARS.PRIMARY_DARK }}
                >
                  {progress.currentItemIndex} / {progress.totalItems}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* メインコントロールバー */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* 左側：表示トグル + プログレスバー */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* 表示/隠す ボタン */}
              <button
                onClick={() => setDropdownAlwaysOpen(!dropdownAlwaysOpen)}
                className="px-3 py-2 rounded-lg font-medium shadow-md transition-all active:scale-95 border text-xs whitespace-nowrap"
                style={{
                  backgroundColor: dropdownAlwaysOpen ? CSS_VARS.BASE : CSS_VARS.NEUTRAL,
                  borderColor: CSS_VARS.NEUTRAL,
                  color: dropdownAlwaysOpen ? '#374151' : '#4b5563',
                }}
              >
                {dropdownAlwaysOpen ? "表示" : "隠す"}
              </button>

              {/* コンパクトプログレスバー */}
              {showProgress && (
                <button
                  onClick={() => setMobileProgressExpanded(!mobileProgressExpanded)}
                  className="flex-1 min-w-0"
                  aria-label="プログレス詳細を表示"
                >
                  <div
                    className="relative h-8 rounded-full overflow-hidden shadow-md"
                    style={{ backgroundColor: CSS_VARS.NEUTRAL }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 transition-all duration-300 ease-out flex items-center justify-center"
                      style={{
                        width: `${progress.percentage}%`,
                        background: `linear-gradient(to right, ${CSS_VARS.SECONDARY}, ${CSS_VARS.SECONDARY_DARK})`,
                      }}
                    >
                      {progress.percentage > 20 && (
                        <span className="text-white font-bold text-xs">
                          {progress.percentage}%
                        </span>
                      )}
                    </div>
                    {progress.percentage <= 20 && (
                      <span className="absolute inset-0 flex items-center justify-center text-gray-600 font-bold text-xs">
                        {progress.percentage}%
                      </span>
                    )}
                    {/* 展開インジケーター */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <svg
                        className={`w-4 h-4 text-gray-600 transition-transform ${
                          mobileProgressExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* 右側：ブックマークボタン */}
            <button
              onClick={scrollToBookmark}
              className="px-4 py-2 rounded-lg border font-medium shadow-md transition-all active:scale-95 text-xs whitespace-nowrap"
              style={{
                backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 20%, transparent)`,
                borderColor: CSS_VARS.PRIMARY,
                color: CSS_VARS.PRIMARY,
              }}
            >
              ブックマーク
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
