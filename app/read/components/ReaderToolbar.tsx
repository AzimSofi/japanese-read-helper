'use client';

interface ReaderToolbarProps {
  onBookmark: () => void;
  onToggleFurigana: () => void;
  onToggleRephrase: () => void;
  onOpenSettings: () => void;
  onToggleRubyLookup: () => void;
  onOpenMore: () => void;
  isFuriganaEnabled: boolean;
  isBookmarked: boolean;
  showRephrase: boolean;
  isDarkMode: boolean;
}

export default function ReaderToolbar({
  onBookmark,
  onToggleFurigana,
  onToggleRephrase,
  onOpenSettings,
  onToggleRubyLookup,
  onOpenMore,
  isFuriganaEnabled,
  isBookmarked,
  showRephrase,
  isDarkMode,
}: ReaderToolbarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backgroundColor: isDarkMode ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="max-w-3xl mx-auto h-14 flex items-center justify-between px-2">
        <div className="flex items-center">
          <button
            onClick={onBookmark}
            className={`toolbar-btn ${isBookmarked ? 'active' : ''}`}
            title="Bookmark"
          >
            <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="hidden sm:inline text-xs font-medium ml-1">Bookmark</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFurigana}
            className={`toolbar-btn ${isFuriganaEnabled ? 'active' : ''}`}
            title={isFuriganaEnabled ? 'Hide furigana' : 'Show furigana'}
          >
            <span className="text-sm font-semibold" style={{ fontFamily: 'serif' }}>
              {'\u3042'}
            </span>
          </button>

          <button
            onClick={onToggleRephrase}
            className={`toolbar-btn ${showRephrase ? 'active' : ''}`}
            title={showRephrase ? 'Hide rephrase' : 'Show rephrase'}
          >
            <span className="text-sm font-semibold">R</span>
          </button>

          <button
            onClick={onToggleRubyLookup}
            className="toolbar-btn"
            title="Ruby lookup"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSettings}
            className="toolbar-btn"
            title="Display settings"
          >
            <span className="text-base font-semibold">Aa</span>
          </button>

          <button
            onClick={onOpenMore}
            className="toolbar-btn muted"
            title="More actions"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
