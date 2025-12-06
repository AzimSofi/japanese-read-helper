/**
 * TTSテキストクリーナー
 * Text-to-Speech用にテキストを前処理
 */

import { stripFurigana } from './furiganaParser';

// 除外するパターン
const IMAGE_PATTERN = /\[IMAGE:[^\]]+\]/g;
const TITLE_LINE_PATTERN = /^→Title:.*$/gm;
const AUTHOR_LINE_PATTERN = /^→?Author:.*$/gm;

/**
 * TTS用にテキストをクリーンアップ
 * - rubyタグからふりがなを除去（漢字のみ保持）
 * - [IMAGE:xxx.jpg] タグを除去
 * - 余分な空白・改行を正規化
 * @param text 元のテキスト
 * @returns TTS用のクリーンテキスト
 */
export function cleanTextForTTS(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. [IMAGE:xxx.jpg] を除去
  cleaned = cleaned.replace(IMAGE_PATTERN, '');

  // 2. Title/Author行を除去
  cleaned = cleaned.replace(TITLE_LINE_PATTERN, '');
  cleaned = cleaned.replace(AUTHOR_LINE_PATTERN, '');

  // 3. rubyタグからふりがなを除去（漢字のみ保持）
  cleaned = stripFurigana(cleaned);

  // 4. 連続する空白を1つに
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // 5. 連続する改行を1つに
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 6. 前後の空白を除去
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * 段落リストをTTS用にクリーンアップ
 * @param paragraphs 段落の配列
 * @returns クリーンな段落の配列
 */
export function cleanParagraphsForTTS(paragraphs: string[]): string[] {
  return paragraphs
    .map(p => cleanTextForTTS(p))
    .filter(p => p.length > 0);
}

/**
 * TTS用テキストの文字数を推定
 * Google Cloud TTSの課金は文字数ベース
 * @param text クリーンなテキスト
 * @returns 文字数
 */
export function estimateTTSCharacterCount(text: string): number {
  return cleanTextForTTS(text).length;
}
