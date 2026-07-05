import { parseMarkdown } from '@/lib/utils/markdownParser';
import { PAGINATION_CONFIG, READER_CONFIG } from '@/lib/constants';
import type { ParsedItem } from '@/lib/types';

function isRephraseContent(content: string): boolean {
  return content.includes('>>') && content.includes('<');
}

function serializeRephraseItems(items: ParsedItem[]): string {
  return items
    .map((item) =>
      [`<${item.head}`, ...item.subItems.map((sub) => `>>${sub}`)].join('\n')
    )
    .join('\n\n');
}

/**
 * Trims book content to the first N reader pages for the guest preview.
 *
 * A "page" is a client-side slice of PAGINATION_CONFIG.ITEMS_PER_PAGE reader
 * units, so the cap is expressed in units. The reader re-derives units from the
 * text via buildPlayableUnits, so the returned text must parse back to the same
 * unit boundaries: rephrase content is parsed and re-serialized in canonical
 * `<head` / `>>sub` form, plain/furigana content is truncated by paragraph.
 * The rest of the book is never included in the output.
 */
export function truncateToPreviewPages(
  content: string,
  maxPages: number,
  itemsPerPage: number = PAGINATION_CONFIG.ITEMS_PER_PAGE
): string {
  // Clamp defensively: a mis-edited (zero/negative/non-integer) cap must never
  // widen the preview via slice(0, negative) or a fractional boundary.
  const maxUnits = Math.max(0, Math.floor(maxPages)) * itemsPerPage;

  if (isRephraseContent(content)) {
    const items = parseMarkdown(content);
    if (items.length <= maxUnits) return content;
    return serializeRephraseItems(items.slice(0, maxUnits));
  }

  const paragraphs = content
    .split(READER_CONFIG.PARAGRAPH_SPLIT_PATTERN)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  if (paragraphs.length <= maxUnits) return content;
  return paragraphs.slice(0, maxUnits).join('\n\n');
}
