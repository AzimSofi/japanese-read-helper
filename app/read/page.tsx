'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  READER_THEME,
  COLORS,
  DARK_COLORS,
  READER_CONFIG,
  STORAGE_KEYS,
  PAGINATION_CONFIG,
  API_ROUTES,
} from '@/lib/constants';
import ProgressBar from './components/ProgressBar';
import ReaderFAB from './components/ReaderFAB';
import CopyRangeModal from './components/CopyRangeModal';
import ReaderSettings from './components/ReaderSettings';
import ReadingContent from './components/ReadingContent';
import ReaderHeader from './components/ReaderHeader';
import BottomSheet from '@/app/components/ui/BottomSheet';
import { useBookMetadata } from '@/app/hooks/useBookMetadata';
import { stripFurigana } from '@/lib/utils/furiganaParser';
import { parseMarkdown } from '@/lib/utils/markdownParser';

const ExplanationSidebar = dynamic(
  () => import('@/app/components/reading/ExplanationSidebar'),
  { ssr: false }
);

const RubyLookupSidebar = dynamic(
  () => import('@/app/components/reading/RubyLookupSidebar'),
  { ssr: false }
);

const FloatingStickyNotes = dynamic(
  () => import('./components/FloatingStickyNotes'),
  { ssr: false }
);

function SearchParamsReader({
  children,
}: {
  children: (params: { directory: string | null; fileName: string | null; page: number; hasExplicitPage: boolean }) => React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const directory = searchParams.get('directory');
  const fileName = searchParams.get('fileName');
  const hasExplicitPage = searchParams.has('page');
  const page = parseInt(searchParams.get('page') || '1', 10);

  return <>{children({ directory, fileName, page, hasExplicitPage })}</>;
}

function ReaderContent({
  directoryParam,
  fileNameParam,
  pageParam,
  hasExplicitPage,
}: {
  directoryParam: string | null;
  fileNameParam: string | null;
  pageParam: number;
  hasExplicitPage: boolean;
}) {
  const router = useRouter();

  const [content, setContent] = useState<string>('');
  const [bookmarkText, setBookmarkText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showFurigana, setShowFurigana] = useState(false);
  const [fontSize, setFontSize] = useState<number>(READER_CONFIG.DEFAULT_FONT_SIZE);
  const [lineHeight, setLineHeight] = useState<number>(READER_CONFIG.DEFAULT_LINE_HEIGHT);
  const [displayMode, setDisplayMode] = useState<'collapsed' | 'expanded'>('collapsed');
  const [showRephrase, setShowRephrase] = useState(false);
  const [aiExplanationEnabled, setAiExplanationEnabled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [rubyLookupOpen, setRubyLookupOpen] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState('');
  const [sentenceContext, setSentenceContext] = useState('');

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copyRangeOpen, setCopyRangeOpen] = useState(false);
  const [copyRangeFeedback, setCopyRangeFeedback] = useState(false);

  const { imageMap } = useBookMetadata(fileNameParam, directoryParam);

  const fullFilePath = useMemo(() => {
    if (directoryParam && fileNameParam) {
      return `${directoryParam}/${fileNameParam}`;
    }
    return fileNameParam || '';
  }, [directoryParam, fileNameParam]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedFurigana = localStorage.getItem(STORAGE_KEYS.FURIGANA_ENABLED);
    if (storedFurigana) setShowFurigana(storedFurigana === 'true');

    const storedFontSize = localStorage.getItem(STORAGE_KEYS.READER_FONT_SIZE);
    if (storedFontSize) setFontSize(parseInt(storedFontSize, 10));

    const storedLineHeight = localStorage.getItem(STORAGE_KEYS.READER_LINE_HEIGHT);
    if (storedLineHeight) setLineHeight(parseFloat(storedLineHeight));

    const storedAiExplanation = localStorage.getItem(STORAGE_KEYS.AI_EXPLANATION_ENABLED);
    if (storedAiExplanation) setAiExplanationEnabled(storedAiExplanation === 'true');

    const storedShowRephrase = localStorage.getItem(STORAGE_KEYS.SHOW_REPHRASE);
    if (storedShowRephrase) {
      const isExpanded = storedShowRephrase === 'true';
      setShowRephrase(isExpanded);
      setDisplayMode(isExpanded ? 'expanded' : 'collapsed');
    }

    const storedDarkMode = localStorage.getItem(STORAGE_KEYS.READER_DARK_MODE);
    if (storedDarkMode) setIsDarkMode(storedDarkMode === 'true');
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? DARK_COLORS.BASE : '';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [isDarkMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setRubyLookupOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!fullFilePath) {
      router.push('/library');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [contentRes, bookmarkRes] = await Promise.all([
          fetch(`${API_ROUTES.READ_TEXT}?fileName=${encodeURIComponent(fullFilePath)}`),
          fetch(`${API_ROUTES.READ_BOOKMARK}?fileName=${encodeURIComponent(fullFilePath)}`),
        ]);

        if (!contentRes.ok) throw new Error('Failed to load content');

        const contentData = await contentRes.json();
        setContent(contentData.text || '');

        if (bookmarkRes.ok) {
          const bookmarkData = await bookmarkRes.json();
          setBookmarkText(bookmarkData.text || '');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fullFilePath, router]);

  const totalItems = useMemo(() => {
    if (!content) return 0;
    if (content.includes('>>')) {
      const headingCount = (content.match(/^< /gm) || []).length;
      return headingCount || 1;
    }
    return content.split(READER_CONFIG.PARAGRAPH_SPLIT_PATTERN).filter(p => p.trim()).length;
  }, [content]);

  const totalPages = Math.ceil(totalItems / PAGINATION_CONFIG.ITEMS_PER_PAGE);
  const currentPage = Math.min(Math.max(1, pageParam), totalPages || 1);
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  const currentPageHeaders = useMemo(() => {
    if (!content) return [];

    let items: { head?: string; text?: string }[] = [];
    if (content.includes('>>')) {
      items = parseMarkdown(content);
    } else {
      items = content
        .split(READER_CONFIG.PARAGRAPH_SPLIT_PATTERN)
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => ({ text: p }));
    }

    const start = (currentPage - 1) * PAGINATION_CONFIG.ITEMS_PER_PAGE;
    const end = start + PAGINATION_CONFIG.ITEMS_PER_PAGE;
    const pageItems = items.slice(start, end);

    return pageItems.map(item => {
      const text = item.head || item.text || '';
      return stripFurigana(text);
    });
  }, [content, currentPage]);

  const bookmarkPage = useMemo(() => {
    if (!bookmarkText) return null;

    const match = bookmarkText.match(/^page:(\d+)$/);
    if (match) {
      return parseInt(match[1], 10);
    }

    if (!content) return null;

    const normalizedBookmark = stripFurigana(bookmarkText).replace(/[\r\n]/g, '').trim();
    if (!normalizedBookmark) return null;

    let items: { head?: string; text?: string }[] = [];
    if (content.includes('>>')) {
      items = parseMarkdown(content);
    } else {
      items = content
        .split(READER_CONFIG.PARAGRAPH_SPLIT_PATTERN)
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => ({ text: p }));
    }

    const itemIndex = items.findIndex(item => {
      const itemText = item.head || item.text || '';
      const normalizedItem = stripFurigana(itemText).replace(/[\r\n]/g, '').trim();
      return normalizedItem === normalizedBookmark;
    });

    if (itemIndex === -1) return null;

    return Math.floor(itemIndex / PAGINATION_CONFIG.ITEMS_PER_PAGE) + 1;
  }, [bookmarkText, content]);

  const [didAutoNavigate, setDidAutoNavigate] = useState(false);

  useEffect(() => {
    if (isLoading || didAutoNavigate) return;
    if (!hasExplicitPage && bookmarkPage && bookmarkPage > 1 && currentPage !== bookmarkPage) {
      setDidAutoNavigate(true);
      const params = new URLSearchParams();
      if (directoryParam) params.set('directory', directoryParam);
      if (fileNameParam) params.set('fileName', fileNameParam);
      params.set('page', bookmarkPage.toString());
      router.replace(`/read?${params.toString()}`);
      return;
    }
  }, [isLoading, hasExplicitPage, bookmarkPage, currentPage, directoryParam, fileNameParam, router, didAutoNavigate]);

  useEffect(() => {
    if (isLoading) return;

    const scrollToBookmark = () => {
      const bookmarkElement = document.getElementById('bookmark');
      if (bookmarkElement) {
        bookmarkElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const timer = setTimeout(scrollToBookmark, 100);
    return () => clearTimeout(timer);
  }, [currentPage, isLoading, bookmarkText]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      const params = new URLSearchParams();
      if (directoryParam) params.set('directory', directoryParam);
      if (fileNameParam) params.set('fileName', fileNameParam);
      params.set('page', newPage.toString());
      router.push(`/read?${params.toString()}`);
    },
    [directoryParam, fileNameParam, router, totalPages]
  );

  const handleToggleFurigana = () => {
    const newValue = !showFurigana;
    setShowFurigana(newValue);
    localStorage.setItem(STORAGE_KEYS.FURIGANA_ENABLED, newValue.toString());
    window.dispatchEvent(
      new CustomEvent('furiganaChanged', { detail: { enabled: newValue } })
    );
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem(STORAGE_KEYS.READER_FONT_SIZE, size.toString());
  };

  const handleLineHeightChange = (height: number) => {
    setLineHeight(height);
    localStorage.setItem(STORAGE_KEYS.READER_LINE_HEIGHT, height.toString());
  };

  const handleDisplayModeChange = (mode: 'collapsed' | 'expanded') => {
    setDisplayMode(mode);
    setShowRephrase(mode === 'expanded');
    localStorage.setItem(STORAGE_KEYS.SHOW_REPHRASE, (mode === 'expanded').toString());
  };

  const handleToggleRephrase = () => {
    const newShowRephrase = !showRephrase;
    setShowRephrase(newShowRephrase);
    setDisplayMode(newShowRephrase ? 'expanded' : 'collapsed');
    localStorage.setItem(STORAGE_KEYS.SHOW_REPHRASE, newShowRephrase.toString());
  };

  const handleAiExplanationChange = (enabled: boolean) => {
    setAiExplanationEnabled(enabled);
    localStorage.setItem(STORAGE_KEYS.AI_EXPLANATION_ENABLED, enabled.toString());
  };

  const handleToggleDarkMode = () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    localStorage.setItem(STORAGE_KEYS.READER_DARK_MODE, newValue.toString());
  };

  const handleSentenceClick = (sentence: string) => {
    if (!aiExplanationEnabled) return;

    const cleanSentence = stripFurigana(sentence).trim();
    setSelectedSentence(sentence);
    setSentenceContext(cleanSentence);
    setExplanationOpen(true);
  };

  const refetchBookmark = async () => {
    try {
      const res = await fetch(
        `${API_ROUTES.READ_BOOKMARK}?fileName=${encodeURIComponent(fullFilePath)}`
      );
      if (res.ok) {
        const data = await res.json();
        setBookmarkText(data.text || '');
      }
    } catch (err) {
      console.error('Failed to refetch bookmark:', err);
    }
  };

  const handleGoToBookmark = useCallback(() => {
    if (!bookmarkPage) return;

    if (currentPage === bookmarkPage) {
      const bookmarkElement = document.getElementById('bookmark');
      if (bookmarkElement) {
        bookmarkElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      handlePageChange(bookmarkPage);
    }
  }, [bookmarkPage, currentPage, handlePageChange]);

  const handleCopyPageText = useCallback(async () => {
    if (currentPageHeaders.length === 0) return;

    try {
      const textToCopy = currentPageHeaders.join('\n');
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [currentPageHeaders]);

  const handleCopyPageRange = useCallback(async (fromPage: number, toPage: number) => {
    if (!content) return;

    let items: { head?: string; text?: string }[] = [];
    if (content.includes('>>')) {
      items = parseMarkdown(content);
    } else {
      items = content
        .split(READER_CONFIG.PARAGRAPH_SPLIT_PATTERN)
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => ({ text: p }));
    }

    const start = (fromPage - 1) * PAGINATION_CONFIG.ITEMS_PER_PAGE;
    const end = toPage * PAGINATION_CONFIG.ITEMS_PER_PAGE;
    const rangeItems = items.slice(start, end);

    const textToCopy = rangeItems
      .map(item => stripFurigana(item.head || item.text || ''))
      .join('\n');

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyRangeFeedback(true);
      setTimeout(() => {
        setCopyRangeFeedback(false);
        setCopyRangeOpen(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [content]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: isDarkMode ? DARK_COLORS.BASE : READER_THEME.SURFACE_MUTED }}
      >
        <div
          className="p-8 rounded-2xl"
          style={{
            backgroundColor: isDarkMode ? DARK_COLORS.SURFACE : READER_THEME.SURFACE,
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}
        >
          <div
            className="w-10 h-10 rounded-full animate-spin"
            style={{
              borderWidth: '3px',
              borderStyle: 'solid',
              borderColor: isDarkMode ? DARK_COLORS.NEUTRAL : '#E5E5EA',
              borderTopColor: '#007AFF',
            }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: isDarkMode ? DARK_COLORS.BASE : READER_THEME.SURFACE_MUTED }}
      >
        <div
          className="p-6 rounded-2xl text-center max-w-md"
          style={{
            backgroundColor: isDarkMode ? DARK_COLORS.SURFACE : READER_THEME.SURFACE,
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}
        >
          <p className="text-lg mb-2" style={{ color: isDarkMode ? DARK_COLORS.TEXT : COLORS.PRIMARY_DARK }}>
            Could not load book
          </p>
          <p className="text-sm mb-4" style={{ color: '#8E8E93' }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/library')}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: COLORS.PRIMARY, color: '#FFFFFF' }}
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  const theme = isDarkMode
    ? { bg: DARK_COLORS.BASE, surface: DARK_COLORS.SURFACE, text: DARK_COLORS.TEXT }
    : { bg: READER_THEME.SURFACE_MUTED, surface: READER_THEME.SURFACE, text: '#000000' };

  const hasBookmark = bookmarkPage != null && bookmarkPage > 0;

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <ProgressBar progress={progress} />

      <ReaderHeader
        currentPage={currentPage}
        totalPages={totalPages}
        bookmarkPage={bookmarkPage}
        isDarkMode={isDarkMode}
        directoryParam={directoryParam}
        fileNameParam={fileNameParam}
        onPageChange={handlePageChange}
      />

      <main
        className="max-w-3xl mx-auto px-4 py-8 pt-4 pb-12"
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
        }}
      >
        <ReadingContent
          content={content}
          fileName={fileNameParam || ''}
          directory={directoryParam || ''}
          bookmarkText={bookmarkText}
          showFurigana={showFurigana}
          fontSize={fontSize}
          lineHeight={lineHeight}
          displayMode={displayMode}
          aiExplanationEnabled={aiExplanationEnabled}
          currentPage={currentPage}
          itemsPerPage={PAGINATION_CONFIG.ITEMS_PER_PAGE}
          isDarkMode={isDarkMode}
          onBookmarkSuccess={refetchBookmark}
          onSentenceClick={handleSentenceClick}
          imageMap={imageMap}
        />

        {totalPages > 1 && (
          <div
            className="flex justify-center items-center gap-4 mt-8 pt-4 border-t"
            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePageChange(currentPage - 1);
              }}
              disabled={currentPage <= 1}
              className="px-5 py-2.5 rounded-xl disabled:opacity-30 transition-all duration-200 text-sm font-medium"
              style={{
                backgroundColor: currentPage <= 1 ? (isDarkMode ? DARK_COLORS.NEUTRAL : '#F2F2F7') : '#007AFF',
                color: currentPage <= 1 ? (isDarkMode ? DARK_COLORS.TEXT : '#1D1D1F') : '#FFFFFF',
              }}
            >
              Previous
            </button>
            <span className="text-sm" style={{ color: '#8E8E93' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePageChange(currentPage + 1);
              }}
              disabled={currentPage >= totalPages}
              className="px-5 py-2.5 rounded-xl disabled:opacity-30 transition-all duration-200 text-sm font-medium"
              style={{
                backgroundColor: currentPage >= totalPages ? (isDarkMode ? DARK_COLORS.NEUTRAL : '#F2F2F7') : '#007AFF',
                color: currentPage >= totalPages ? (isDarkMode ? DARK_COLORS.TEXT : '#1D1D1F') : '#FFFFFF',
              }}
            >
              Next
            </button>
          </div>
        )}
      </main>

      <ReaderFAB
        onToggleFurigana={handleToggleFurigana}
        onToggleRephrase={handleToggleRephrase}
        onOpenSettings={() => setSettingsOpen(true)}
        onGoToBookmark={handleGoToBookmark}
        onCopyPageText={handleCopyPageText}
        onCopyPageRange={() => setCopyRangeOpen(true)}
        onToggleDarkMode={handleToggleDarkMode}
        onToggleRubyLookup={() => setRubyLookupOpen(prev => !prev)}
        isFuriganaEnabled={showFurigana}
        showRephrase={showRephrase}
        isDarkMode={isDarkMode}
        hasBookmark={hasBookmark}
        bookmarkPage={bookmarkPage}
        currentPage={currentPage}
        copyFeedback={copyFeedback}
      />

      <CopyRangeModal
        isOpen={copyRangeOpen}
        onClose={() => setCopyRangeOpen(false)}
        onCopy={handleCopyPageRange}
        currentPage={currentPage}
        totalPages={totalPages}
        isDarkMode={isDarkMode}
        copyFeedback={copyRangeFeedback}
      />

      <BottomSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="Display" isDarkMode={isDarkMode}>
        <ReaderSettings
          fontSize={fontSize}
          lineHeight={lineHeight}
          displayMode={displayMode}
          aiExplanationEnabled={aiExplanationEnabled}
          onFontSizeChange={handleFontSizeChange}
          onLineHeightChange={handleLineHeightChange}
          onDisplayModeChange={handleDisplayModeChange}
          onAiExplanationChange={handleAiExplanationChange}
        />
      </BottomSheet>

      <ExplanationSidebar
        isOpen={explanationOpen}
        onClose={() => setExplanationOpen(false)}
        sentence={selectedSentence}
        context={sentenceContext}
        fileName={fullFilePath}
        showFurigana={showFurigana}
      />

      <RubyLookupSidebar
        isOpen={rubyLookupOpen}
        onClose={() => setRubyLookupOpen(false)}
        directory={directoryParam?.split('/')[0] || ''}
        bookName={directoryParam?.split('/').slice(1).join('/') || ''}
      />

      <FloatingStickyNotes
        directory={directoryParam?.split('/')[0] || ''}
        bookName={directoryParam?.split('/').slice(1).join('/') || ''}
      />
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: READER_THEME.SURFACE_MUTED }}
        >
          <div
            className="w-12 h-12 border-4 rounded-full animate-spin"
            style={{
              borderColor: '#E5E5EA',
              borderTopColor: '#007AFF',
            }}
          />
        </div>
      }
    >
      <SearchParamsReader>
        {({ directory, fileName, page, hasExplicitPage }) => (
          <ReaderContent
            directoryParam={directory}
            fileNameParam={fileName}
            pageParam={page}
            hasExplicitPage={hasExplicitPage}
          />
        )}
      </SearchParamsReader>
    </Suspense>
  );
}
