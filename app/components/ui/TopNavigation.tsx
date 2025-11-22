/**
 * トップナビゲーションバーコンポーネント
 * サブディレクトリ対応：ディレクトリとファイルの2段階選択UI
 * モバイル対応：ハンバーガーメニュー実装
 */

'use client';

import { useEffect, useState } from 'react';
import { useTextFileList } from '@/app/hooks/useTextFileList';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CSS_VARS, STORAGE_KEYS } from '@/lib/constants';

export default function TopNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { directories, filesByDirectory, isLoading } = useTextFileList();

  const currentDirectory = searchParams.get('directory') || (directories.length > 0 ? directories[0] : '');
  const currentFile = searchParams.get('fileName') || '';
  const dropdownAlwaysOpen = searchParams.get('dropdownAlwaysOpen') === 'true';

  // 現在のディレクトリのファイルリストを取得
  const filesInCurrentDirectory = currentDirectory ? (filesByDirectory[currentDirectory] || []) : [];

  // ファイル選択UIを表示するページかどうか
  const showFileSelector = pathname === '/' || pathname === '/book-reader';

  const [showFurigana, setShowFurigana] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // localStorageから振り仮名表示設定を読み込み
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.FURIGANA_ENABLED);
      if (stored !== null) {
        setShowFurigana(stored === 'true');
      }
    }
  }, []);

  // モバイルメニューが開いているときはスクロールを防止
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // 振り仮名表示をトグル（localStorageに保存 + カスタムイベント発火）
  const toggleFurigana = () => {
    const newValue = !showFurigana;
    setShowFurigana(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.FURIGANA_ENABLED, newValue.toString());
      // カスタムイベントを発火して他のコンポーネントに通知
      window.dispatchEvent(new CustomEvent('furiganaChanged', { detail: { enabled: newValue } }));
    }
  };

  // Set default directory and file in URL when missing (client-side only to avoid hydration mismatch)
  useEffect(() => {
    if (!searchParams.get('directory') && directories.length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('directory', directories[0]);

      // 最初のディレクトリの最初のファイルを設定
      const firstDirFiles = filesByDirectory[directories[0]] || [];
      if (firstDirFiles.length > 0 && !searchParams.get('fileName')) {
        params.set('fileName', firstDirFiles[0]);
      }

      router.push(`${pathname}?${params.toString()}`);
    } else if (!searchParams.get('fileName') && filesInCurrentDirectory.length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('fileName', filesInCurrentDirectory[0]);
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [directories, filesByDirectory, filesInCurrentDirectory, searchParams, router, pathname]);

  const handleDirectoryChange = (directory: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('directory', directory);

    // ディレクトリ変更時、最初のファイルを自動選択
    const filesInDir = filesByDirectory[directory] || [];
    if (filesInDir.length > 0) {
      params.set('fileName', filesInDir[0]);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleFileChange = (fileName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('fileName', fileName);
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleDropdownState = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('dropdownAlwaysOpen', (!dropdownAlwaysOpen).toString());
    router.push(`/?${params.toString()}`);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* トップナビゲーションバー */}
      <div
        className="backdrop-blur-sm py-3 fixed top-0 left-0 w-full px-4 md:px-6 z-50 text-xs shadow-md border-b"
        style={{
          backgroundColor: `color-mix(in srgb, ${CSS_VARS.BASE} 95%, transparent)`,
          borderColor: CSS_VARS.NEUTRAL,
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between md:justify-center gap-3">
          {/* モバイル：ハンバーガーメニューアイコン */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="メニューを開く"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          {/* デスクトップ：すべてのナビゲーション要素 */}
          <div className="hidden md:flex items-center justify-center gap-3 flex-wrap">
            {/* ディレクトリとファイルの2段階選択（/と/book-readerのみ表示） */}
            {showFileSelector && (
              <>
                {/* ディレクトリ選択ドロップダウン */}
                <div
                  className="flex items-center gap-2.5 px-4 py-2 rounded-lg shadow-sm border"
                  style={{
                    backgroundColor: CSS_VARS.NEUTRAL,
                    borderColor: CSS_VARS.NEUTRAL,
                  }}
                >
                  <label htmlFor="directory-selector" className="font-medium text-gray-700">
                    ディレクトリ:
                  </label>
                  {isLoading ? (
                    <span className="text-gray-400">読み込み中...</span>
                  ) : (
                    <select
                      id="directory-selector"
                      value={currentDirectory}
                      onChange={(e) => handleDirectoryChange(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white text-xs shadow-sm transition-all hover:border-gray-400"
                      style={{
                        '--tw-ring-color': CSS_VARS.PRIMARY,
                      } as React.CSSProperties}
                    >
                      {directories.map((dir) => (
                        <option key={dir} value={dir}>
                          {dir}/
                        </option>
                      ))}
                    </select>
                  )}
                </div>

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
                      {filesInCurrentDirectory.map((file) => (
                        <option key={file} value={file}>
                          {file}.txt
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </>
            )}

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

            {/* 振り仮名トグルボタン */}
            <button
              onClick={toggleFurigana}
              className="px-4 py-2 rounded-lg font-medium shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95 border"
              style={{
                backgroundColor: showFurigana
                  ? `color-mix(in srgb, ${CSS_VARS.SECONDARY} 20%, transparent)`
                  : CSS_VARS.NEUTRAL,
                borderColor: showFurigana ? CSS_VARS.SECONDARY : CSS_VARS.NEUTRAL,
                color: showFurigana ? CSS_VARS.SECONDARY : '#6b7280',
              }}
            >
              {showFurigana ? '振り仮名 ON' : '振り仮名 OFF'}
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
              <a
                href="/book-reader"
                className="px-4 py-2 rounded-lg border font-medium shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 20%, transparent)`,
                  borderColor: CSS_VARS.PRIMARY,
                  color: CSS_VARS.PRIMARY,
                }}
              >
                読書
              </a>
            </div>
          </div>

          {/* モバイル：現在のファイル名表示 */}
          {showFileSelector && (
            <div className="md:hidden text-xs font-medium truncate max-w-[180px]">
              {currentFile || 'ファイル未選択'}
            </div>
          )}
        </div>
      </div>

      {/* モバイル：スライドインメニュー */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* 背景オーバーレイ */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={closeMobileMenu}
        />

        {/* メニュードロワー */}
        <div
          className={`absolute top-0 left-0 h-full w-80 max-w-[85vw] shadow-2xl transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            backgroundColor: CSS_VARS.BASE,
          }}
        >
          {/* メニューヘッダー */}
          <div
            className="flex items-center justify-between p-4 border-b"
            style={{
              borderColor: CSS_VARS.NEUTRAL,
            }}
          >
            <h2 className="text-lg font-semibold">メニュー</h2>
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="メニューを閉じる"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* メニューコンテンツ */}
          <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">
            <div className="space-y-4">
              {/* ファイル選択セクション */}
              {showFileSelector && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">ファイル選択</h3>

                  {/* ディレクトリ選択 */}
                  <div className="space-y-1.5">
                    <label htmlFor="mobile-directory-selector" className="text-xs font-medium text-gray-600">
                      ディレクトリ
                    </label>
                    {isLoading ? (
                      <span className="text-xs text-gray-400">読み込み中...</span>
                    ) : (
                      <select
                        id="mobile-directory-selector"
                        value={currentDirectory}
                        onChange={(e) => {
                          handleDirectoryChange(e.target.value);
                          closeMobileMenu();
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white text-sm shadow-sm"
                        style={{
                          '--tw-ring-color': CSS_VARS.PRIMARY,
                        } as React.CSSProperties}
                      >
                        {directories.map((dir) => (
                          <option key={dir} value={dir}>
                            {dir}/
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* ファイル選択 */}
                  <div className="space-y-1.5">
                    <label htmlFor="mobile-file-selector" className="text-xs font-medium text-gray-600">
                      ファイル
                    </label>
                    {isLoading ? (
                      <span className="text-xs text-gray-400">読み込み中...</span>
                    ) : (
                      <select
                        id="mobile-file-selector"
                        value={currentFile}
                        onChange={(e) => {
                          handleFileChange(e.target.value);
                          closeMobileMenu();
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white text-sm shadow-sm"
                        style={{
                          '--tw-ring-color': CSS_VARS.SECONDARY,
                        } as React.CSSProperties}
                      >
                        {filesInCurrentDirectory.map((file) => (
                          <option key={file} value={file}>
                            {file}.txt
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* 表示設定セクション */}
              <div className="space-y-3 pt-4 border-t" style={{ borderColor: CSS_VARS.NEUTRAL }}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">表示設定</h3>

                {/* 表示トグル */}
                <button
                  onClick={() => {
                    toggleDropdownState();
                    closeMobileMenu();
                  }}
                  className="w-full px-4 py-3 rounded-lg font-medium shadow-sm transition-all active:scale-95 border text-sm"
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

                {/* 振り仮名トグル */}
                <button
                  onClick={() => {
                    toggleFurigana();
                    closeMobileMenu();
                  }}
                  className="w-full px-4 py-3 rounded-lg font-medium shadow-sm transition-all active:scale-95 border text-sm"
                  style={{
                    backgroundColor: showFurigana
                      ? `color-mix(in srgb, ${CSS_VARS.SECONDARY} 20%, transparent)`
                      : CSS_VARS.NEUTRAL,
                    borderColor: showFurigana ? CSS_VARS.SECONDARY : CSS_VARS.NEUTRAL,
                    color: showFurigana ? CSS_VARS.SECONDARY : '#6b7280',
                  }}
                >
                  {showFurigana ? '振り仮名 ON' : '振り仮名 OFF'}
                </button>
              </div>

              {/* ページナビゲーションセクション */}
              <div className="space-y-3 pt-4 border-t" style={{ borderColor: CSS_VARS.NEUTRAL }}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">ページ</h3>

                <a
                  href="/text-input"
                  className="block w-full px-4 py-3 rounded-lg border font-medium shadow-sm transition-all active:scale-95 text-center text-sm"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 20%, transparent)`,
                    borderColor: CSS_VARS.PRIMARY,
                    color: CSS_VARS.PRIMARY,
                  }}
                  onClick={closeMobileMenu}
                >
                  入力
                </a>
                <a
                  href="/text-input-ai"
                  className="block w-full px-4 py-3 rounded-lg border font-medium shadow-sm transition-all active:scale-95 text-center text-sm"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 20%, transparent)`,
                    borderColor: CSS_VARS.PRIMARY,
                    color: CSS_VARS.PRIMARY,
                  }}
                  onClick={closeMobileMenu}
                >
                  入力-AI
                </a>
                <a
                  href="/ocr"
                  className="block w-full px-4 py-3 rounded-lg border font-medium shadow-sm transition-all active:scale-95 text-center text-sm"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${CSS_VARS.SECONDARY} 20%, transparent)`,
                    borderColor: CSS_VARS.SECONDARY,
                    color: CSS_VARS.SECONDARY,
                  }}
                  onClick={closeMobileMenu}
                >
                  OCR
                </a>
                <a
                  href="/visual-novel"
                  className="block w-full px-4 py-3 rounded-lg border font-medium shadow-sm transition-all active:scale-95 text-center text-sm"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${CSS_VARS.SECONDARY} 20%, transparent)`,
                    borderColor: CSS_VARS.SECONDARY,
                    color: CSS_VARS.SECONDARY,
                  }}
                  onClick={closeMobileMenu}
                >
                  ビジュアルノベル
                </a>
                <a
                  href="/book-reader"
                  className="block w-full px-4 py-3 rounded-lg border font-medium shadow-sm transition-all active:scale-95 text-center text-sm"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 20%, transparent)`,
                    borderColor: CSS_VARS.PRIMARY,
                    color: CSS_VARS.PRIMARY,
                  }}
                  onClick={closeMobileMenu}
                >
                  読書
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
