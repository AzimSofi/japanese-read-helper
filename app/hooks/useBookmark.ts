/**
 * ブックマーク機能のためのカスタムフック
 */

'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/lib/constants';
import type { BookmarkResponse, BookmarkRequest } from '@/lib/types';

interface UseBookmarkOptions {
  fileName: string;
  enabled?: boolean;
}

interface UseBookmarkReturn {
  bookmarkText: string;
  isLoading: boolean;
  error: Error | null;
  updateBookmark: (content: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * テキストファイルのブックマーク状態を管理する
 *
 * @param options - 設定オプション
 * @param options.fileName - テキストファイルの名前
 * @param options.enabled - 自動的にフェッチするかどうか (デフォルト: true)
 * @returns ブックマークテキスト、ローディング状態、エラー、更新関数、再フェッチ関数
 */
export function useBookmark({
  fileName,
  enabled = true,
}: UseBookmarkOptions): UseBookmarkReturn {
  const [bookmarkText, setBookmarkText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBookmark = async () => {
    if (!fileName) {
      setBookmarkText('');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_ROUTES.READ_BOOKMARK}?fileName=${fileName}`
      );

      if (!response.ok) {
        throw new Error(`ブックマークの取得に失敗しました: ${response.statusText}`);
      }

      const data: BookmarkResponse = await response.json();
      setBookmarkText(data.text || '');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('不明なエラー');
      setError(error);
      console.error('ブックマークの取得中にエラーが発生しました:', error);
      setBookmarkText('');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBookmark = async (content: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const requestData: BookmarkRequest = {
        target: fileName,
        content: content,
      };

      const response = await fetch(API_ROUTES.WRITE_BOOKMARK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`ブックマークの更新に失敗しました: ${response.statusText}`);
      }

      // ローカル状態を更新
      setBookmarkText(content);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('不明なエラー');
      setError(error);
      console.error('ブックマークの更新中にエラーが発生しました:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchBookmark();
    }
  }, [fileName, enabled]);

  return {
    bookmarkText,
    isLoading,
    error,
    updateBookmark,
    refetch: fetchBookmark,
  };
}
