/**
 * Custom hook for calculating reading progress
 * Combines text content and bookmark data to calculate progress metrics
 */

import { useMemo } from 'react';
import { useTextContent } from './useTextContent';
import { useBookmark } from './useBookmark';
import { calculateReadingProgress, ReadingProgress } from '@/lib/utils/progressCalculator';

interface UseReadingProgressOptions {
  fileName: string;
  enabled?: boolean;
}

interface UseReadingProgressReturn {
  progress: ReadingProgress | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to calculate reading progress for a given file
 * @param options - Configuration options
 * @returns Progress metrics, loading state, and error
 */
export function useReadingProgress({
  fileName,
  enabled = true,
}: UseReadingProgressOptions): UseReadingProgressReturn {
  // Fetch text content
  const {
    text: textContent,
    isLoading: isLoadingText,
    error: textError,
  } = useTextContent({ fileName, enabled });

  // Fetch bookmark
  const {
    bookmarkText,
    isLoading: isLoadingBookmark,
    error: bookmarkError,
  } = useBookmark({ fileName, enabled });

  // Calculate progress when both data sources are available
  const progress = useMemo(() => {
    if (!textContent || textContent.trim() === '') {
      return null;
    }

    return calculateReadingProgress(textContent, bookmarkText || '');
  }, [textContent, bookmarkText]);

  const isLoading = isLoadingText || isLoadingBookmark;
  const error = textError || bookmarkError;

  return {
    progress,
    isLoading,
    error,
  };
}
