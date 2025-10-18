/**
 * マークダウン解析用の検証ユーティリティ
 */

import { MARKDOWN_PATTERNS } from '@/lib/constants';

/**
 * 行が見出し行かどうかを確認します
 */
export function isHeadingLine(line: string): boolean {
  return (
    line.startsWith(MARKDOWN_PATTERNS.HEADING_PREFIX) ||
    line.startsWith(MARKDOWN_PATTERNS.HEADING_PREFIX_FULLWIDTH)
  );
}

/**
 * 行がサブアイテム行かどうかを確認します
 */
export function isSubItemLine(line: string): boolean {
  return line.startsWith(MARKDOWN_PATTERNS.SUBITEM_PREFIX);
}

/**
 * 行が太字フォーマット（**テキスト**）かどうかを確認します
 */
export function isBoldFormatted(line: string): boolean {
  return (
    line[0] === '*' &&
    line[1] === '*' &&
    line[line.length - 1] === '*' &&
    line[line.length - 2] === '*'
  );
}

/**
 * 行が見出しハッシュ（## または ＃＃）で始まるかどうかを確認します
 */
export function isHashHeading(line: string): boolean {
  return (
    line.startsWith(MARKDOWN_PATTERNS.HEADING_HASH) ||
    line.startsWith(MARKDOWN_PATTERNS.HEADING_HASH_FULLWIDTH)
  );
}

/**
 * 次のN行がすべてサブアイテム行かどうかを確認します
 */
export function hasSubItemsAhead(
  lines: string[],
  currentIndex: number,
  count: number
): boolean {
  if (currentIndex + count >= lines.length) {
    return false;
  }

  for (let i = 1; i <= count; i++) {
    if (!isSubItemLine(lines[currentIndex + i])) {
      return false;
    }
  }

  return true;
}

/**
 * これが2つのサブアイテムパターンかどうかを確認します
 * （見出しの後に2つのサブアイテム、空行、その後別の行とサブアイテム）
 */
export function isTwoSubItemPattern(
  lines: string[],
  currentIndex: number
): boolean {
  const i = currentIndex;
  return (
    i + 5 < lines.length &&
    isSubItemLine(lines[i + 1]) &&
    isSubItemLine(lines[i + 2]) &&
    lines[i + 3] === '' &&
    lines[i + 4] !== undefined &&
    lines[i + 4] !== '' &&
    isSubItemLine(lines[i + 5])
  );
}

/**
 * これが見出しの後に空行があり、その後サブアイテムが続くパターンかどうかを確認します
 */
export function isEmptyLineBeforeSubItems(
  lines: string[],
  currentIndex: number
): boolean {
  const i = currentIndex;
  return (
    lines[i] !== undefined &&
    lines[i + 1] === '' &&
    isSubItemLine(lines[i + 2]) &&
    isSubItemLine(lines[i + 3]) &&
    isSubItemLine(lines[i + 4])
  );
}

/**
 * これが単独の見出しかどうかを確認します（その周りに空行がある）
 */
export function isStandaloneHeading(
  lines: string[],
  currentIndex: number,
  previousLine: string
): boolean {
  return previousLine === '' && lines[currentIndex + 1] === '';
}
