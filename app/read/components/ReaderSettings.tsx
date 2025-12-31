'use client';

import { useEffect, useRef } from 'react';
import { READER_THEME, COLORS, READER_CONFIG } from '@/lib/constants';

interface ReaderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  fontSize: number;
  lineHeight: number;
  displayMode: 'collapsed' | 'expanded';
  aiExplanationEnabled: boolean;
  onFontSizeChange: (size: number) => void;
  onLineHeightChange: (height: number) => void;
  onDisplayModeChange: (mode: 'collapsed' | 'expanded') => void;
  onAiExplanationChange: (enabled: boolean) => void;
}

export default function ReaderSettings({
  isOpen,
  onClose,
  fontSize,
  lineHeight,
  displayMode,
  aiExplanationEnabled,
  onFontSizeChange,
  onLineHeightChange,
  onDisplayModeChange,
  onAiExplanationChange,
}: ReaderSettingsProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      />

      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[90vw] shadow-2xl transition-transform duration-300 overflow-y-auto"
        style={{
          backgroundColor: READER_THEME.SURFACE,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold" style={{ color: COLORS.PRIMARY_DARK }}>
              Settings
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-opacity-50"
              style={{ color: COLORS.SECONDARY_DARK }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: COLORS.PRIMARY_DARK }}>
                Font Size: {fontSize}px
              </label>
              <input
                type="range"
                min={READER_CONFIG.MIN_FONT_SIZE}
                max={READER_CONFIG.MAX_FONT_SIZE}
                value={fontSize}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ backgroundColor: COLORS.NEUTRAL }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: COLORS.SECONDARY_DARK }}>
                <span>{READER_CONFIG.MIN_FONT_SIZE}px</span>
                <span>{READER_CONFIG.MAX_FONT_SIZE}px</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: COLORS.PRIMARY_DARK }}>
                Line Height: {lineHeight.toFixed(1)}
              </label>
              <input
                type="range"
                min={READER_CONFIG.MIN_LINE_HEIGHT * 10}
                max={READER_CONFIG.MAX_LINE_HEIGHT * 10}
                value={lineHeight * 10}
                onChange={(e) => onLineHeightChange(Number(e.target.value) / 10)}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ backgroundColor: COLORS.NEUTRAL }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: COLORS.SECONDARY_DARK }}>
                <span>Compact</span>
                <span>Spacious</span>
              </div>
            </div>

            <div className="border-t pt-4" style={{ borderColor: COLORS.NEUTRAL }}>
              <label className="block text-sm font-medium mb-3" style={{ color: COLORS.PRIMARY_DARK }}>
                Display Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => onDisplayModeChange('collapsed')}
                  className="flex-1 py-2 px-4 rounded-lg text-sm transition-colors"
                  style={{
                    backgroundColor: displayMode === 'collapsed' ? COLORS.PRIMARY : COLORS.NEUTRAL,
                    color: displayMode === 'collapsed' ? '#FFFFFF' : COLORS.PRIMARY_DARK,
                  }}
                >
                  Collapsed
                </button>
                <button
                  onClick={() => onDisplayModeChange('expanded')}
                  className="flex-1 py-2 px-4 rounded-lg text-sm transition-colors"
                  style={{
                    backgroundColor: displayMode === 'expanded' ? COLORS.PRIMARY : COLORS.NEUTRAL,
                    color: displayMode === 'expanded' ? '#FFFFFF' : COLORS.PRIMARY_DARK,
                  }}
                >
                  Expanded
                </button>
              </div>
            </div>

            <div className="border-t pt-4" style={{ borderColor: COLORS.NEUTRAL }}>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium" style={{ color: COLORS.PRIMARY_DARK }}>
                    AI Explanation
                  </label>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.SECONDARY_DARK }}>
                    Long-press text to explain
                  </p>
                </div>
                <button
                  onClick={() => onAiExplanationChange(!aiExplanationEnabled)}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{
                    backgroundColor: aiExplanationEnabled ? COLORS.PRIMARY : COLORS.NEUTRAL,
                  }}
                >
                  <span
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    style={{
                      transform: aiExplanationEnabled ? 'translateX(26px)' : 'translateX(4px)',
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
