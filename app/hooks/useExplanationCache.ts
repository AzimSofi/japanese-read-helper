/**
 * 文説明のキャッシュ管理のためのカスタムフック
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, EXPLANATION_CONFIG, DEFAULT_EXPLANATION_MODE, EXPLANATION_MODES } from '@/lib/constants';
import type { ExplanationCache, CachedExplanation } from '@/lib/types';
import type { ExplanationMode } from '@/lib/constants';

interface UseExplanationCacheReturn {
  getCache: (fileName: string, sentence: string, mode: ExplanationMode) => CachedExplanation | null;
  setCache: (fileName: string, sentence: string, explanation: string, contextSize: number, mode: ExplanationMode) => void;
  clearCache: () => void;
  getCacheSize: () => number;
  contextSize: number;
  setContextSize: (size: number) => void;
  mode: ExplanationMode;
  setMode: (mode: ExplanationMode) => void;
  contextSizeExpanded: boolean;
  setContextSizeExpanded: (expanded: boolean) => void;
}

/**
 * 文説明のキャッシュを管理する
 * localStorageを使用してキャッシュを永続化
 */
export function useExplanationCache(): UseExplanationCacheReturn {
  const [cache, setCacheState] = useState<ExplanationCache>({});
  const [contextSize, setContextSizeState] = useState<number>(
    EXPLANATION_CONFIG.DEFAULT_CONTEXT_SIZE
  );
  const [mode, setModeState] = useState<ExplanationMode>(DEFAULT_EXPLANATION_MODE);
  const [contextSizeExpanded, setContextSizeExpandedState] = useState<boolean>(
    EXPLANATION_CONFIG.CONTEXT_SIZE_EXPANDED_DEFAULT
  );

  // localStorageからキャッシュを読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedCache = localStorage.getItem(STORAGE_KEYS.EXPLANATION_CACHE);
      if (storedCache) {
        setCacheState(JSON.parse(storedCache));
      }

      const storedContextSize = localStorage.getItem(
        STORAGE_KEYS.EXPLANATION_CONTEXT_SIZE
      );
      if (storedContextSize) {
        const size = parseInt(storedContextSize, 10);
        if (!isNaN(size)) {
          setContextSizeState(size);
        }
      }

      const storedMode = localStorage.getItem(STORAGE_KEYS.EXPLANATION_MODE);
      if (storedMode && Object.values(EXPLANATION_MODES).includes(storedMode as ExplanationMode)) {
        setModeState(storedMode as ExplanationMode);
      }

      const storedExpanded = localStorage.getItem(STORAGE_KEYS.CONTEXT_SIZE_EXPANDED);
      if (storedExpanded !== null) {
        setContextSizeExpandedState(storedExpanded === 'true');
      }
    } catch (error) {
      console.error('キャッシュの読み込み中にエラーが発生しました:', error);
    }
  }, []);

  // キャッシュキーを生成（モード別にキャッシュを分離）
  const generateCacheKey = useCallback((fileName: string, sentence: string, mode: ExplanationMode): string => {
    // 文をハッシュ化（簡易版）
    const hash = sentence.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    return `${EXPLANATION_CONFIG.CACHE_KEY_PREFIX}${fileName}_${mode}_${hash}`;
  }, []);

  // キャッシュから取得
  const getCache = useCallback(
    (fileName: string, sentence: string, mode: ExplanationMode): CachedExplanation | null => {
      const key = generateCacheKey(fileName, sentence, mode);
      return cache[key] || null;
    },
    [cache, generateCacheKey]
  );

  // キャッシュに保存
  const setCache = useCallback(
    (fileName: string, sentence: string, explanation: string, contextSize: number, mode: ExplanationMode) => {
      const key = generateCacheKey(fileName, sentence, mode);
      const newCache: ExplanationCache = {
        ...cache,
        [key]: {
          sentence,
          explanation,
          contextSize,
          mode,
          timestamp: Date.now(),
        },
      };

      setCacheState(newCache);

      // localStorageに保存
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            STORAGE_KEYS.EXPLANATION_CACHE,
            JSON.stringify(newCache)
          );
        } catch (error) {
          console.error('キャッシュの保存中にエラーが発生しました:', error);
        }
      }
    },
    [cache, generateCacheKey]
  );

  // キャッシュをクリア
  const clearCache = useCallback(() => {
    setCacheState({});
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.EXPLANATION_CACHE);
    }
  }, []);

  // キャッシュサイズを取得
  const getCacheSize = useCallback((): number => {
    return Object.keys(cache).length;
  }, [cache]);

  // コンテキストサイズを設定
  const setContextSize = useCallback((size: number) => {
    const clampedSize = Math.max(
      EXPLANATION_CONFIG.MIN_CONTEXT_SIZE,
      Math.min(EXPLANATION_CONFIG.MAX_CONTEXT_SIZE, size)
    );
    setContextSizeState(clampedSize);

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEYS.EXPLANATION_CONTEXT_SIZE,
        clampedSize.toString()
      );
    }
  }, []);

  // 説明モードを設定
  const setMode = useCallback((newMode: ExplanationMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.EXPLANATION_MODE, newMode);
    }
  }, []);

  // コンテキストサイズの展開状態を設定
  const setContextSizeExpanded = useCallback((expanded: boolean) => {
    setContextSizeExpandedState(expanded);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CONTEXT_SIZE_EXPANDED, expanded.toString());
    }
  }, []);

  return {
    getCache,
    setCache,
    clearCache,
    getCacheSize,
    contextSize,
    setContextSize,
    mode,
    setMode,
    contextSizeExpanded,
    setContextSizeExpanded,
  };
}
