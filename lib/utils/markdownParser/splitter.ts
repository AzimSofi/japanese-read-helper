/**
 * 行の分割とマージのユーティリティ
 * 見出しプレフィックスがコンテンツに埋め込まれているエッジケースを処理
 */

import { MARKDOWN_PATTERNS } from '@/lib/constants';

/**
 * 埋め込まれた見出しプレフィックスを含む行を分割します
 * 例: ">>content<nextHeading" → [">>content", "nextHeading"]
 *
 * @param line - 埋め込まれた見出しプレフィックスを含む行
 * @param prefix - 分割する見出しプレフィックス（< または ＜）
 * @returns [プレフィックス前, プレフィックス後]の配列
 */
export function splitEmbeddedHeading(
  line: string,
  prefix: string
): [string, string] {
  const parts = line.split(prefix);
  return [parts[0], parts[1]];
}

/**
 * 行に埋め込まれた見出しプレフィックスが含まれているかを確認します
 */
export function hasEmbeddedHeading(line: string): boolean {
  return (
    line.includes(MARKDOWN_PATTERNS.HEADING_PREFIX) ||
    line.includes(MARKDOWN_PATTERNS.HEADING_PREFIX_FULLWIDTH)
  );
}

/**
 * サブアイテムに見出しプレフィックスが埋め込まれているマージされた行を修正します
 * 配列linesをその場で変更します
 *
 * @param lines - すべての行の配列
 * @param index - マージされた行が検出された現在のインデックス
 * @returns 見つかったプレフィックス（< または ＜）、または見つからない場合はnull
 */
export function fixMergedLine(
  lines: string[],
  index: number
): string | null {
  const targetLine = lines[index + 2];

  if (targetLine.includes(MARKDOWN_PATTERNS.HEADING_PREFIX)) {
    const [part1, part2] = splitEmbeddedHeading(
      targetLine,
      MARKDOWN_PATTERNS.HEADING_PREFIX
    );
    lines[index + 1] = part1;
    lines[index + 2] = part2;
    return MARKDOWN_PATTERNS.HEADING_PREFIX;
  } else if (targetLine.includes(MARKDOWN_PATTERNS.HEADING_PREFIX_FULLWIDTH)) {
    const [part1, part2] = splitEmbeddedHeading(
      targetLine,
      MARKDOWN_PATTERNS.HEADING_PREFIX_FULLWIDTH
    );
    lines[index + 1] = part1;
    lines[index + 2] = part2;
    return MARKDOWN_PATTERNS.HEADING_PREFIX_FULLWIDTH;
  }

  return null;
}
