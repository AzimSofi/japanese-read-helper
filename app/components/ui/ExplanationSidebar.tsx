'use client';

import * as React from 'react';
import { marked } from 'marked';
import { CSS_VARS, API_ROUTES, EXPLANATION_CONFIG, EXPLANATION_MODE_CONFIG } from '@/lib/constants';
import { useExplanationCache } from '@/app/hooks/useExplanationCache';
import { parseFurigana, segmentsToHTML, stripFurigana } from '@/lib/utils/furiganaParser';
import type { ExplanationRequest, ExplanationResponse } from '@/lib/types';
import type { ExplanationMode } from '@/lib/constants';

interface ExplanationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sentence: string;
  context: string;
  fileName: string;
  showFurigana?: boolean;
}

export default function ExplanationSidebar({
  isOpen,
  onClose,
  sentence,
  context,
  fileName,
  showFurigana = true,
}: ExplanationSidebarProps) {
  const [explanation, setExplanation] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isCached, setIsCached] = React.useState<boolean>(false);
  const [cacheTimestamp, setCacheTimestamp] = React.useState<number | null>(null);
  const [forceRegenerate, setForceRegenerate] = React.useState<boolean>(false);

  // スワイプ操作用の状態
  const [touchStart, setTouchStart] = React.useState<number>(0);
  const [touchEnd, setTouchEnd] = React.useState<number>(0);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [dragOffset, setDragOffset] = React.useState<number>(0);

  const {
    getCache,
    setCache,
    contextSize,
    setContextSize,
    mode,
    setMode,
    contextSizeExpanded,
    setContextSizeExpanded,
  } = useExplanationCache();

  // ESCキーでサイドバーを閉じる
  React.useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // スワイプ操作のハンドラー
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);

    // 右方向のドラッグのみ許可
    const offset = currentTouch - touchStart;
    if (offset > 0) {
      setDragOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // ドラッグ距離が100px以上なら閉じる
    const swipeDistance = touchEnd - touchStart;
    if (swipeDistance > 100) {
      onClose();
    }

    // ドラッグオフセットをリセット
    setDragOffset(0);
  };

  // サイドバーが閉じられたらドラッグ状態をリセット
  React.useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  // センテンスが変更されたら説明を取得
  React.useEffect(() => {
    if (!isOpen || !sentence) {
      return;
    }

    const fetchExplanation = async () => {
      // forceRegenerateがfalseの場合のみキャッシュをチェック
      if (!forceRegenerate) {
        const cached = getCache(fileName, sentence, mode);
        if (cached) {
          setExplanation(cached.explanation);
          setIsCached(true);
          setCacheTimestamp(cached.timestamp);
          setIsLoading(false);
          return;
        }
      }

      // キャッシュがない場合、または強制再生成の場合はAPIを呼び出し
      setIsLoading(true);
      setError(null);
      setIsCached(false);
      setCacheTimestamp(null);

      try {
        const requestData: ExplanationRequest = {
          sentence,
          context,
          fileName,
          contextSize,
          mode,
        };

        const response = await fetch(API_ROUTES.EXPLAIN_SENTENCE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          throw new Error(`説明の取得に失敗しました: ${response.statusText}`);
        }

        const data: ExplanationResponse = await response.json();
        setExplanation(data.explanation);

        // キャッシュに保存（強制再生成の場合は上書き）
        setCache(fileName, sentence, data.explanation, contextSize, mode);

        // 強制再生成フラグをリセット
        if (forceRegenerate) {
          setForceRegenerate(false);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
        setError(errorMessage);
        console.error('説明の取得中にエラーが発生しました:', err);

        // エラー時もフラグをリセット
        if (forceRegenerate) {
          setForceRegenerate(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchExplanation();
  }, [isOpen, sentence, context, fileName, contextSize, mode, forceRegenerate, getCache, setCache]);

  // 振り仮名を処理して表示
  const renderTextWithFurigana = (text: string) => {
    if (!showFurigana) {
      return <span>{text}</span>;
    }

    const segments = parseFurigana(text);
    const html = segmentsToHTML(segments, showFurigana);

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // キャッシュの経過時間を表示
  const getTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return 'たった今';
  };

  // マークダウンをHTMLに変換
  const renderMarkdown = (text: string): string => {
    // 振り仮名を削除してからマークダウンをパース
    const textWithoutFurigana = stripFurigana(text);
    return marked.parseSync(textWithoutFurigana);
  };

  return (
    <>
      {/* 背景オーバーレイ - クリックで閉じる */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ease-in-out"
          onClick={onClose}
          aria-label="サイドバーを閉じる"
        />
      )}

      {/* サイドバー */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 xl:w-2/5 z-50 shadow-2xl overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: CSS_VARS.BASE,
          transform: `translateX(${isOpen ? dragOffset : '100%'}px)`,
          transition: isDragging ? 'none' : 'transform 300ms ease-in-out',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ドラッグインジケーター（モバイルのみ表示） */}
        <div className="md:hidden flex justify-center pt-3 pb-2">
          <div
            className="w-12 h-1 rounded-full"
            style={{ backgroundColor: CSS_VARS.NEUTRAL }}
          />
        </div>

        <div className="p-3 md:p-6">
          {/* ヘッダー */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-2" style={{ color: CSS_VARS.PRIMARY }}>
                文の説明
              </h2>
              {isCached && cacheTimestamp && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: CSS_VARS.SECONDARY, fontSize: '0.75rem' }}>
                    キャッシュ: {getTimeAgo(cacheTimestamp)}
                  </span>
                  <button
                    onClick={() => setForceRegenerate(true)}
                    className="px-2 py-1 rounded text-xs font-medium transition-all hover:scale-110 active:scale-95"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${CSS_VARS.SECONDARY} 20%, transparent)`,
                      color: CSS_VARS.SECONDARY,
                    }}
                    title="新しい説明を生成する"
                  >
                    🔄 再生成
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95 border"
              style={{
                backgroundColor: CSS_VARS.NEUTRAL,
                borderColor: CSS_VARS.NEUTRAL,
                color: '#4b5563',
              }}
            >
              閉じる
            </button>
          </div>

          {/* 選択された文 */}
          <div
            className="rounded-lg border p-4 mb-6"
            style={{
              backgroundColor: `color-mix(in srgb, ${CSS_VARS.SECONDARY} 10%, transparent)`,
              borderColor: CSS_VARS.SECONDARY,
            }}
          >
            <h3 className="text-xs font-bold mb-2" style={{ color: CSS_VARS.SECONDARY }}>
              選択された文
            </h3>
            <p className="text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
              {renderTextWithFurigana(sentence)}
            </p>
          </div>

          {/* 説明モード選択 */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(EXPLANATION_MODE_CONFIG).map(([modeKey, config]) => {
                const isActive = mode === modeKey;
                return (
                  <button
                    key={modeKey}
                    onClick={() => setMode(modeKey as ExplanationMode)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95 border"
                    style={{
                      backgroundColor: isActive
                        ? CSS_VARS.PRIMARY
                        : `color-mix(in srgb, ${CSS_VARS.NEUTRAL} 50%, transparent)`,
                      borderColor: isActive ? CSS_VARS.PRIMARY : CSS_VARS.NEUTRAL,
                      color: isActive ? '#ffffff' : '#4b5563',
                      fontWeight: isActive ? '700' : '500',
                    }}
                    title={config.description}
                  >
                    {config.icon} {config.label}
                  </button>
                );
              })}
            </div>

            {/* コンテキストサイズ調整（展開可能） */}
            <div>
              <button
                onClick={() => setContextSizeExpanded(!contextSizeExpanded)}
                className="text-xs font-medium transition-all hover:scale-105 flex items-center gap-1"
                style={{ color: CSS_VARS.SECONDARY }}
              >
                ⚙️ コンテキスト: {contextSize}文
                <span style={{
                  transform: contextSizeExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms',
                  display: 'inline-block'
                }}>
                  ▼
                </span>
              </button>

              {contextSizeExpanded && (
                <div className="mt-2">
                  <input
                    type="range"
                    min={EXPLANATION_CONFIG.MIN_CONTEXT_SIZE}
                    max={EXPLANATION_CONFIG.MAX_CONTEXT_SIZE}
                    value={contextSize}
                    onChange={(e) => setContextSize(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${CSS_VARS.SECONDARY} 0%, ${CSS_VARS.SECONDARY} ${
                        ((contextSize - EXPLANATION_CONFIG.MIN_CONTEXT_SIZE) /
                          (EXPLANATION_CONFIG.MAX_CONTEXT_SIZE - EXPLANATION_CONFIG.MIN_CONTEXT_SIZE)) *
                        100
                      }%, ${CSS_VARS.NEUTRAL} ${
                        ((contextSize - EXPLANATION_CONFIG.MIN_CONTEXT_SIZE) /
                          (EXPLANATION_CONFIG.MAX_CONTEXT_SIZE - EXPLANATION_CONFIG.MIN_CONTEXT_SIZE)) *
                        100
                      }%, ${CSS_VARS.NEUTRAL} 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-[10px] mt-0.5" style={{ color: '#9ca3af' }}>
                    <span>{EXPLANATION_CONFIG.MIN_CONTEXT_SIZE}</span>
                    <span>{EXPLANATION_CONFIG.MAX_CONTEXT_SIZE}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 説明コンテンツ */}
          <div
            className="rounded-lg border p-4"
            style={{
              backgroundColor: `color-mix(in srgb, ${CSS_VARS.PRIMARY} 10%, transparent)`,
              borderColor: CSS_VARS.PRIMARY,
            }}
          >
            <h3 className="text-xs font-bold mb-3" style={{ color: CSS_VARS.PRIMARY }}>
              AI による説明
            </h3>

            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: CSS_VARS.PRIMARY }}></div>
                <span className="ml-3 text-sm" style={{ color: '#6b7280' }}>
                  説明を生成中...
                </span>
              </div>
            )}

            {error && !isLoading && (
              <div
                className="rounded-lg border p-4"
                style={{
                  backgroundColor: '#fef2f2',
                  borderColor: '#fca5a5',
                  color: '#991b1b',
                }}
              >
                <p className="text-sm font-bold mb-1">エラー</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {explanation && !isLoading && !error && (
              <div
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(explanation) }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
