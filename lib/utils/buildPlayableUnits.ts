import { parseMarkdown } from '@/lib/utils/markdownParser';
import { READER_CONFIG } from '@/lib/constants';
import type { ParsedItem, PlayableUnit } from '@/lib/types';

export type ContentType = 'rephrase' | 'furigana' | 'plain';
export type ReaderItem = ParsedItem | { text: string };

export function detectContentType(text: string): ContentType {
  if (text.includes('>>') && text.includes('<')) {
    return 'rephrase';
  }
  if (/<ruby>/.test(text) || /[^\[\]]+\[[^\[\]]+\]/.test(text)) {
    return 'furigana';
  }
  return 'plain';
}

export function parseReaderItems(content: string): ReaderItem[] {
  if (detectContentType(content) === 'rephrase') {
    return parseMarkdown(content);
  }
  return content
    .split(READER_CONFIG.PARAGRAPH_SPLIT_PATTERN)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => ({ text: paragraph }));
}

function unitMainText(item: ReaderItem): string {
  return 'head' in item ? item.head : item.text;
}

function unitSubText(item: ReaderItem): string | null {
  if (!('head' in item)) return null;
  return item.subItems.length > 0 ? item.subItems[0] : null;
}

export function buildPlayableUnits(content: string): PlayableUnit[] {
  return parseReaderItems(content).map((item, index) => ({
    globalIndex: index,
    main: unitMainText(item),
    sub: unitSubText(item),
  }));
}
