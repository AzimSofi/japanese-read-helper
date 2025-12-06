/**
 * Text-to-Speech機能のためのカスタムフック
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_ROUTES, STORAGE_KEYS, TTS_CONFIG, type TTSVoiceGender } from '@/lib/constants';
import type { TTSRequest, TTSResponse } from '@/lib/types';
import { cleanTextForTTS } from '@/lib/utils/ttsTextCleaner';

interface UseTTSOptions {
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onError?: (error: Error) => void;
}

interface UseTTSReturn {
  // 状態
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  error: Error | null;
  // 設定
  speed: number;
  voiceGender: TTSVoiceGender;
  // アクション
  play: (text: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  setVoiceGender: (gender: TTSVoiceGender) => void;
}

/**
 * TTS再生を管理するフック
 */
export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { onPlayStart, onPlayEnd, onError } = options;

  // 状態
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [speed, setSpeedState] = useState<number>(TTS_CONFIG.DEFAULT_SPEED);
  const [voiceGender, setVoiceGenderState] = useState<TTSVoiceGender>(TTS_CONFIG.DEFAULT_VOICE_GENDER);

  // Audio要素への参照
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTextRef = useRef<string>('');

  // localStorageから設定を読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedSpeed = localStorage.getItem(STORAGE_KEYS.TTS_SPEED);
      if (savedSpeed) {
        const parsedSpeed = parseFloat(savedSpeed);
        if (!isNaN(parsedSpeed) && parsedSpeed >= TTS_CONFIG.MIN_SPEED && parsedSpeed <= TTS_CONFIG.MAX_SPEED) {
          setSpeedState(parsedSpeed);
        }
      }

      const savedGender = localStorage.getItem(STORAGE_KEYS.TTS_VOICE_GENDER);
      if (savedGender === 'MALE' || savedGender === 'FEMALE') {
        setVoiceGenderState(savedGender);
      }
    } catch (e) {
      console.error('TTS設定の読み込みに失敗しました:', e);
    }
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // 速度を設定
  const setSpeed = useCallback((newSpeed: number) => {
    const clampedSpeed = Math.max(TTS_CONFIG.MIN_SPEED, Math.min(TTS_CONFIG.MAX_SPEED, newSpeed));
    setSpeedState(clampedSpeed);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TTS_SPEED, clampedSpeed.toString());
    }

    // 再生中の場合は再生速度を更新
    if (audioRef.current) {
      audioRef.current.playbackRate = clampedSpeed;
    }
  }, []);

  // 音声性別を設定
  const setVoiceGender = useCallback((gender: TTSVoiceGender) => {
    setVoiceGenderState(gender);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TTS_VOICE_GENDER, gender);
    }
  }, []);

  // 再生
  const play = useCallback(async (text: string) => {
    if (!text) {
      // テキストが空の場合は再生終了として扱う（連続再生で次へスキップ）
      onPlayEnd?.();
      return;
    }

    // クリーニング後のテキストをチェック（画像のみの場合など）
    const cleanedText = cleanTextForTTS(text);
    if (!cleanedText) {
      // クリーニング後に空の場合は再生終了として扱う
      onPlayEnd?.();
      return;
    }

    // 既存の再生を停止
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    setIsLoading(true);
    setError(null);
    currentTextRef.current = text;

    try {
      const requestData: TTSRequest = {
        text,
        speed,
        voiceGender,
      };

      const response = await fetch(API_ROUTES.TTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`TTS生成に失敗しました: ${response.statusText}`);
      }

      const data: TTSResponse = await response.json();

      if (!data.audioContent) {
        throw new Error(data.message || '音声データが空です');
      }

      // 音声を再生
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audio.playbackRate = speed;
      audioRef.current = audio;

      audio.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
        onPlayStart?.();
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        onPlayEnd?.();
      };

      audio.onerror = () => {
        const err = new Error('音声の再生に失敗しました');
        setError(err);
        setIsPlaying(false);
        setIsPaused(false);
        onError?.(err);
      };

      await audio.play();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('不明なエラー');
      setError(error);
      setIsPlaying(false);
      setIsPaused(false);
      onError?.(error);
      console.error('TTS再生中にエラーが発生しました:', error);
    } finally {
      setIsLoading(false);
    }
  }, [speed, voiceGender, onPlayStart, onPlayEnd, onError]);

  // 一時停止
  const pause = useCallback(() => {
    if (audioRef.current && isPlaying && !isPaused) {
      audioRef.current.pause();
      setIsPaused(true);
    }
  }, [isPlaying, isPaused]);

  // 再開
  const resume = useCallback(() => {
    if (audioRef.current && isPaused) {
      audioRef.current.play();
      setIsPaused(false);
    }
  }, [isPaused]);

  // 停止
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    currentTextRef.current = '';
  }, []);

  return {
    isPlaying,
    isPaused,
    isLoading,
    error,
    speed,
    voiceGender,
    play,
    pause,
    resume,
    stop,
    setSpeed,
    setVoiceGender,
  };
}

/**
 * 連続再生を管理するフック（オーディオブック機能）
 */
interface UseTTSPlayerOptions {
  items: string[];
  fileName?: string;
  directory?: string;
  onItemChange?: (index: number) => void;
}

interface UseTTSPlayerReturn extends Omit<UseTTSReturn, 'play'> {
  currentIndex: number;
  totalItems: number;
  playItem: (index: number) => Promise<void>;
  /** 指定インデックスから連続再生を開始 */
  playItemContinuous: (index: number) => void;
  playAll: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
}

/**
 * 連続再生を管理するフック
 */
export function useTTSPlayer({
  items,
  fileName,
  directory,
  onItemChange,
}: UseTTSPlayerOptions): UseTTSPlayerReturn {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const tts = useTTS({
    onPlayEnd: () => {
      // 自動再生中なら次へ
      if (isAutoPlaying && currentIndex < items.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        onItemChange?.(nextIndex);
      } else {
        setIsAutoPlaying(false);
      }
    },
  });

  // currentIndexが変更されたら再生
  useEffect(() => {
    if (isAutoPlaying && currentIndex >= 0 && currentIndex < items.length) {
      tts.play(items[currentIndex]);
    }
  }, [currentIndex, isAutoPlaying]);

  // 再生位置を保存
  useEffect(() => {
    if (typeof window === 'undefined' || !fileName || currentIndex < 0) return;

    const key = `${STORAGE_KEYS.TTS_LAST_POSITION}_${fileName}_${directory || ''}`;
    localStorage.setItem(key, JSON.stringify({
      itemIndex: currentIndex,
      timestamp: Date.now(),
    }));
  }, [currentIndex, fileName, directory]);

  const playItem = useCallback(async (index: number) => {
    if (index < 0 || index >= items.length) return;

    setCurrentIndex(index);
    setIsAutoPlaying(false);
    onItemChange?.(index);
    await tts.play(items[index]);
  }, [items, tts, onItemChange]);

  // 指定インデックスから連続再生を開始
  const playItemContinuous = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return;

    setCurrentIndex(index);
    setIsAutoPlaying(true);  // 自動再生をON
    onItemChange?.(index);
    // useEffectでcurrentIndexの変更を検知して再生開始
  }, [items.length, onItemChange]);

  const playAll = useCallback(async () => {
    if (items.length === 0) return;

    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    setCurrentIndex(startIndex);
    setIsAutoPlaying(true);
    onItemChange?.(startIndex);
  }, [items.length, currentIndex, onItemChange]);

  const next = useCallback(async () => {
    if (currentIndex < items.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      onItemChange?.(nextIndex);
      await tts.play(items[nextIndex]);
    }
  }, [currentIndex, items, tts, onItemChange]);

  const previous = useCallback(async () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      onItemChange?.(prevIndex);
      await tts.play(items[prevIndex]);
    }
  }, [currentIndex, items, tts, onItemChange]);

  const stop = useCallback(() => {
    tts.stop();
    setIsAutoPlaying(false);
  }, [tts]);

  return {
    ...tts,
    stop,
    currentIndex,
    totalItems: items.length,
    playItem,
    playItemContinuous,
    playAll,
    next,
    previous,
  };
}
