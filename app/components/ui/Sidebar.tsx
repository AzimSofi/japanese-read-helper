'use client';

import * as React from "react";
import { useReadingProgress } from "@/app/hooks/useReadingProgress";

interface SidebarProps {
  setDropdownAlwaysOpen: (state: boolean) => void;
  dropdownAlwaysOpen: boolean;
  fileName?: string | null;
}

export default function Sidebar({
  setDropdownAlwaysOpen,
  dropdownAlwaysOpen,
  fileName,
}: SidebarProps) {
  const { progress, isLoading } = useReadingProgress({
    fileName: fileName || '',
    enabled: !!fileName,
  });

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
            ? "bg-[#FFF0DD] border-[#D1D3D8] text-gray-700 hover:bg-[#FFF0DD]/80"
            : "bg-[#D1D3D8] border-[#D1D3D8] text-gray-600 hover:bg-[#D1D3D8]/80"
        }`}
      >
        {dropdownAlwaysOpen ? "表示" : "隠す"}
      </button>

      {/* プログレスインジケーター */}
      {showProgress && (
        <div className="bg-[#FFF0DD] rounded-lg shadow-lg border border-[#D1D3D8] p-3 w-64">
          <div className="space-y-2">
            {/* プログレスバー */}
            <div className="relative h-6 bg-[#D1D3D8] rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#86B0BD] to-[#6a98a8] transition-all duration-300 ease-out flex items-center justify-center"
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
              <div className="bg-[#86B0BD]/20 rounded-lg px-2 py-1.5 border border-[#86B0BD]">
                <div className="text-[#86B0BD] font-medium text-xs">文字数</div>
                <div className="text-[#6a98a8] font-bold text-xs">
                  {progress.currentCharCount.toLocaleString()} / {progress.totalCharCount.toLocaleString()}
                </div>
              </div>
              <div className="bg-[#E2A16F]/20 rounded-lg px-2 py-1.5 border border-[#E2A16F]">
                <div className="text-[#E2A16F] font-medium text-xs">文章数</div>
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
        className="px-4 py-2.5 rounded-lg bg-[#E2A16F]/20 border border-[#E2A16F] text-[#E2A16F] font-medium shadow-lg transition-all hover:bg-[#E2A16F]/30 hover:shadow-xl hover:scale-105 active:scale-95 text-center"
      >
        ブックマークへ
      </a>
    </div>
  );
}
