/**
 * Progress Calculator Utility
 * Calculates reading progress based on bookmarked position in text
 * Only counts Japanese characters (hiragana, katakana, kanji) in headers
 */

export interface ReadingProgress {
  currentItemIndex: number;
  totalItems: number;
  currentCharCount: number;
  totalCharCount: number;
  percentage: number;
}

/**
 * Checks if a character is Japanese (hiragana, katakana, or kanji)
 */
function isJapaneseChar(char: string): boolean {
  const code = char.codePointAt(0);
  return (
    (code !== undefined && code >= 0x3040 && code <= 0x309f) || // Hiragana
    (code !== undefined && code >= 0x30a0 && code <= 0x30ff) || // Katakana
    (code !== undefined && code >= 0x4e00 && code <= 0x9fff)    // Kanji (CJK Unified Ideographs)
  );
}

/**
 * Counts Japanese characters in a string
 */
function countJapaneseChars(text: string): number {
  let count = 0;
  for (const char of text) {
    if (isJapaneseChar(char)) {
      count++;
    }
  }
  return count;
}

/**
 * Extracts headers from markdown text (lines starting with '<')
 * Handles multi-line headers that continue until '>>' is found
 */
function extractHeaders(text: string): string[] {
  const lines = text.split('\n');
  const headers: string[] = [];
  let currentHeader = '';
  let inHeader = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('<')) {
      // Start of a new header
      inHeader = true;
      currentHeader = trimmedLine.substring(1).trim(); // Remove '<' prefix
    } else if (inHeader && trimmedLine.startsWith('>>')) {
      // End of current header
      inHeader = false;
      if (currentHeader) {
        headers.push(currentHeader);
        currentHeader = '';
      }
    } else if (inHeader) {
      // Continuation of multi-line header
      currentHeader += '\n' + trimmedLine;
    }
  }

  // Handle case where last header doesn't have '>>'
  if (inHeader && currentHeader) {
    headers.push(currentHeader);
  }

  return headers;
}

/**
 * Normalizes text for comparison by removing newlines and trimming whitespace
 */
function normalizeForComparison(text: string): string {
  return text.replace(/[\r\n]+/g, '').trim();
}

/**
 * Calculates reading progress based on bookmark position
 * @param textContent - The full text content from the file
 * @param bookmarkText - The bookmarked header text
 * @returns Progress metrics including item count, character count, and percentage
 */
export function calculateReadingProgress(
  textContent: string,
  bookmarkText: string
): ReadingProgress {
  // Extract all headers from the text
  const headers = extractHeaders(textContent);
  const totalItems = headers.length;

  // If no headers or no bookmark, return zero progress
  if (totalItems === 0 || !bookmarkText.trim()) {
    return {
      currentItemIndex: 0,
      totalItems,
      currentCharCount: 0,
      totalCharCount: 0,
      percentage: 0,
    };
  }

  // Calculate total Japanese character count across all headers
  const totalCharCount = headers.reduce(
    (sum, header) => sum + countJapaneseChars(header),
    0
  );

  // Find bookmark position (normalize both texts for comparison)
  const normalizedBookmark = normalizeForComparison(bookmarkText);
  let currentItemIndex = -1;

  for (let i = 0; i < headers.length; i++) {
    const normalizedHeader = normalizeForComparison(headers[i]);
    if (normalizedHeader === normalizedBookmark) {
      currentItemIndex = i;
      break;
    }
  }

  // If bookmark not found, return zero progress
  if (currentItemIndex === -1) {
    return {
      currentItemIndex: 0,
      totalItems,
      currentCharCount: 0,
      totalCharCount,
      percentage: 0,
    };
  }

  // Calculate character count up to and including the bookmarked item
  const currentCharCount = headers
    .slice(0, currentItemIndex + 1)
    .reduce((sum, header) => sum + countJapaneseChars(header), 0);

  // Calculate percentage
  const percentage = totalCharCount > 0
    ? Math.round((currentCharCount / totalCharCount) * 100)
    : 0;

  return {
    currentItemIndex: currentItemIndex + 1, // Convert to 1-based index for display
    totalItems,
    currentCharCount,
    totalCharCount,
    percentage,
  };
}
