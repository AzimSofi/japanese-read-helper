'use client';

import { useState, useEffect } from 'react';
import { DARK_COLORS } from '@/lib/constants';

interface CopyRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopy: (fromPage: number, toPage: number) => void;
  currentPage: number;
  totalPages: number;
  isDarkMode: boolean;
  copyFeedback: boolean;
}

export default function CopyRangeModal({
  isOpen,
  onClose,
  onCopy,
  currentPage,
  totalPages,
  isDarkMode,
  copyFeedback,
}: CopyRangeModalProps) {
  const [fromPage, setFromPage] = useState(currentPage);
  const [toPage, setToPage] = useState(currentPage);

  useEffect(() => {
    if (isOpen) {
      setFromPage(currentPage);
      setToPage(Math.min(currentPage + 4, totalPages));
    }
  }, [isOpen, currentPage, totalPages]);

  const isValid = fromPage >= 1 && toPage >= fromPage && toPage <= totalPages;

  if (!isOpen) return null;

  const surfaceBg = isDarkMode ? DARK_COLORS.SURFACE : '#FFFFFF';
  const textColor = isDarkMode ? '#F5F5F7' : '#1D1D1F';
  const mutedColor = isDarkMode ? '#8E8E93' : '#86868B';
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.08)' : '#F2F2F7';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      onClick={onClose}
      style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)' }}
    >
      <div
        className="rounded-2xl p-5 w-[280px]"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: surfaceBg,
          boxShadow: isDarkMode
            ? '0 8px 32px rgba(0,0,0,0.5)'
            : '0 8px 32px rgba(0,0,0,0.12)',
          border: `1px solid ${borderColor}`,
        }}
      >
        <h3
          className="text-[15px] font-semibold mb-4"
          style={{ color: textColor }}
        >
          Copy Page Range
        </h3>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <label
              className="text-[11px] font-medium mb-1 block"
              style={{ color: mutedColor }}
            >
              From
            </label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={fromPage}
              onChange={(e) => setFromPage(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded-lg text-[14px] text-center"
              style={{
                backgroundColor: inputBg,
                color: textColor,
                border: `1px solid ${borderColor}`,
                outline: 'none',
              }}
            />
          </div>
          <span
            className="text-[13px] mt-4"
            style={{ color: mutedColor }}
          >
            -
          </span>
          <div className="flex-1">
            <label
              className="text-[11px] font-medium mb-1 block"
              style={{ color: mutedColor }}
            >
              To
            </label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={toPage}
              onChange={(e) => setToPage(Math.min(totalPages, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded-lg text-[14px] text-center"
              style={{
                backgroundColor: inputBg,
                color: textColor,
                border: `1px solid ${borderColor}`,
                outline: 'none',
              }}
            />
          </div>
        </div>

        <p
          className="text-[11px] mb-4"
          style={{ color: mutedColor }}
        >
          {isValid ? `${toPage - fromPage + 1} page(s)` : 'Invalid range'}
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
            style={{
              backgroundColor: inputBg,
              color: textColor,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => isValid && onCopy(fromPage, toPage)}
            disabled={!isValid}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-medium disabled:opacity-30"
            style={{
              backgroundColor: copyFeedback ? '#34C759' : '#007AFF',
              color: '#FFFFFF',
            }}
          >
            {copyFeedback ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
