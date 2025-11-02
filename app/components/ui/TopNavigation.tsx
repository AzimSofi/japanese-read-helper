/**
 * トップナビゲーションバーコンポーネント
 */

'use client';

import { useEffect } from 'react';
import { useTextFileList } from '@/app/hooks/useTextFileList';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TopNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { files, isLoading } = useTextFileList();

  const currentFile = searchParams.get('fileName') || '';
  const dropdownAlwaysOpen = searchParams.get('dropdownAlwaysOpen') === 'true';

  // Set default file in URL when missing (client-side only to avoid hydration mismatch)
  useEffect(() => {
    if (!searchParams.get('fileName') && files.length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('fileName', files[0]);
      router.push(`/?${params.toString()}`);
    }
  }, [files, searchParams, router]);

  const handleFileChange = (fileName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('fileName', fileName);
    router.push(`/?${params.toString()}`);
  };

  const toggleDropdownState = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('dropdownAlwaysOpen', (!dropdownAlwaysOpen).toString());
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="bg-[#FFF0DD]/95 backdrop-blur-sm py-3 fixed top-0 left-0 w-full px-6 z-50 text-xs shadow-md border-b border-[#D1D3D8]">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        {/* ファイル選択ドロップダウン */}
        <div className="flex items-center gap-2.5 bg-[#D1D3D8] px-4 py-2 rounded-lg shadow-sm border border-[#D1D3D8]">
          <label htmlFor="file-selector" className="font-medium text-gray-700">
            ファイル:
          </label>
          {isLoading ? (
            <span className="text-gray-400">読み込み中...</span>
          ) : (
            <select
              id="file-selector"
              value={currentFile}
              onChange={(e) => handleFileChange(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#86B0BD] focus:border-transparent bg-white text-xs shadow-sm transition-all hover:border-gray-400"
            >
              {files.map((file) => (
                <option key={file} value={file}>
                  {file}.txt
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 表示トグルボタン */}
        <button
          onClick={toggleDropdownState}
          className={`px-4 py-2 rounded-lg font-medium shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95 border ${
            dropdownAlwaysOpen
              ? 'bg-[#86B0BD]/20 border-[#86B0BD] text-[#86B0BD] hover:bg-[#86B0BD]/30'
              : 'bg-[#E2A16F]/20 border-[#E2A16F] text-[#E2A16F] hover:bg-[#E2A16F]/30'
          }`}
        >
          {dropdownAlwaysOpen ? '折りたたみ表示' : '展開表示'}
        </button>

        {/* ページナビゲーション */}
        <div className="flex items-center gap-2">
          <a
            href="/text-input"
            className="px-4 py-2 rounded-lg bg-[#E2A16F]/20 border border-[#E2A16F] text-[#E2A16F] font-medium shadow-sm transition-all hover:bg-[#E2A16F]/30 hover:shadow-md hover:scale-105 active:scale-95"
          >
            入力
          </a>
          <a
            href="/text-input-ai"
            className="px-4 py-2 rounded-lg bg-[#E2A16F]/20 border border-[#E2A16F] text-[#E2A16F] font-medium shadow-sm transition-all hover:bg-[#E2A16F]/30 hover:shadow-md hover:scale-105 active:scale-95"
          >
            入力-AI
          </a>
          <a
            href="/ocr"
            className="px-4 py-2 rounded-lg bg-[#86B0BD]/20 border border-[#86B0BD] text-[#86B0BD] font-medium shadow-sm transition-all hover:bg-[#86B0BD]/30 hover:shadow-md hover:scale-105 active:scale-95"
          >
            OCR
          </a>
          <a
            href="/visual-novel"
            className="px-4 py-2 rounded-lg bg-[#86B0BD]/20 border border-[#86B0BD] text-[#86B0BD] font-medium shadow-sm transition-all hover:bg-[#86B0BD]/30 hover:shadow-md hover:scale-105 active:scale-95"
          >
            ビジュアルノベル
          </a>
        </div>
      </div>
    </div>
  );
}
