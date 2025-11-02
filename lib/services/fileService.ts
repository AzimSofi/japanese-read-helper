/**
 * publicディレクトリ内のファイルの読み書きを行う中央集権的なファイルサービス
 */

import * as fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { PUBLIC_DIR, BOOKMARK_FILE } from '@/lib/constants';
import type { BookmarkData } from '@/lib/types';

/**
 * 文字列から制御文字（\r, \n）を削除し、前後の空白をトリムする
 * @param text - 処理する文字列
 * @returns 制御文字を削除し、トリムした文字列
 */
function removeControlCharacters(text: string): string {
  return text.replace(/[\r\n]/g, '').trim();
}

/**
 * publicディレクトリ内の完全なファイルパスを取得する
 */
export function getPublicFilePath(fileName: string): string {
  const fullPath = path.join(process.cwd(), PUBLIC_DIR, fileName);
  console.log(`getPublicFilePath: fileName="${fileName}" -> fullPath="${fullPath}"`);
  return fullPath;
}

/**
 * publicディレクトリからテキストファイルを読み込む
 * @param fileName - ファイル名（.txt拡張子なし）
 * @returns ファイルの内容（文字列）、ファイルが存在しない場合は空文字列
 */
export async function readTextFile(fileName: string): Promise<string> {
  const filePath = getPublicFilePath(`${fileName}.txt`);
  try {
    console.log(`readTextFile: 読み込み開始 filePath="${filePath}"`);
    const content = await fs.readFile(filePath, 'utf8');
    console.log(`readTextFile: 読み込み成功 length=${content.length}`);
    return content;
  } catch (error) {
    console.error(`ファイル ${fileName} の読み込み中にエラーが発生しました:`, error);
    console.error('エラー詳細:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && 'code' in error) {
      console.error('エラーコード:', (error as NodeJS.ErrnoException).code);
    }
    return '';
  }
}

/**
 * publicディレクトリのテキストファイルにコンテンツを書き込む
 * @param fileName - ファイル名（.txt拡張子なし）
 * @param content - 書き込むコンテンツ
 */
export async function writeTextFile(
  fileName: string,
  content: string
): Promise<void> {
  const filePath = getPublicFilePath(`${fileName}.txt`);
  await fs.writeFile(filePath, content, 'utf8');
}

/**
 * ブックマークJSONファイルを読み込む
 * @returns ブックマークデータオブジェクト、ファイルが存在しない場合は空オブジェクト
 */
export async function readBookmarkFile(): Promise<BookmarkData> {
  const filePath = getPublicFilePath(BOOKMARK_FILE);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('ブックマークファイルの読み込み中にエラーが発生しました:', error);
    return {};
  }
}

/**
 * 特定のファイルのブックマークを読み込む
 * @param fileName - テキストファイルの名前
 * @returns ブックマークの内容、見つからない場合は空文字列
 */
export async function readBookmark(fileName: string): Promise<string> {
  const bookmarks = await readBookmarkFile();
  return bookmarks[fileName] || '';
}

/**
 * ブックマークデータをJSONファイルに書き込む（非同期バージョン）
 * @param bookmarkData - 完全なブックマークデータオブジェクト
 */
export async function writeBookmarkFile(
  bookmarkData: BookmarkData
): Promise<void> {
  const filePath = getPublicFilePath(BOOKMARK_FILE);
  await fs.writeFile(filePath, JSON.stringify(bookmarkData, null, 2), 'utf8');
}

/**
 * 単一のブックマークエントリを更新する
 * @param fileName - テキストファイルの名前
 * @param content - 保存するブックマークの内容
 */
export async function updateBookmark(
  fileName: string,
  content: string
): Promise<void> {
  const bookmarks = await readBookmarkFile();
  bookmarks[fileName] = removeControlCharacters(content);
  await writeBookmarkFile(bookmarks);
}

/**
 * 同期バージョン - ブックマークファイルを読み込む
 * (同期操作が必要な既存のコードで使用)
 */
export function readBookmarkFileSync(): BookmarkData {
  const filePath = getPublicFilePath(BOOKMARK_FILE);
  try {
    console.log(`readBookmarkFileSync: 読み込み開始 filePath="${filePath}"`);
    const content = fsSync.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    console.log(`readBookmarkFileSync: 読み込み成功 keys=${Object.keys(parsed).length}`);
    return parsed;
  } catch (error) {
    console.error('ブックマークファイルの読み込み中にエラーが発生しました（同期）:', error);
    console.error('エラー詳細:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && 'code' in error) {
      console.error('エラーコード:', (error as NodeJS.ErrnoException).code);
    }
    return {};
  }
}

/**
 * 同期バージョン - ブックマークファイルを書き込む
 * (同期操作が必要な既存のコードで使用)
 */
export function writeBookmarkFileSync(bookmarkData: BookmarkData): void {
  const filePath = getPublicFilePath(BOOKMARK_FILE);
  try {
    console.log(`writeBookmarkFileSync: 書き込み開始 filePath="${filePath}", keys=${Object.keys(bookmarkData).length}`);
    fsSync.writeFileSync(filePath, JSON.stringify(bookmarkData, null, 2), 'utf8');
    console.log(`writeBookmarkFileSync: 書き込み成功`);
  } catch (error) {
    console.error('ブックマークファイルの書き込み中にエラーが発生しました（同期）:', error);
    console.error('エラー詳細:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && 'code' in error) {
      console.error('エラーコード:', (error as NodeJS.ErrnoException).code);
    }
    throw error;
  }
}

/**
 * 同期バージョン - 単一のブックマークを更新する
 */
export function updateBookmarkSync(fileName: string, content: string): void {
  const bookmarks = readBookmarkFileSync();
  bookmarks[fileName] = removeControlCharacters(content);
  writeBookmarkFileSync(bookmarks);
}

/**
 * publicディレクトリ内のすべての.txtファイルのリストを取得する
 * @returns ファイル名のリスト（.txt拡張子なし）
 */
export async function listTextFiles(): Promise<string[]> {
  const publicPath = path.join(process.cwd(), PUBLIC_DIR);
  try {
    const files = await fs.readdir(publicPath);
    return files
      .filter(file => file.endsWith('.txt'))
      .map(file => file.replace('.txt', ''))
      .sort();
  } catch (error) {
    console.error('テキストファイルのリスト取得中にエラーが発生しました:', error);
    return [];
  }
}

/**
 * 存在しないファイルのブックマークを削除する
 * @returns クリーンアップされたブックマークの数
 */
export async function cleanupBookmarks(): Promise<number> {
  const bookmarks = await readBookmarkFile();
  const textFiles = await listTextFiles();
  const textFileSet = new Set(textFiles);

  let cleanedCount = 0;
  const cleanedBookmarks: BookmarkData = {};

  for (const [fileName, content] of Object.entries(bookmarks)) {
    if (textFileSet.has(fileName)) {
      cleanedBookmarks[fileName] = content;
    } else {
      cleanedCount++;
      console.log(`削除されたファイルのブックマークを削除: ${fileName}`);
    }
  }

  if (cleanedCount > 0) {
    await writeBookmarkFile(cleanedBookmarks);
  }

  return cleanedCount;
}

/**
 * 存在するすべてのテキストファイルに対してブックマークエントリを初期化する
 * 既存のブックマークは保持し、新しいファイルには空文字列のエントリを追加する
 * @returns 追加されたブックマークの数
 */
export async function initializeBookmarks(): Promise<number> {
  const bookmarks = await readBookmarkFile();
  const textFiles = await listTextFiles();

  let addedCount = 0;
  let updated = false;

  for (const fileName of textFiles) {
    if (!(fileName in bookmarks)) {
      bookmarks[fileName] = '';
      addedCount++;
      updated = true;
      console.log(`新しいファイルのブックマークを初期化: ${fileName}`);
    }
  }

  if (updated) {
    await writeBookmarkFile(bookmarks);
  }

  return addedCount;
}

/**
 * ブックマークを同期する：存在しないファイルのエントリを削除し、新しいファイルのエントリを追加
 * @returns {cleaned: number, added: number} クリーンアップと追加されたブックマークの数
 */
export async function syncBookmarks(): Promise<{ cleaned: number; added: number }> {
  const bookmarks = await readBookmarkFile();
  const textFiles = await listTextFiles();
  const textFileSet = new Set(textFiles);

  let cleanedCount = 0;
  let addedCount = 0;
  const syncedBookmarks: BookmarkData = {};

  // 既存のブックマークをチェック（存在するファイルのみ保持）
  for (const [fileName, content] of Object.entries(bookmarks)) {
    if (textFileSet.has(fileName)) {
      syncedBookmarks[fileName] = content;
    } else {
      cleanedCount++;
      console.log(`削除されたファイルのブックマークを削除: ${fileName}`);
    }
  }

  // 新しいファイルのブックマークを追加
  for (const fileName of textFiles) {
    if (!(fileName in syncedBookmarks)) {
      syncedBookmarks[fileName] = '';
      addedCount++;
      console.log(`新しいファイルのブックマークを初期化: ${fileName}`);
    }
  }

  if (cleanedCount > 0 || addedCount > 0) {
    await writeBookmarkFile(syncedBookmarks);
  }

  return { cleaned: cleanedCount, added: addedCount };
}
