/**
 * ファイル選択ドロップダウンコンポーネント
 */

'use client';

import { useTextFileList } from '@/app/hooks/useTextFileList';

interface FileSelectorProps {
  selectedFile: string;
  onFileChange: (fileName: string) => void;
}

/**
 * publicディレクトリ内の利用可能なテキストファイルを選択するためのドロップダウン
 */
export default function FileSelector({ selectedFile, onFileChange }: FileSelectorProps) {
  const { files, isLoading, error } = useTextFileList();

  if (isLoading) {
    return <div className="text-sm text-gray-500">読み込み中...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">ファイルリストの読み込みに失敗しました</div>;
  }

  if (files.length === 0) {
    return <div className="text-sm text-gray-500">テキストファイルが見つかりません</div>;
  }

  return (
    <div className="mb-4">
      <label htmlFor="file-selector" className="block text-sm font-medium mb-2">
        ファイルを選択:
      </label>
      <select
        id="file-selector"
        value={selectedFile}
        onChange={(e) => onFileChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {files.map((file) => (
          <option key={file} value={file}>
            {file}.txt
          </option>
        ))}
      </select>
    </div>
  );
}
