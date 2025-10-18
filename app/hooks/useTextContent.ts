/**
 * APIからテキストコンテンツを取得するためのカスタムフック
 */

'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/lib/constants';
import type { TextResponse } from '@/lib/types';

interface UseTextContentOptions {
  fileName: string;
  enabled?: boolean;
}

interface UseTextContentReturn {
  text: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * publicディレクトリからテキストコンテンツを取得する
 *
 * @param options - 設定オプション
 * @param options.fileName - 取得するテキストファイルの名前
 * @param options.enabled - 自動的にフェッチするかどうか (デフォルト: true)
 * @returns テキストコンテンツ、ローディング状態、エラー、再フェッチ関数
 */
export function useTextContent({
  fileName,
  enabled = true,
}: UseTextContentOptions): UseTextContentReturn {
  const [text, setText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchText = async () => {
    if (!fileName) {
      setText('');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_ROUTES.READ_TEXT}?fileName=${fileName}`
      );

      if (!response.ok) {
        throw new Error(`テキストの取得に失敗しました: ${response.statusText}`);
      }

      const data: TextResponse = await response.json();
      setText(data.text || '');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('不明なエラー');
      setError(error);
      console.error('テキストコンテンツの取得中にエラーが発生しました:', error);
      setText('');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchText();
    }
  }, [fileName, enabled]);

  return {
    text,
    isLoading,
    error,
    refetch: fetchText,
  };
}
