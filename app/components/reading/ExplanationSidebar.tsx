'use client';

import * as React from 'react';
import { marked } from 'marked';
import { API_ROUTES, EXPLANATION_CONFIG, EXPLANATION_MODE_CONFIG } from '@/lib/constants';
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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    const offset = currentTouch - touchStart;
    if (offset > 0) {
      setDragOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const swipeDistance = touchEnd - touchStart;
    if (swipeDistance > 100) {
      onClose();
    }
    setDragOffset(0);
  };

  React.useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || !sentence) {
      return;
    }

    const fetchExplanation = async () => {
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch explanation: ${response.statusText}`);
        }

        const data: ExplanationResponse = await response.json();
        setExplanation(data.explanation);
        setCache(fileName, sentence, data.explanation, contextSize, mode);

        if (forceRegenerate) {
          setForceRegenerate(false);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);

        if (forceRegenerate) {
          setForceRegenerate(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchExplanation();
  }, [isOpen, sentence, context, fileName, contextSize, mode, forceRegenerate, getCache, setCache]);

  const renderTextWithFurigana = (text: string) => {
    if (!showFurigana) {
      return <span>{text}</span>;
    }
    const segments = parseFurigana(text);
    const html = segmentsToHTML(segments, showFurigana);
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const getTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const renderMarkdown = (text: string): string => {
    const textWithoutFurigana = stripFurigana(text);
    return marked(textWithoutFurigana, { async: false });
  };

  const contextPercent =
    ((contextSize - EXPLANATION_CONFIG.MIN_CONTEXT_SIZE) /
      (EXPLANATION_CONFIG.MAX_CONTEXT_SIZE - EXPLANATION_CONFIG.MIN_CONTEXT_SIZE)) *
    100;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 transition-all duration-300"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full z-50 overflow-y-auto rounded-l-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          width: 'min(calc(100vw - 16px), 480px)',
          backgroundColor: '#FFFFFF',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.1)',
          transform: `translateX(${isOpen ? dragOffset : '100%'}px)`,
          transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div
            className="w-9 h-1 rounded-full"
            style={{ backgroundColor: '#D1D1D6' }}
          />
        </div>

        <div className="p-4 md:p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1">
              <h2 className="text-lg font-semibold" style={{ color: '#1D1D1F' }}>
                AI Explanation
              </h2>
              {isCached && cacheTimestamp && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs" style={{ color: '#8E8E93' }}>
                    Cached {getTimeAgo(cacheTimestamp)}
                  </span>
                  <button
                    onClick={() => setForceRegenerate(true)}
                    className="text-xs font-medium interactive-link"
                    style={{ color: '#007AFF' }}
                  >
                    Regenerate
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full interactive-close"
              style={{ backgroundColor: '#F2F2F7', color: '#8E8E93' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div
            className="rounded-xl p-4 mb-5"
            style={{
              backgroundColor: 'rgba(0, 122, 255, 0.04)',
              border: '1px solid rgba(0, 122, 255, 0.1)',
            }}
          >
            <div
              className="text-xs font-medium uppercase tracking-wide mb-2"
              style={{ color: '#007AFF' }}
            >
              Selected Sentence
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#1D1D1F', whiteSpace: 'pre-wrap' }}>
              {renderTextWithFurigana(sentence)}
            </p>
          </div>

          <div className="mb-5">
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(EXPLANATION_MODE_CONFIG).map(([modeKey, config]) => {
                const isActive = mode === modeKey;
                return (
                  <button
                    key={modeKey}
                    onClick={() => setMode(modeKey as ExplanationMode)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium interactive-pill"
                    style={{
                      backgroundColor: isActive ? '#007AFF' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#636366',
                      border: isActive ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
                    }}
                    title={config.description}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>

            <div>
              <button
                onClick={() => setContextSizeExpanded(!contextSizeExpanded)}
                className="text-xs font-medium flex items-center gap-1 interactive-link"
                style={{ color: '#8E8E93' }}
              >
                Context: {contextSize} chars
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  style={{
                    transform: contextSizeExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms',
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {contextSizeExpanded && (
                <div className="mt-2">
                  <input
                    type="range"
                    min={EXPLANATION_CONFIG.MIN_CONTEXT_SIZE}
                    max={EXPLANATION_CONFIG.MAX_CONTEXT_SIZE}
                    value={contextSize}
                    onChange={(e) => setContextSize(parseInt(e.target.value, 10))}
                    className="w-full"
                    style={{
                      background: `linear-gradient(to right, #007AFF 0%, #007AFF ${contextPercent}%, #E5E5EA ${contextPercent}%, #E5E5EA 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-[10px] mt-1" style={{ color: '#8E8E93' }}>
                    <span>{EXPLANATION_CONFIG.MIN_CONTEXT_SIZE}</span>
                    <span>{EXPLANATION_CONFIG.MAX_CONTEXT_SIZE}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-10">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-2 border-transparent"
                  style={{ borderTopColor: '#007AFF', borderRightColor: '#007AFF' }}
                />
                <span className="mt-3 text-sm" style={{ color: '#8E8E93' }}>
                  Generating explanation...
                </span>
              </div>
            )}

            {error && !isLoading && (
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: 'rgba(255, 59, 48, 0.06)',
                  border: '1px solid rgba(255, 59, 48, 0.15)',
                  color: '#FF3B30',
                }}
              >
                <p className="text-sm font-semibold mb-1">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {explanation && !isLoading && !error && (
              <div
                className="text-sm leading-relaxed"
                style={{ color: '#1D1D1F' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(explanation) }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
