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
  isOrphanedDialogue,
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
 * <見出しテキスト（複数行可能）
 * 見出しの続き...
 * さらに続き...
 * >>サブアイテム1
 * >>サブアイテム2
 * >>サブアイテム3
 * ```
 *
 * 複数行ヘッダー:
 * - `<`で始まる行からヘッダーが開始
 * - `>>`が出現するまでの全ての行がヘッダーとして扱われる
 * - `>>`以降はサブアイテムとして扱われる
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
  let collectingMultiLineHeader = false;

  for (let i = 0; i < splitByLines.length; i++) {
    let line = splitByLines[i];
    const previousLine = i > 0 ? splitByLines[i - 1] : '';

    // 空行をスキップ（ただし複数行ヘッダー収集中は改行として追加）
    if (line.trim() === '') {
      if (collectingMultiLineHeader && currentHeadItem) {
        currentHeadItem.head += '\n';
      }
      continue;
    }

    // ケース1: 標準的な見出し行（< または ＜ プレフィックス）
    if (isHeadingLine(line)) {
      currentHeadItem = {
        head: removeHeadingPrefix(line),
        subItems: [],
      };
      parsedData.push(currentHeadItem);
      collectingMultiLineHeader = true; // 複数行ヘッダーの収集を開始
    }
    // 複数行ヘッダー収集中にサブアイテムが見つかった場合
    else if (collectingMultiLineHeader && isSubItemLine(line)) {
      collectingMultiLineHeader = false; // ヘッダー収集終了
      const trimmedSubItem = removeSubItemPrefix(line);
      if (currentHeadItem) {
        currentHeadItem.subItems.push(trimmedSubItem);
      }
    }
    // 複数行ヘッダーの継続
    else if (collectingMultiLineHeader && currentHeadItem) {
      currentHeadItem.head += '\n' + line;
    }
    // 標準的なサブアイテム行（複数行ヘッダー収集中でない場合）
    else if (!collectingMultiLineHeader && isSubItemLine(line)) {
      const trimmedSubItem = removeSubItemPrefix(line);
      if (currentHeadItem) {
        currentHeadItem.subItems.push(trimmedSubItem);
      }
    }
    // ケース2: サブアイテムに埋め込まれた見出し（マージされた行パターン）
    // パターン: プレフィックスなしの行 + 4つのサブアイテムが続き、i+2行目に埋め込まれた見出し
    else if (!collectingMultiLineHeader && hasSubItemsAhead(splitByLines, i, 4)) {
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
    else if (!collectingMultiLineHeader && hasSubItemsAhead(splitByLines, i, 3)) {
      // 太字フォーマットがある場合は削除
      if (isBoldFormatted(line)) {
        line = removeBoldFormatting(line);
      }

      currentHeadItem = { head: line, subItems: [] };
      parsedData.push(currentHeadItem);
      collectingMultiLineHeader = true;
    }
    // ケース5: 2つのサブアイテムパターン（見出しと2つのサブアイテムのみ）
    else if (!collectingMultiLineHeader && isTwoSubItemPattern(splitByLines, i)) {
      currentHeadItem = { head: line, subItems: [] };
      parsedData.push(currentHeadItem);
      collectingMultiLineHeader = true;
    }
    // ケース6: その他のエッジケース
    else if (!collectingMultiLineHeader) {
      // エッジケース6a: 見出しの後に空行があり、その後サブアイテム
      if (isEmptyLineBeforeSubItems(splitByLines, i)) {
        currentHeadItem = { head: line, subItems: [] };
        collectingMultiLineHeader = true;
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
          collectingMultiLineHeader = true;
        }
        // エッジケース6e: 孤立した対話行（切り捨てられた見出し）
        // AIレスポンスが切り捨てられた場合に発生する可能性がある
        else if (isOrphanedDialogue(line)) {
          console.warn('孤立した対話を検出（切り捨てられた見出しの可能性）:', line);
          // この行をスキップ - ParsedItemに追加しない
        }
        // エッジケース6f: 予期しない形式
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
