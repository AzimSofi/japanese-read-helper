/**
 * マークダウン解析用の正規化ユーティリティ
 * テキストのフォーマットとクリーンアップを処理
 */

import { MARKDOWN_PATTERNS } from '@/lib/constants';

/**
 * 行から見出しのプレフィックスを削除します（< または ＜）
 * HTML ruby/rt タグは除外します
 */
export function removeHeadingPrefix(line: string): string {
  if (line.startsWith(MARKDOWN_PATTERNS.HEADING_PREFIX)) {
    // <ruby> や <rt> タグの場合はプレフィックスを削除しない
    if (line.startsWith('<ruby>') || line.startsWith('<rt>') || line.startsWith('</')) {
      return line;
    }
    return line.slice(1);
  }
  if (line.startsWith(MARKDOWN_PATTERNS.HEADING_PREFIX_FULLWIDTH)) {
    return line.slice(1);
  }
  return line;
}

/**
 * 行からサブアイテムのプレフィックスを削除します（>>）
 */
export function removeSubItemPrefix(line: string): string {
  if (line.startsWith(MARKDOWN_PATTERNS.SUBITEM_PREFIX)) {
    return line.slice(2);
  }
  return line;
}

/**
 * 行から太字フォーマットを削除します（**テキスト**）
 */
export function removeBoldFormatting(line: string): string {
  if (
    line[0] === '*' &&
    line[1] === '*' &&
    line[line.length - 1] === '*' &&
    line[line.length - 2] === '*'
  ) {
    return line.slice(2, -2);
  }
  return line;
}

/**
 * ハッシュ見出しのプレフィックスを削除します（## または ＃＃）
 */
export function removeHashPrefix(line: string): string {
  if (line.startsWith(MARKDOWN_PATTERNS.HEADING_HASH)) {
    return line.slice(2).trim();
  }
  if (line.startsWith(MARKDOWN_PATTERNS.HEADING_HASH_FULLWIDTH)) {
    return line.slice(2).trim();
  }
  return line;
}

/**
 * 見出し行を正規化し、すべての可能なプレフィックスを削除します
 */
export function normalizeHeading(line: string): string {
  let normalized = line;
  normalized = removeHeadingPrefix(normalized);
  normalized = removeBoldFormatting(normalized);
  normalized = removeHashPrefix(normalized);
  return normalized.trim();
}
