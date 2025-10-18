/**
 * 日本語テキスト用の辞書解析ユーティリティ
 * フォーマット: 単語[読み・意味]
 */

import type { DictionaryWord } from '@/lib/types';

/**
 * 辞書エントリを漢字、読み、意味に分割します
 * フォーマット: 漢字[読み・意味]
 *
 * @param item - 辞書エントリ文字列
 * @returns 漢字、読み、意味を含むオブジェクト
 *
 * @example
 * // 入力: "ジッパー[チャック・ファスナー]"
 * // 出力: { kanji: "ジッパー", reading: "チャック", meaning: "ファスナー" }
 */
export function splitDictionaryEntry(item: string): DictionaryWord {
  const kanji = item.split('[')[0];
  let reading = '';
  let meaning = '';

  if (item.includes('[') && item.includes(']')) {
    const bracketContent = item.split('[')[1].split(']')[0];

    if (bracketContent.includes('・')) {
      // フォーマット: 単語[読み・意味]
      reading = bracketContent.split('・')[0];
      meaning = bracketContent.split('・')[1].trim();
    } else {
      // フォーマット: 単語[意味]（読みなし）
      reading = '';
      meaning = bracketContent;
    }
  } else {
    console.error('無効な辞書エントリ形式:', item);
  }

  return { kanji, reading, meaning };
}

/**
 * 辞書形式のサブアイテム全体を解析して単語の配列に変換します
 * 複数のセパレータに対応: ＊, ], 、
 *
 * @param subItem - 辞書形式の複数エントリを含む文字列
 * @returns DictionaryWordオブジェクトの配列
 *
 * @example
 * // 入力: "ジッパー[チャック・ファスナー]＊ノック[ドアなどを軽く叩くこと]"
 * // 出力: [
 * //   { kanji: "ジッパー", reading: "チャック", meaning: "ファスナー" },
 * //   { kanji: "ノック", reading: "", meaning: "ドアなどを軽く叩くこと" }
 * // ]
 */
export function parseDictionaryText(subItem: string): DictionaryWord[] {
  // 特殊な「無い」ケースを処理
  const noneValues = ['無い', 'ない', '無し', 'なし', '無'];
  if (noneValues.includes(subItem)) {
    return [{ kanji: subItem, reading: '', meaning: '' }];
  }

  let parsed: string[] = [];

  // 異なるセパレータで分割
  if (subItem.includes('＊')) {
    // 主なセパレータ: ＊
    parsed = subItem.split('＊');
  } else if (subItem.includes(']')) {
    // 閉じ括弧で分割し、再度追加
    parsed = subItem
      .split(']')
      .map((element) => element + ']')
      .slice(0, -1); // 最後の空要素を削除
  } else if (subItem.includes('、')) {
    // カンマセパレータ
    parsed = subItem.split('、');
  } else {
    console.error('予期しない辞書形式:', subItem);
    parsed = [subItem];
  }

  const words: DictionaryWord[] = [];
  const multipleDefinition: string[] = [];

  parsed.forEach((item) => {
    if (item.includes('[') && item.includes(']')) {
      // 完全なエントリ
      words.push(splitDictionaryEntry(item));
    } else {
      // 部分的なエントリ - 閉じ括弧が見つかるまで蓄積
      multipleDefinition.push(item);
      if (item.includes(']')) {
        words.push(splitDictionaryEntry(multipleDefinition.join('')));
        multipleDefinition.length = 0;
      }
    }
  });

  return words;
}

/**
 * 文字列に英字が含まれているかを確認します
 * @param text - 確認するテキスト
 * @returns テキストに英字が含まれている場合はtrue
 */
export function containsEnglish(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}
