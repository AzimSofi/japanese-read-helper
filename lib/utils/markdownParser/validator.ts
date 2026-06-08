/**
 * マークダウン解析用の検証ユーティリティ
 */

import { MARKDOWN_PATTERNS } from '@/lib/constants';

/**
 * 日本語の対話マーカー
 */
const DIALOGUE_MARKERS = ['」', '？」', '。」', '！」', '…」'];

/**
 * 行が見出し行かどうかを確認します
 * HTML ruby/rt タグは除外します（<ruby> や <rt> で始まる行は見出しではない）
 */
export function isHeadingLine(line: string): boolean {
  if (line.startsWith(MARKDOWN_PATTERNS.HEADING_PREFIX)) {
    // <ruby> や <rt> タグの場合は見出しではない
    if (line.startsWith('<ruby>') || line.startsWith('<rt>') || line.startsWith('</')) {
      return false;
    }
    return true;
  }
  if (line.startsWith(MARKDOWN_PATTERNS.HEADING_PREFIX_FULLWIDTH)) {
    return true;
  }
  return false;
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

/**
 * これが孤立した対話行かどうかを確認します
 * （見出しやサブアイテムのプレフィックスなしで、対話文字を含む行）
 */
export function isOrphanedDialogue(line: string): boolean {
  // 見出しやサブアイテムの場合は孤立していない
  if (isHeadingLine(line) || isSubItemLine(line)) {
    return false;
  }

  // 日本語の対話マーカーを含む場合は孤立した対話の可能性がある
  return DIALOGUE_MARKERS.some((marker) => line.includes(marker));
}

/**
 * AIが整形フォーマット（< 原文 >> 要約）の外で出力する非コンテンツ行かどうかを確認します
 * （区切り線、編集注記、要約作業そのものを説明する前置き文）
 * これらは表示対象ではなく、警告ログからも除外する
 */
export function isAiMetaLine(line: string): boolean {
  // ルビは語単位で分割されるため、アンカー語（「日本語学習者」など）が
  // タグで途切れないよう、判定前に振り仮名を除いた素の本文に戻す
  const plain = line
    .replace(/<rt>.*?<\/rt>/g, '')
    .replace(/<\/?(?:ruby|rb)>/g, '')
    .trim();
  if (plain === '') {
    return false;
  }
  // 区切り線（---、*** など）
  if (/^[-―ー─_*]{3,}$/.test(plain)) {
    return true;
  }
  // 全体が括弧で囲まれた編集注記（（※中略：...） など）
  if (/^[（(].*※.*[)）]$/.test(plain)) {
    return true;
  }
  // 要約作業そのものを説明するAIの前置き文。
  // 「ご提示」「日本語学習者」はプロンプト由来の語で本文には現れないため、
  // 「要約」を含む一般的な地の文を誤って巻き込まないようアンカーとして併用する
  const hasPreambleAnchor = /ご提示|日本語学習者/.test(plain);
  const describesSummaryTask = /要約|平易化/.test(plain);
  return hasPreambleAnchor && describesSummaryTask;
}
