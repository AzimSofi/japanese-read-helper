'use client';

import { CSS_VARS, TTS_CONFIG, type TTSVoiceGender } from '@/lib/constants';
import { useCallback, useState } from 'react';

/**
 * useTTSPlayerの返り値型（page.tsxから渡される）
 */
interface TTSPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentIndex: number;
  totalItems: number;
  speed: number;
  voiceGender: TTSVoiceGender;
  playAll: () => Promise<void>;
  playItem: (index: number) => Promise<void>;
  playItemContinuous: (index: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  setSpeed: (speed: number) => void;
  setVoiceGender: (gender: TTSVoiceGender) => void;
}

interface TTSPlayerBarProps {
  player: TTSPlayerState;
}

/**
 * 連続再生用のプレイヤーバー（オーディオブック風）
 * 画面下部に固定表示
 * 制御コンポーネント: 状態は外部（page.tsx）で管理
 */
export default function TTSPlayerBar({ player }: TTSPlayerBarProps) {
  const [showSettings, setShowSettings] = useState(false);

  const {
    isPlaying,
    isPaused,
    isLoading,
    currentIndex,
    totalItems,
    speed,
    voiceGender,
    playAll,
    stop,
    pause,
    resume,
    next,
    previous,
    setSpeed,
    setVoiceGender,
  } = player;

  const handlePlayPause = useCallback(() => {
    if (isLoading) return;

    if (isPlaying && !isPaused) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      playAll();
    }
  }, [isLoading, isPlaying, isPaused, pause, resume, playAll]);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSpeed(parseFloat(e.target.value));
  }, [setSpeed]);

  const handleVoiceChange = useCallback((gender: TTSVoiceGender) => {
    setVoiceGender(gender);
  }, [setVoiceGender]);

  // アイテムがない場合は表示しない
  if (totalItems === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t shadow-lg"
      style={{
        backgroundColor: CSS_VARS.BASE,
        borderColor: CSS_VARS.NEUTRAL,
      }}
    >
      {/* 設定パネル */}
      {showSettings && (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: CSS_VARS.NEUTRAL }}
        >
          <div className="flex flex-wrap items-center gap-4 max-w-4xl mx-auto">
            {/* 速度調整 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">速度:</label>
              <input
                type="range"
                min={TTS_CONFIG.MIN_SPEED}
                max={TTS_CONFIG.MAX_SPEED}
                step={TTS_CONFIG.SPEED_STEP}
                value={speed}
                onChange={handleSpeedChange}
                className="w-24"
              />
              <span className="text-sm font-mono w-10">{speed.toFixed(1)}x</span>
            </div>

            {/* 音声選択 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">音声:</label>
              <div className="flex gap-1">
                <button
                  onClick={() => handleVoiceChange('FEMALE')}
                  className="px-3 py-1 text-sm rounded-full transition-all"
                  style={{
                    backgroundColor: voiceGender === 'FEMALE' ? CSS_VARS.PRIMARY : 'transparent',
                    color: voiceGender === 'FEMALE' ? '#ffffff' : '#4b5563',
                    border: `1px solid ${voiceGender === 'FEMALE' ? CSS_VARS.PRIMARY : CSS_VARS.NEUTRAL}`,
                  }}
                >
                  女性
                </button>
                <button
                  onClick={() => handleVoiceChange('MALE')}
                  className="px-3 py-1 text-sm rounded-full transition-all"
                  style={{
                    backgroundColor: voiceGender === 'MALE' ? CSS_VARS.PRIMARY : 'transparent',
                    color: voiceGender === 'MALE' ? '#ffffff' : '#4b5563',
                    border: `1px solid ${voiceGender === 'MALE' ? CSS_VARS.PRIMARY : CSS_VARS.NEUTRAL}`,
                  }}
                >
                  男性
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* メインコントロール */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* 左: 再生コントロール */}
          <div className="flex items-center gap-2">
            {/* 前へ */}
            <button
              onClick={previous}
              disabled={currentIndex <= 0 || isLoading}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-30"
              style={{ color: CSS_VARS.SECONDARY }}
              title="前へ"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
              </svg>
            </button>

            {/* 再生/一時停止 */}
            <button
              onClick={handlePlayPause}
              disabled={isLoading}
              className="w-10 h-10 flex items-center justify-center rounded-full transition-all"
              style={{
                backgroundColor: CSS_VARS.PRIMARY,
                color: '#ffffff',
              }}
              title={isPlaying ? (isPaused ? '再開' : '一時停止') : '再生'}
            >
              {isLoading ? (
                <svg className="animate-spin" viewBox="0 0 24 24" width="24" height="24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    opacity="0.25"
                  />
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : isPlaying && !isPaused ? (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              )}
            </button>

            {/* 次へ */}
            <button
              onClick={next}
              disabled={currentIndex >= totalItems - 1 || isLoading}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-30"
              style={{ color: CSS_VARS.SECONDARY }}
              title="次へ"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            {/* 停止 */}
            <button
              onClick={stop}
              disabled={!isPlaying && currentIndex < 0}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-30"
              style={{ color: CSS_VARS.SECONDARY }}
              title="停止"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M6 6h12v12H6V6z" />
              </svg>
            </button>
          </div>

          {/* 中央: 進捗 */}
          <div className="flex-1 mx-4 text-center">
            <span className="text-sm text-gray-600">
              {currentIndex >= 0 ? (
                <>
                  <span className="font-mono">{currentIndex + 1}</span>
                  <span className="mx-1">/</span>
                  <span className="font-mono">{totalItems}</span>
                </>
              ) : (
                <span>準備完了</span>
              )}
            </span>
          </div>

          {/* 右: 設定 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{speed.toFixed(1)}x</span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all"
              style={{
                backgroundColor: showSettings ? CSS_VARS.SECONDARY : 'transparent',
                color: showSettings ? '#ffffff' : CSS_VARS.SECONDARY,
              }}
              title="設定"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
