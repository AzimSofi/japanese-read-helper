'use client';

import * as React from "react";
import { useReadingProgress } from "@/app/hooks/useReadingProgress";
import { CSS_VARS } from "@/lib/constants";

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
  const { progress, refetch } = useReadingProgress({
    fileName: fileName || '',
    enabled: !!fileName,
  });

  // ブックマーク更新時にプログレスバーを自動更新
  React.useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const scrollToBookmark = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById("bookmark");
    if (el) {
      const offset = -window.innerHeight / 5 + el.offsetHeight / 5;
      const top = el.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const showProgress = progress && progress.totalItems > 0;

  return (
    <div className="fixed top-20 left-4 z-40 text-xs flex flex-col gap-3">
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
  );
}
