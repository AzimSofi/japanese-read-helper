/**
 * トップナビゲーションバーコンポーネント
 */

'use client';

import { useEffect } from 'react';
import { useTextFileList } from '@/app/hooks/useTextFileList';
import { useRouter, useSearchParams } from 'next/navigation';
import { CSS_VARS } from '@/lib/constants';

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
    <div
      className="backdrop-blur-sm py-3 fixed top-0 left-0 w-full px-6 z-50 text-xs shadow-md border-b"
      style={{
        backgroundColor: `color-mix(in srgb, ${CSS_VARS.BASE} 95%, transparent)`,
        borderColor: CSS_VARS.NEUTRAL,
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        {/* ファイル選択ドロップダウン */}
        <div
          className="flex items-center gap-2.5 px-4 py-2 rounded-lg shadow-sm border"
          style={{
            backgroundColor: CSS_VARS.NEUTRAL,
            borderColor: CSS_VARS.NEUTRAL,
          }}
        >
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
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white text-xs shadow-sm transition-all hover:border-gray-400"
              style={{
                '--tw-ring-color': CSS_VARS.SECONDARY,
              } as React.CSSProperties}
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
          className="px-4 py-2 rounded-lg font-medium shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95 border"
          style={{
            backgroundColor: dropdownAlwaysOpen
              ? `color-mix(in srgb, ${CSS_VARS.SECONDARY} 20%, transparent)`
              : `color-mix(in srgb, ${CSS_VARS.PRIMARY} 20%, transparent)`,
            borderColor: dropdownAlwaysOpen ? CSS_VARS.SECONDARY : CSS_VARS.PRIMARY,
            color: dropdownAlwaysOpen ? CSS_VARS.SECONDARY : CSS_VARS.PRIMARY,
          }}
        >
          {dropdownAlwaysOpen ? '折りたたみ表示' : '展開表示'}
        </button>

        {/* ページナビゲーション */}
        <div className="flex items-center gap-2">
          <a
            href="/text-input"
            className="px-4 py-2 rounded-lg border font-medium shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95"
            style={{
              backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 20%, transparent)`,
              borderColor: CSS_VARS.PRIMARY,
              color: CSS_VARS.PRIMARY,
            }}
          >
            入力
          </a>
          <a
            href="/text-input-ai"
            className="px-4 py-2 rounded-lg border font-medium shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95"
            style={{
              backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 20%, transparent)`,
              borderColor: CSS_VARS.PRIMARY,
              color: CSS_VARS.PRIMARY,
            }}
          >
            入力-AI
          </a>
          <a
            href="/ocr"
            className="px-4 py-2 rounded-lg border font-medium shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95"
            style={{
              backgroundColor: `color-mix(in srgb, ${CSS_VARS.SECONDARY} 20%, transparent)`,
              borderColor: CSS_VARS.SECONDARY,
              color: CSS_VARS.SECONDARY,
            }}
          >
            OCR
          </a>
          <a
            href="/visual-novel"
            className="px-4 py-2 rounded-lg border font-medium shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95"
            style={{
              backgroundColor: `color-mix(in srgb, ${CSS_VARS.SECONDARY} 20%, transparent)`,
              borderColor: CSS_VARS.SECONDARY,
              color: CSS_VARS.SECONDARY,
            }}
          >
            ビジュアルノベル
          </a>
        </div>
      </div>
    </div>
  );
}
