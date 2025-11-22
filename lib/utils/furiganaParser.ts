/**
 * 振り仮名パーサー
 * 2つの形式をサポート:
 * 1. 漢字[ふりがな] - ブラケット形式
 * 2. <ruby>漢字<rt>ふりがな</rt></ruby> - HTML ruby形式
 */

import { FURIGANA_PATTERNS } from '../constants';

export interface FuriganaSegment {
  type: 'text' | 'ruby';
  text: string;
  ruby?: string;
}

/**
 * テキストを振り仮名セグメントに解析
 * @param text 解析するテキスト
 * @returns セグメントの配列
 */
export function parseFurigana(text: string): FuriganaSegment[] {
  const segments: FuriganaSegment[] = [];
  let lastIndex = 0;

  // まずHTMLのrubyタグを検出
  const rubyMatches: Array<{ index: number; length: number; text: string; ruby: string }> = [];
  let match: RegExpExecArray | null;

  const rubyPattern = new RegExp(FURIGANA_PATTERNS.RUBY_PATTERN);
  while ((match = rubyPattern.exec(text)) !== null) {
    rubyMatches.push({
      index: match.index,
      length: match[0].length,
      text: match[1],
      ruby: match[2],
    });
  }

  // 次にブラケット形式を検出（rubyタグと重複しない部分のみ）
  const bracketMatches: Array<{ index: number; length: number; text: string; ruby: string }> = [];
  const bracketPattern = new RegExp(FURIGANA_PATTERNS.BRACKET_PATTERN);

  while ((match = bracketPattern.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchLength = match[0].length;

    // このマッチがrubyタグの内部でないか確認
    const isInsideRuby = rubyMatches.some(
      rm => matchIndex >= rm.index && matchIndex < rm.index + rm.length
    );

    if (!isInsideRuby) {
      bracketMatches.push({
        index: matchIndex,
        length: matchLength,
        text: match[1],
        ruby: match[2],
      });
    }
  }

  // すべてのマッチを位置順にソート
  const allMatches = [...rubyMatches, ...bracketMatches].sort((a, b) => a.index - b.index);

  // セグメントを構築
  allMatches.forEach(m => {
    // マッチ前のプレーンテキスト
    if (m.index > lastIndex) {
      const plainText = text.substring(lastIndex, m.index);
      if (plainText) {
        segments.push({ type: 'text', text: plainText });
      }
    }

    // 振り仮名セグメント
    segments.push({ type: 'ruby', text: m.text, ruby: m.ruby });
    lastIndex = m.index + m.length;
  });

  // 最後のプレーンテキスト
  if (lastIndex < text.length) {
    const plainText = text.substring(lastIndex);
    if (plainText) {
      segments.push({ type: 'text', text: plainText });
    }
  }

  // セグメントが空の場合、全体をテキストとして返す
  if (segments.length === 0) {
    segments.push({ type: 'text', text });
  }

  return segments;
}

/**
 * 振り仮名セグメントをHTML文字列に変換
 * @param segments セグメントの配列
 * @param showFurigana 振り仮名を表示するかどうか
 * @returns HTML文字列
 */
export function segmentsToHTML(segments: FuriganaSegment[], showFurigana: boolean): string {
  return segments
    .map(segment => {
      if (segment.type === 'ruby' && showFurigana && segment.ruby) {
        return `<ruby>${segment.text}<rt>${segment.ruby}</rt></ruby>`;
      }
      return segment.text;
    })
    .join('');
}

/**
 * テキストから振り仮名を完全に除去（プレーンテキストのみ返す）
 * @param text 元のテキスト
 * @returns 振り仮名表記を除去したプレーンテキスト
 */
export function stripFurigana(text: string): string {
  const segments = parseFurigana(text);
  return segments.map(s => s.text).join('');
}
