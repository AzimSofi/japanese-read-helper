/**
 * トップナビゲーションバーコンポーネント
 */

'use client';

import { useTextFileList } from '@/app/hooks/useTextFileList';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TopNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { files, isLoading } = useTextFileList();

  const currentFile = searchParams.get('fileName') || (files.length > 0 ? files[0] : '');
  const dropdownAlwaysOpen = searchParams.get('dropdownAlwaysOpen') === 'true';

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
    <div className="bg-gray-300 py-5 fixed top-0 left-0 w-full p-4 z-50 text-xs flex items-center justify-center gap-4">
      {/* ファイル選択ドロップダウン */}
      <div className="flex items-center gap-2">
        <label htmlFor="file-selector" className="font-medium">
          ファイルを選択:
        </label>
        {isLoading ? (
          <span className="text-gray-500">読み込み中...</span>
        ) : (
          <select
            id="file-selector"
            value={currentFile}
            onChange={(e) => handleFileChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs"
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
        className={`hover:underline outline-1 px-3 py-1 rounded ${
          dropdownAlwaysOpen ? 'bg-green-100' : 'bg-amber-50'
        }`}
      >
        {dropdownAlwaysOpen ? '折りたたみ表示' : '展開表示'}
      </button>

      {/* その他のページリンク */}
      <a href="/text-input" className="hover:underline outline-1 px-3 py-1 bg-red-50 rounded">
        入力
      </a>
      <a href="/text-input-ai" className="hover:underline outline-1 px-3 py-1 bg-red-50 rounded">
        入力-AI
      </a>
      <a href="/ocr" className="hover:underline outline-1 px-3 py-1 bg-green-50 rounded">
        OCR
      </a>
      <a href="/visual-novel" className="hover:underline outline-1 px-3 py-1 bg-blue-50 rounded">
        ビジュアルノベル
      </a>
    </div>
  );
}
