'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  READER_THEME,
  COLORS,
  READER_CONFIG,
  STORAGE_KEYS,
  PAGINATION_CONFIG,
  API_ROUTES,
} from '@/lib/constants';
import ProgressBar from './components/ProgressBar';
import ReaderFAB from './components/ReaderFAB';
import ReaderSettings from './components/ReaderSettings';
import ReadingContent from './components/ReadingContent';
import ReaderHeader from './components/ReaderHeader';
import { useBookMetadata } from '@/app/hooks/useBookMetadata';
import { stripFurigana } from '@/lib/utils/furiganaParser';
import { parseMarkdown } from '@/lib/utils/markdownParser';

const ExplanationSidebar = dynamic(
  () => import('@/app/components/ui/ExplanationSidebar'),
  { ssr: false }
);

const RubyLookupSidebar = dynamic(
  () => import('@/app/components/ui/RubyLookupSidebar'),
  { ssr: false }
);

const FloatingStickyNotes = dynamic(
  () => import('./components/FloatingStickyNotes'),
  { ssr: false }
);

function SearchParamsReader({
  children,
}: {
  children: (params: { directory: string | null; fileName: string | null; page: number }) => React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const directory = searchParams.get('directory');
  const fileName = searchParams.get('fileName');
  const page = parseInt(searchParams.get('page') || '1', 10);

  return <>{children({ directory, fileName, page })}</>;
}

function ReaderContent({
  directoryParam,
  fileNameParam,
  pageParam,
}: {
  directoryParam: string | null;
  fileNameParam: string | null;
  pageParam: number;
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

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [rubyLookupOpen, setRubyLookupOpen] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState('');
  const [sentenceContext, setSentenceContext] = useState('');

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
  }, []);

  // Keyboard shortcut: Ctrl/Cmd+K to open Ruby Lookup
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
      // Count lines starting with "< " (heading marker), excluding <ruby> tags
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

    // Check for page-level bookmark (format: page:N)
    const match = bookmarkText.match(/^page:(\d+)$/);
    if (match) {
      return parseInt(match[1], 10);
    }

    // For sentence-level bookmarks, find which page contains it
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

  // Auto-scroll to bookmark element when on the bookmark page
  useEffect(() => {
    if (isLoading) return;

    const scrollToBookmark = () => {
      const bookmarkElement = document.getElementById('bookmark');
      if (bookmarkElement) {
        bookmarkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Small delay to ensure content is rendered
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

  const handleBookmark = async () => {
    try {
      const response = await fetch(API_ROUTES.WRITE_BOOKMARK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: fullFilePath,
          content: `page:${currentPage}`,
        }),
      });
      if (response.ok) {
        setBookmarkText(`page:${currentPage}`);
      }
    } catch (err) {
      console.error('Failed to save bookmark:', err);
    }
  };

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
        bookmarkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      handlePageChange(bookmarkPage);
    }
  }, [bookmarkPage, currentPage, handlePageChange]);

  const handleTapNavigation = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const interactiveElements = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'];
    if (interactiveElements.includes(target.tagName)) return;

    if (target.closest('.collapsibleItem') || target.closest('.paragraph-item')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.2) {
      handlePageChange(currentPage - 1);
    } else if (x > width * 0.8) {
      handlePageChange(currentPage + 1);
    }
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: READER_THEME.SURFACE_MUTED }}
      >
        <div
          className="w-12 h-12 border-4 rounded-full animate-spin"
          style={{
            borderColor: COLORS.NEUTRAL,
            borderTopColor: COLORS.PRIMARY,
          }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: READER_THEME.SURFACE_MUTED }}
      >
        <div
          className="p-6 rounded-xl text-center max-w-md"
          style={{ backgroundColor: READER_THEME.SURFACE }}
        >
          <p className="text-lg mb-2" style={{ color: COLORS.PRIMARY_DARK }}>
            Could not load book
          </p>
          <p className="text-sm mb-4" style={{ color: COLORS.SECONDARY_DARK }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/library')}
            className="px-4 py-2 rounded-lg"
            style={{ backgroundColor: COLORS.PRIMARY, color: '#FFFFFF' }}
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: READER_THEME.SURFACE_MUTED }}
    >
      <ProgressBar
        progress={progress}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      <ReaderHeader
        currentPage={currentPage}
        totalPages={totalPages}
        bookmarkPage={bookmarkPage}
        showFurigana={showFurigana}
        showRephrase={showRephrase}
        directoryParam={directoryParam}
        fileNameParam={fileNameParam}
        onPageChange={handlePageChange}
        onToggleFurigana={handleToggleFurigana}
        onToggleRephrase={handleToggleRephrase}
        onOpenRubyLookup={() => setRubyLookupOpen(true)}
      />

      <main
        className="max-w-3xl mx-auto px-4 py-8 pt-4 pb-24 cursor-pointer"
        onClick={handleTapNavigation}
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
          onBookmarkSuccess={refetchBookmark}
          onSentenceClick={handleSentenceClick}
          imageMap={imageMap}
        />

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8 pt-4 border-t" style={{ borderColor: COLORS.NEUTRAL }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePageChange(currentPage - 1);
              }}
              disabled={currentPage <= 1}
              className="px-4 py-2 rounded-lg disabled:opacity-30 transition-opacity"
              style={{ backgroundColor: COLORS.SECONDARY, color: '#FFFFFF' }}
            >
              Previous
            </button>
            <span style={{ color: COLORS.SECONDARY_DARK }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePageChange(currentPage + 1);
              }}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 rounded-lg disabled:opacity-30 transition-opacity"
              style={{ backgroundColor: COLORS.SECONDARY, color: '#FFFFFF' }}
            >
              Next
            </button>
          </div>
        )}
      </main>

      <ReaderFAB
        onBookmark={handleBookmark}
        onToggleFurigana={handleToggleFurigana}
        onOpenSettings={() => setSettingsOpen(true)}
        onGoToBookmark={bookmarkPage ? handleGoToBookmark : undefined}
        isFuriganaEnabled={showFurigana}
        isBookmarked={bookmarkText.includes(`page:${currentPage}`)}
        bookmarkPage={bookmarkPage}
        currentPage={currentPage}
        currentPageHeaders={currentPageHeaders}
      />

      <ReaderSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fontSize={fontSize}
        lineHeight={lineHeight}
        displayMode={displayMode}
        aiExplanationEnabled={aiExplanationEnabled}
        onFontSizeChange={handleFontSizeChange}
        onLineHeightChange={handleLineHeightChange}
        onDisplayModeChange={handleDisplayModeChange}
        onAiExplanationChange={handleAiExplanationChange}
      />

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
              borderColor: COLORS.NEUTRAL,
              borderTopColor: COLORS.PRIMARY,
            }}
          />
        </div>
      }
    >
      <SearchParamsReader>
        {({ directory, fileName, page }) => (
          <ReaderContent
            directoryParam={directory}
            fileNameParam={fileName}
            pageParam={page}
          />
        )}
      </SearchParamsReader>
    </Suspense>
  );
}
