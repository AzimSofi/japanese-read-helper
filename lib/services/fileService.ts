/**
 * publicディレクトリ内のファイルの読み書きを行う中央集権的なファイルサービス
 */

import * as fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { PUBLIC_DIR, BOOKMARK_FILE } from '@/lib/constants';
import type { BookmarkData } from '@/lib/types';

/**
 * publicディレクトリ内の完全なファイルパスを取得する
 */
export function getPublicFilePath(fileName: string): string {
  return path.join(process.cwd(), PUBLIC_DIR, fileName);
}

/**
 * publicディレクトリからテキストファイルを読み込む
 * @param fileName - ファイル名（.txt拡張子なし）
 * @returns ファイルの内容（文字列）、ファイルが存在しない場合は空文字列
 */
export async function readTextFile(fileName: string): Promise<string> {
  const filePath = getPublicFilePath(`${fileName}.txt`);
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.error(`ファイル ${fileName} の読み込み中にエラーが発生しました:`, error);
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
  bookmarks[fileName] = content;
  await writeBookmarkFile(bookmarks);
}

/**
 * 同期バージョン - ブックマークファイルを読み込む
 * (同期操作が必要な既存のコードで使用)
 */
export function readBookmarkFileSync(): BookmarkData {
  const filePath = getPublicFilePath(BOOKMARK_FILE);
  try {
    const content = fsSync.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('ブックマークファイルの読み込み中にエラーが発生しました（同期）:', error);
    return {};
  }
}

/**
 * 同期バージョン - ブックマークファイルを書き込む
 * (同期操作が必要な既存のコードで使用)
 */
export function writeBookmarkFileSync(bookmarkData: BookmarkData): void {
  const filePath = getPublicFilePath(BOOKMARK_FILE);
  fsSync.writeFileSync(filePath, JSON.stringify(bookmarkData, null, 2), 'utf8');
}

/**
 * 同期バージョン - 単一のブックマークを更新する
 */
export function updateBookmarkSync(fileName: string, content: string): void {
  const bookmarks = readBookmarkFileSync();
  bookmarks[fileName] = content;
  writeBookmarkFileSync(bookmarks);
}
