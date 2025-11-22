/**
 * ファイル選択ドロップダウンコンポーネント
 * サブディレクトリ対応：ディレクトリ別にグループ化して表示
 */

'use client';

import { useTextFileList } from '@/app/hooks/useTextFileList';

interface FileSelectorProps {
  selectedFile: string; // "directory/filename" 形式
  onFileChange: (fullPath: string) => void;
}

/**
 * publicディレクトリ内の利用可能なテキストファイルを選択するためのドロップダウン
 * ファイルはディレクトリ別にグループ化されて表示される
 */
export default function FileSelector({ selectedFile, onFileChange }: FileSelectorProps) {
  const { directories, filesByDirectory, isLoading, error } = useTextFileList();

  if (isLoading) {
    return <div className="text-sm text-gray-500">読み込み中...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">ファイルリストの読み込みに失敗しました</div>;
  }

  if (directories.length === 0) {
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
        {directories.map((dir) => (
          <optgroup key={dir} label={`${dir}/`}>
            {(filesByDirectory[dir] || []).map((file) => {
              const fullPath = `${dir}/${file}`;
              return (
                <option key={fullPath} value={fullPath}>
                  {file}.txt
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
