/**
 * APIから利用可能なテキストファイルのリストを取得するためのカスタムフック
 */

'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/lib/constants';

interface UseTextFileListReturn {
  files: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * publicディレクトリ内の全てのテキストファイルのリストを取得する
 *
 * @returns ファイルリスト、ローディング状態、エラー、再フェッチ関数
 */
export function useTextFileList(): UseTextFileListReturn {
  const [files, setFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start as true since we fetch on mount
  const [error, setError] = useState<Error | null>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ROUTES.LIST_TEXT_FILES);

      if (!response.ok) {
        throw new Error(`ファイルリストの取得に失敗しました: ${response.statusText}`);
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('不明なエラー');
      setError(error);
      console.error('ファイルリストの取得中にエラーが発生しました:', error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return {
    files,
    isLoading,
    error,
    refetch: fetchFiles,
  };
}
