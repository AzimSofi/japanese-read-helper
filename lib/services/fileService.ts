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
 * サブディレクトリ対応: fileName が '/' を含む場合、それをパスとして扱う
 * 例: "bookv1-rephrase/readable-code.txt" -> "public/bookv1-rephrase/readable-code.txt"
 */
export function getPublicFilePath(fileName: string): string {
  const fullPath = path.join(process.cwd(), PUBLIC_DIR, fileName);
  console.log(`getPublicFilePath: fileName="${fileName}" -> fullPath="${fullPath}"`);
  return fullPath;
}

/**
 * ディレクトリからブックマークファイルのパスを取得する
 * @param directory - ディレクトリ名（空文字列の場合はルート）
 * @returns ブックマークファイルの完全パス
 */
export function getBookmarkFilePath(directory: string = ''): string {
  if (directory) {
    return path.join(process.cwd(), PUBLIC_DIR, directory, BOOKMARK_FILE);
  }
  return path.join(process.cwd(), PUBLIC_DIR, BOOKMARK_FILE);
}

/**
 * publicディレクトリからテキストファイルを読み込む
 * @param fileName - ファイル名（.txt拡張子なし）
 * @returns ファイルの内容（文字列）、ファイルが存在しない場合は空文字列
 *
 * Supports both old flat structure (directory/file.txt)
 * and new nested structure (directory/file/file.txt)
 */
export async function readTextFile(fileName: string): Promise<string> {
  // Try old flat structure first
  const flatPath = getPublicFilePath(`${fileName}.txt`);

  try {
    console.log(`readTextFile: 読み込み開始 (flat) filePath="${flatPath}"`);
    const content = await fs.readFile(flatPath, 'utf8');
    console.log(`readTextFile: 読み込み成功 (flat) length=${content.length}`);
    return content;
  } catch (error) {
    // If flat structure fails, try new nested structure
    // Extract the base filename from the path (last segment)
    const parts = fileName.split('/');
    const baseFileName = parts[parts.length - 1];
    const nestedPath = getPublicFilePath(`${fileName}/${baseFileName}.txt`);

    try {
      console.log(`readTextFile: 読み込み開始 (nested) filePath="${nestedPath}"`);
      const content = await fs.readFile(nestedPath, 'utf8');
      console.log(`readTextFile: 読み込み成功 (nested) length=${content.length}`);
      return content;
    } catch (nestedError) {
      console.error(`ファイル ${fileName} の読み込み中にエラーが発生しました (both structures tried):`, nestedError);
      console.error('エラー詳細:', nestedError instanceof Error ? nestedError.message : String(nestedError));
      if (nestedError instanceof Error && 'code' in nestedError) {
        console.error('エラーコード:', (nestedError as NodeJS.ErrnoException).code);
      }
      return '';
    }
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
 * @param directory - ディレクトリ名（空文字列の場合はルート）
 * @returns ブックマークデータオブジェクト、ファイルが存在しない場合は空オブジェクト
 */
export async function readBookmarkFile(directory: string = ''): Promise<BookmarkData> {
  const filePath = getBookmarkFilePath(directory);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`ブックマークファイルの読み込み中にエラーが発生しました (directory: ${directory}):`, error);
    return {};
  }
}

/**
 * ファイルパスからディレクトリとファイル名を分離する
 * @param filePath - ファイルパス（例: "bookv1-rephrase/readable-code" または "readable-code"）
 * @returns {directory: string, fileName: string}
 */
function splitFilePath(filePath: string): { directory: string; fileName: string } {
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash === -1) {
    return { directory: '', fileName: filePath };
  }
  return {
    directory: filePath.substring(0, lastSlash),
    fileName: filePath.substring(lastSlash + 1)
  };
}

/**
 * 特定のファイルのブックマークを読み込む
 * @param filePath - ファイルパス（例: "bookv1-rephrase/readable-code" または "readable-code"）
 * @returns ブックマークの内容、見つからない場合は空文字列
 */
export async function readBookmark(filePath: string): Promise<string> {
  const { directory, fileName } = splitFilePath(filePath);
  const bookmarks = await readBookmarkFile(directory);
  return bookmarks[fileName] || '';
}

/**
 * ブックマークデータをJSONファイルに書き込む（非同期バージョン）
 * @param bookmarkData - 完全なブックマークデータオブジェクト
 * @param directory - ディレクトリ名（空文字列の場合はルート）
 */
export async function writeBookmarkFile(
  bookmarkData: BookmarkData,
  directory: string = ''
): Promise<void> {
  const filePath = getBookmarkFilePath(directory);
  await fs.writeFile(filePath, JSON.stringify(bookmarkData, null, 2), 'utf8');
}

/**
 * 単一のブックマークエントリを更新する
 * @param filePath - ファイルパス（例: "bookv1-rephrase/readable-code" または "readable-code"）
 * @param content - 保存するブックマークの内容
 */
export async function updateBookmark(
  filePath: string,
  content: string
): Promise<void> {
  const { directory, fileName } = splitFilePath(filePath);
  const bookmarks = await readBookmarkFile(directory);
  bookmarks[fileName] = removeControlCharacters(content);
  await writeBookmarkFile(bookmarks, directory);
}

/**
 * 同期バージョン - ブックマークファイルを読み込む
 * (同期操作が必要な既存のコードで使用)
 * @param directory - ディレクトリ名（空文字列の場合はルート）
 */
export function readBookmarkFileSync(directory: string = ''): BookmarkData {
  const filePath = getBookmarkFilePath(directory);
  try {
    console.log(`readBookmarkFileSync: 読み込み開始 filePath="${filePath}"`);
    const content = fsSync.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    console.log(`readBookmarkFileSync: 読み込み成功 keys=${Object.keys(parsed).length}`);
    return parsed;
  } catch (error) {
    console.error(`ブックマークファイルの読み込み中にエラーが発生しました（同期, directory: ${directory}）:`, error);
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
 * @param directory - ディレクトリ名（空文字列の場合はルート）
 */
export function writeBookmarkFileSync(bookmarkData: BookmarkData, directory: string = ''): void {
  const filePath = getBookmarkFilePath(directory);
  try {
    console.log(`writeBookmarkFileSync: 書き込み開始 filePath="${filePath}", keys=${Object.keys(bookmarkData).length}`);
    fsSync.writeFileSync(filePath, JSON.stringify(bookmarkData, null, 2), 'utf8');
    console.log(`writeBookmarkFileSync: 書き込み成功`);
  } catch (error) {
    console.error(`ブックマークファイルの書き込み中にエラーが発生しました（同期, directory: ${directory}）:`, error);
    console.error('エラー詳細:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && 'code' in error) {
      console.error('エラーコード:', (error as NodeJS.ErrnoException).code);
    }
    throw error;
  }
}

/**
 * 同期バージョン - 単一のブックマークを更新する
 * @param filePath - ファイルパス（例: "bookv1-rephrase/readable-code" または "readable-code"）
 * @param content - 保存するブックマークの内容
 */
export function updateBookmarkSync(filePath: string, content: string): void {
  const { directory, fileName } = splitFilePath(filePath);
  const bookmarks = readBookmarkFileSync(directory);
  bookmarks[fileName] = removeControlCharacters(content);
  writeBookmarkFileSync(bookmarks, directory);
}

/**
 * publicディレクトリ内のサブディレクトリ一覧を取得する
 * @returns ディレクトリ名のリスト
 */
export async function listDirectories(): Promise<string[]> {
  const publicPath = path.join(process.cwd(), PUBLIC_DIR);
  try {
    const entries = await fs.readdir(publicPath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort();
  } catch (error) {
    console.error('ディレクトリのリスト取得中にエラーが発生しました:', error);
    return [];
  }
}

/**
 * 特定のディレクトリ内の.txtファイルのリストを取得する
 * @param directory - ディレクトリ名（空文字列の場合はルート）
 * @returns ファイル名のリスト（.txt拡張子なし、ディレクトリ名なし）
 */
export async function listTextFilesInDirectory(directory: string = ''): Promise<string[]> {
  const dirPath = directory
    ? path.join(process.cwd(), PUBLIC_DIR, directory)
    : path.join(process.cwd(), PUBLIC_DIR);

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Look for .txt file inside book directory (new structure)
        const bookDir = path.join(dirPath, entry.name);
        try {
          const bookFiles = await fs.readdir(bookDir);
          const txtFile = bookFiles.find(f => f.endsWith('.txt'));
          if (txtFile) {
            files.push(txtFile.replace('.txt', ''));
          }
        } catch {
          // Skip directories that can't be read
          continue;
        }
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        // Also support old flat structure for backward compatibility
        files.push(entry.name.replace('.txt', ''));
      }
    }

    return files.sort();
  } catch (error) {
    console.error(`ディレクトリ ${directory || 'root'} 内のテキストファイルのリスト取得中にエラーが発生しました:`, error);
    return [];
  }
}

/**
 * publicディレクトリ内のすべての.txtファイルを構造化データとして取得する
 * @returns {directories: string[], filesByDirectory: Record<string, string[]>}
 */
export async function listTextFiles(): Promise<{
  directories: string[];
  filesByDirectory: Record<string, string[]>;
}> {
  const directories = await listDirectories();
  const filesByDirectory: Record<string, string[]> = {};

  // 各ディレクトリ内のファイルを取得
  for (const dir of directories) {
    const files = await listTextFilesInDirectory(dir);
    if (files.length > 0) {
      filesByDirectory[dir] = files;
    }
  }

  return {
    directories,
    filesByDirectory
  };
}

/**
 * 特定のディレクトリ内の存在しないファイルのブックマークを削除する
 * @param directory - ディレクトリ名（空文字列の場合はルート）
 * @returns クリーンアップされたブックマークの数
 */
export async function cleanupBookmarksInDirectory(directory: string = ''): Promise<number> {
  const bookmarks = await readBookmarkFile(directory);
  const textFiles = await listTextFilesInDirectory(directory);
  const textFileSet = new Set(textFiles);

  let cleanedCount = 0;
  const cleanedBookmarks: BookmarkData = {};

  for (const [fileName, content] of Object.entries(bookmarks)) {
    if (textFileSet.has(fileName)) {
      cleanedBookmarks[fileName] = content;
    } else {
      cleanedCount++;
      console.log(`削除されたファイルのブックマークを削除 (${directory || 'root'}): ${fileName}`);
    }
  }

  if (cleanedCount > 0) {
    await writeBookmarkFile(cleanedBookmarks, directory);
  }

  return cleanedCount;
}

/**
 * すべてのディレクトリの存在しないファイルのブックマークを削除する
 * @returns クリーンアップされたブックマークの数
 */
export async function cleanupBookmarks(): Promise<number> {
  const { directories } = await listTextFiles();
  let totalCleaned = 0;

  // 各ディレクトリのブックマークをクリーンアップ
  for (const dir of directories) {
    const cleaned = await cleanupBookmarksInDirectory(dir);
    totalCleaned += cleaned;
  }

  return totalCleaned;
}

/**
 * 特定のディレクトリ内の存在するすべてのテキストファイルに対してブックマークエントリを初期化する
 * @param directory - ディレクトリ名（空文字列の場合はルート）
 * @returns 追加されたブックマークの数
 */
export async function initializeBookmarksInDirectory(directory: string = ''): Promise<number> {
  const bookmarks = await readBookmarkFile(directory);
  const textFiles = await listTextFilesInDirectory(directory);

  let addedCount = 0;
  let updated = false;

  for (const fileName of textFiles) {
    if (!(fileName in bookmarks)) {
      bookmarks[fileName] = '';
      addedCount++;
      updated = true;
      console.log(`新しいファイルのブックマークを初期化 (${directory || 'root'}): ${fileName}`);
    }
  }

  if (updated) {
    await writeBookmarkFile(bookmarks, directory);
  }

  return addedCount;
}

/**
 * すべてのディレクトリの存在するすべてのテキストファイルに対してブックマークエントリを初期化する
 * @returns 追加されたブックマークの数
 */
export async function initializeBookmarks(): Promise<number> {
  const { directories } = await listTextFiles();
  let totalAdded = 0;

  // 各ディレクトリのブックマークを初期化
  for (const dir of directories) {
    const added = await initializeBookmarksInDirectory(dir);
    totalAdded += added;
  }

  return totalAdded;
}

/**
 * 特定のディレクトリのブックマークを同期する
 * @param directory - ディレクトリ名（空文字列の場合はルート）
 * @returns {cleaned: number, added: number}
 */
export async function syncBookmarksInDirectory(
  directory: string = ''
): Promise<{ cleaned: number; added: number }> {
  const bookmarks = await readBookmarkFile(directory);
  const textFiles = await listTextFilesInDirectory(directory);
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
      console.log(`削除されたファイルのブックマークを削除 (${directory || 'root'}): ${fileName}`);
    }
  }

  // 新しいファイルのブックマークを追加
  for (const fileName of textFiles) {
    if (!(fileName in syncedBookmarks)) {
      syncedBookmarks[fileName] = '';
      addedCount++;
      console.log(`新しいファイルのブックマークを初期化 (${directory || 'root'}): ${fileName}`);
    }
  }

  if (cleanedCount > 0 || addedCount > 0) {
    await writeBookmarkFile(syncedBookmarks, directory);
  }

  return { cleaned: cleanedCount, added: addedCount };
}

/**
 * すべてのディレクトリのブックマークを同期する
 * @returns {cleaned: number, added: number} クリーンアップと追加されたブックマークの数
 */
export async function syncBookmarks(): Promise<{ cleaned: number; added: number }> {
  const { directories } = await listTextFiles();
  let totalCleaned = 0;
  let totalAdded = 0;

  // 各ディレクトリのブックマークを同期
  for (const dir of directories) {
    const { cleaned, added } = await syncBookmarksInDirectory(dir);
    totalCleaned += cleaned;
    totalAdded += added;
  }

  return { cleaned: totalCleaned, added: totalAdded };
}
