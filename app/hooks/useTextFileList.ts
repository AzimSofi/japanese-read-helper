/**
 * APIから利用可能なテキストファイルのリストを取得するためのカスタムフック
 * サブディレクトリ対応：ディレクトリ構造を含むファイルリストを返す
 */

'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/lib/constants';
import type { TextFileListResponse } from '@/lib/types';

interface UseTextFileListReturn {
  directories: string[];
  filesByDirectory: Record<string, string[]>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * publicディレクトリ内の全てのテキストファイルを構造化データとして取得する
 *
 * @returns ディレクトリリスト、ディレクトリ別ファイルリスト、ローディング状態、エラー、再フェッチ関数
 */
export function useTextFileList(): UseTextFileListReturn {
  const [directories, setDirectories] = useState<string[]>([]);
  const [filesByDirectory, setFilesByDirectory] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ROUTES.LIST_TEXT_FILES);

      if (!response.ok) {
        throw new Error(`ファイルリストの取得に失敗しました: ${response.statusText}`);
      }

      const data: TextFileListResponse = await response.json();
      setDirectories(data.directories || []);
      setFilesByDirectory(data.filesByDirectory || {});
    } catch (err) {
      const error = err instanceof Error ? err : new Error('不明なエラー');
      setError(error);
      console.error('ファイルリストの取得中にエラーが発生しました:', error);
      setDirectories([]);
      setFilesByDirectory({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return {
    directories,
    filesByDirectory,
    isLoading,
    error,
    refetch: fetchFiles,
  };
}
