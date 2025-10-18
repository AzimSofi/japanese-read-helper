/**
 * AI生成テキスト用のメインマークダウンパーサー
 * フォーマットを解析: <見出しの後に>>サブアイテム行
 */

import type { ParsedItem } from '@/lib/types';
import { MARKDOWN_PATTERNS } from '@/lib/constants';
import {
  isHeadingLine,
  isSubItemLine,
  isBoldFormatted,
  isHashHeading,
  hasSubItemsAhead,
  isTwoSubItemPattern,
  isEmptyLineBeforeSubItems,
  isStandaloneHeading,
} from './validator';
import {
  removeHeadingPrefix,
  removeSubItemPrefix,
  removeBoldFormatting,
  removeHashPrefix,
  normalizeHeading,
} from './normalizer';
import { fixMergedLine, hasEmbeddedHeading } from './splitter';

/**
 * AI生成のマークダウンを構造化されたParsedItem配列に解析します
 *
 * 期待されるフォーマット:
 * ```
 * <見出しテキスト
 * >>サブアイテム1
 * >>サブアイテム2
 * >>サブアイテム3
 * ```
 *
 * @param text - AIからの生のマークダウンテキスト
 * @param isError - trueの場合、空の配列を返しエラーをログに記録
 * @returns ParsedItemオブジェクトの配列
 */
export function parseMarkdown(
  text: string,
  isError: boolean = false
): ParsedItem[] {
  if (isError) {
    console.error('エラー: 正しい形式の応答が得られませんでした。');
    return [];
  }

  const splitByLines = text.split('\n');
  const parsedData: ParsedItem[] = [];
  let currentHeadItem: ParsedItem | null = null;

  for (let i = 0; i < splitByLines.length; i++) {
    let line = splitByLines[i];
    const previousLine = i > 0 ? splitByLines[i - 1] : '';

    // 空行をスキップ
    if (line.trim() === '') {
      continue;
    }

    // ケース1: 標準的な見出し行（< または ＜ プレフィックス）
    if (isHeadingLine(line)) {
      currentHeadItem = {
        head: removeHeadingPrefix(line),
        subItems: [],
      };
      parsedData.push(currentHeadItem);
    }
    // ケース2: サブアイテムに埋め込まれた見出し（マージされた行パターン）
    // パターン: プレフィックスなしの行 + 4つのサブアイテムが続き、i+2行目に埋め込まれた見出し
    else if (hasSubItemsAhead(splitByLines, i, 4)) {
      const trimmedSubItem = removeSubItemPrefix(line);

      if (currentHeadItem) {
        currentHeadItem.subItems.push(trimmedSubItem);
        currentHeadItem.subItems.push(removeSubItemPrefix(splitByLines[i + 1]));
      }

      // マージされた行を修正
      const foundPrefix = fixMergedLine(splitByLines, i);
      if (!foundPrefix) {
        console.log('予期しない行形式:', splitByLines[i + 2]);
      }
    }
    // ケース3: プレフィックスなしの見出しだが、3つのサブアイテムが続く
    // 太字フォーマットまたはプレーン
    else if (hasSubItemsAhead(splitByLines, i, 3)) {
      // 太字フォーマットがある場合は削除
      if (isBoldFormatted(line)) {
        line = removeBoldFormatting(line);
      }

      currentHeadItem = { head: line, subItems: [] };
      parsedData.push(currentHeadItem);
    }
    // ケース4: 標準的なサブアイテム行
    else if (isSubItemLine(line)) {
      const trimmedSubItem = removeSubItemPrefix(line);
      if (currentHeadItem) {
        currentHeadItem.subItems.push(trimmedSubItem);
      }
    }
    // ケース5: 2つのサブアイテムパターン（見出しと2つのサブアイテムのみ）
    else if (isTwoSubItemPattern(splitByLines, i)) {
      currentHeadItem = { head: line, subItems: [] };
      parsedData.push(currentHeadItem);
    }
    // ケース6: その他のエッジケース
    else {
      // エッジケース6a: 見出しの後に空行があり、その後サブアイテム
      if (isEmptyLineBeforeSubItems(splitByLines, i)) {
        currentHeadItem = { head: line, subItems: [] };
      }

      if (line.trim().length > 0 && currentHeadItem) {
        // エッジケース6b: 前の見出しの継続
        if (isHeadingLine(previousLine)) {
          const unfinishedHeadItem = { head: line, subItems: [] };
          currentHeadItem.head += '、' + unfinishedHeadItem.head;
        }
        // エッジケース6c: 前のサブアイテムの継続
        else if (isSubItemLine(previousLine)) {
          const previousContent = removeSubItemPrefix(previousLine);
          for (let j = 0; j < currentHeadItem.subItems.length; j++) {
            if (currentHeadItem.subItems[j] === previousContent) {
              currentHeadItem.subItems[j] += '、' + line;
            }
          }
        }
        // エッジケース6d: ハッシュまたはプレーンの単独見出し
        else if (isStandaloneHeading(splitByLines, i, previousLine)) {
          if (isHashHeading(line)) {
            currentHeadItem = {
              head: removeHashPrefix(line),
              subItems: [],
            };
            parsedData.push(currentHeadItem);
          } else {
            currentHeadItem = { head: line, subItems: [] };
            parsedData.push(currentHeadItem);
          }
        }
        // エッジケース6e: 予期しない形式
        else {
          console.log('予期しない行形式:', line);
        }
      }
    }
  }

  return parsedData;
}

// 外部使用のためのユーティリティを再エクスポート
export {
  isHeadingLine,
  isSubItemLine,
} from './validator';
export { 
  removeSubItemPrefix, 
  normalizeHeading, 
  removeHeadingPrefix, 
  removeBoldFormatting 
} from './normalizer';
export { hasEmbeddedHeading } from './splitter';
