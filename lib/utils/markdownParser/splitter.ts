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
 * HTML ruby/rt タグは除外します（<ruby> や </ruby> などはカウントしない）
 */
export function hasEmbeddedHeading(line: string): boolean {
  // 全角の見出しプレフィックスをチェック
  if (line.includes(MARKDOWN_PATTERNS.HEADING_PREFIX_FULLWIDTH)) {
    return true;
  }

  // 半角の < をチェック（ただし HTML タグは除外）
  if (line.includes(MARKDOWN_PATTERNS.HEADING_PREFIX)) {
    // <ruby>, </ruby>, <rt>, </rt> などの HTML タグを除外してチェック
    const withoutHtmlTags = line.replace(/<\/?(?:ruby|rt|rb)>/g, '');
    return withoutHtmlTags.includes(MARKDOWN_PATTERNS.HEADING_PREFIX);
  }

  return false;
}

/**
 * 見出しプレフィックスの位置を検索します（HTML タグを除外）
 * @returns プレフィックスの位置、見つからない場合は -1
 */
function findHeadingPrefixIndex(line: string, prefix: string): number {
  if (prefix === MARKDOWN_PATTERNS.HEADING_PREFIX_FULLWIDTH) {
    return line.indexOf(prefix);
  }

  // 半角の < の場合、HTML タグを除外して検索
  let searchStart = 0;
  while (searchStart < line.length) {
    const index = line.indexOf(prefix, searchStart);
    if (index === -1) return -1;

    // この < が HTML タグの開始かどうかをチェック
    const afterPrefix = line.slice(index);
    if (
      afterPrefix.startsWith('<ruby>') ||
      afterPrefix.startsWith('<rt>') ||
      afterPrefix.startsWith('<rb>') ||
      afterPrefix.startsWith('</ruby>') ||
      afterPrefix.startsWith('</rt>') ||
      afterPrefix.startsWith('</rb>')
    ) {
      // HTML タグなのでスキップ
      searchStart = index + 1;
      continue;
    }

    // 見出しプレフィックスとして使用可能
    return index;
  }

  return -1;
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

  // 全角プレフィックスをチェック
  const fullWidthIndex = findHeadingPrefixIndex(
    targetLine,
    MARKDOWN_PATTERNS.HEADING_PREFIX_FULLWIDTH
  );
  if (fullWidthIndex !== -1) {
    const part1 = targetLine.slice(0, fullWidthIndex);
    const part2 = targetLine.slice(fullWidthIndex + 1);
    lines[index + 1] = part1;
    lines[index + 2] = part2;
    return MARKDOWN_PATTERNS.HEADING_PREFIX_FULLWIDTH;
  }

  // 半角プレフィックスをチェック（HTML タグを除外）
  const halfWidthIndex = findHeadingPrefixIndex(
    targetLine,
    MARKDOWN_PATTERNS.HEADING_PREFIX
  );
  if (halfWidthIndex !== -1) {
    const part1 = targetLine.slice(0, halfWidthIndex);
    const part2 = targetLine.slice(halfWidthIndex + 1);
    lines[index + 1] = part1;
    lines[index + 2] = part2;
    return MARKDOWN_PATTERNS.HEADING_PREFIX;
  }

  return null;
}
