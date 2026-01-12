import * as fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { PUBLIC_DIR, BOOKMARK_FILE } from '@/lib/constants';
import type { BookmarkData, RubyRegistry, RubyEntry } from '@/lib/types';

function removeControlCharacters(text: string): string {
  return text.replace(/[\r\n]/g, '').trim();
}

export function getPublicFilePath(fileName: string): string {
  return path.join(process.cwd(), PUBLIC_DIR, fileName);
}

export function getBookmarkFilePath(directory: string = ''): string {
  if (directory) {
    return path.join(process.cwd(), PUBLIC_DIR, directory, BOOKMARK_FILE);
  }
  return path.join(process.cwd(), PUBLIC_DIR, BOOKMARK_FILE);
}

export async function readTextFile(fileName: string): Promise<string> {
  const flatPath = getPublicFilePath(`${fileName}.txt`);

  try {
    return await fs.readFile(flatPath, 'utf8');
  } catch {
    const parts = fileName.split('/');
    const baseFileName = parts[parts.length - 1];
    const nestedPath = getPublicFilePath(`${fileName}/${baseFileName}.txt`);

    try {
      return await fs.readFile(nestedPath, 'utf8');
    } catch {
      return '';
    }
  }
}

export async function writeTextFile(fileName: string, content: string): Promise<void> {
  const filePath = getPublicFilePath(`${fileName}.txt`);
  await fs.writeFile(filePath, content, 'utf8');
}

export async function readBookmarkFile(directory: string = ''): Promise<BookmarkData> {
  const filePath = getBookmarkFilePath(directory);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

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

export async function readBookmark(filePath: string): Promise<string> {
  const { directory, fileName } = splitFilePath(filePath);
  const bookmarks = await readBookmarkFile(directory);
  return bookmarks[fileName] || '';
}

export async function writeBookmarkFile(bookmarkData: BookmarkData, directory: string = ''): Promise<void> {
  const filePath = getBookmarkFilePath(directory);
  await fs.writeFile(filePath, JSON.stringify(bookmarkData, null, 2), 'utf8');
}

export async function updateBookmark(filePath: string, content: string): Promise<void> {
  const { directory, fileName } = splitFilePath(filePath);
  const bookmarks = await readBookmarkFile(directory);
  bookmarks[fileName] = removeControlCharacters(content);
  await writeBookmarkFile(bookmarks, directory);
}

export function readBookmarkFileSync(directory: string = ''): BookmarkData {
  const filePath = getBookmarkFilePath(directory);
  try {
    const content = fsSync.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function writeBookmarkFileSync(bookmarkData: BookmarkData, directory: string = ''): void {
  const filePath = getBookmarkFilePath(directory);
  fsSync.writeFileSync(filePath, JSON.stringify(bookmarkData, null, 2), 'utf8');
}

export function updateBookmarkSync(filePath: string, content: string): void {
  const { directory, fileName } = splitFilePath(filePath);
  const bookmarks = readBookmarkFileSync(directory);
  bookmarks[fileName] = removeControlCharacters(content);
  writeBookmarkFileSync(bookmarks, directory);
}

export async function listDirectories(): Promise<string[]> {
  const publicPath = path.join(process.cwd(), PUBLIC_DIR);
  try {
    const entries = await fs.readdir(publicPath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort();
  } catch {
    return [];
  }
}

export async function listTextFilesInDirectory(directory: string = ''): Promise<string[]> {
  const dirPath = directory
    ? path.join(process.cwd(), PUBLIC_DIR, directory)
    : path.join(process.cwd(), PUBLIC_DIR);

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const bookDir = path.join(dirPath, entry.name);
        try {
          const bookFiles = await fs.readdir(bookDir);
          const txtFile = bookFiles.find(f => f.endsWith('.txt'));
          if (txtFile) {
            files.push(txtFile.replace('.txt', ''));
          }
        } catch {
          continue;
        }
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        files.push(entry.name.replace('.txt', ''));
      }
    }

    return files.sort();
  } catch {
    return [];
  }
}

export async function listTextFiles(): Promise<{
  directories: string[];
  filesByDirectory: Record<string, string[]>;
}> {
  const directories = await listDirectories();
  const filesByDirectory: Record<string, string[]> = {};

  for (const dir of directories) {
    const files = await listTextFilesInDirectory(dir);
    if (files.length > 0) {
      filesByDirectory[dir] = files;
    }
  }

  return { directories, filesByDirectory };
}

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
    }
  }

  if (cleanedCount > 0) {
    await writeBookmarkFile(cleanedBookmarks, directory);
  }

  return cleanedCount;
}

export async function cleanupBookmarks(): Promise<number> {
  const { directories } = await listTextFiles();
  let totalCleaned = 0;

  for (const dir of directories) {
    const cleaned = await cleanupBookmarksInDirectory(dir);
    totalCleaned += cleaned;
  }

  return totalCleaned;
}

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
    }
  }

  if (updated) {
    await writeBookmarkFile(bookmarks, directory);
  }

  return addedCount;
}

export async function initializeBookmarks(): Promise<number> {
  const { directories } = await listTextFiles();
  let totalAdded = 0;

  for (const dir of directories) {
    const added = await initializeBookmarksInDirectory(dir);
    totalAdded += added;
  }

  return totalAdded;
}

export async function syncBookmarksInDirectory(
  directory: string = ''
): Promise<{ cleaned: number; added: number }> {
  const bookmarks = await readBookmarkFile(directory);
  const textFiles = await listTextFilesInDirectory(directory);
  const textFileSet = new Set(textFiles);

  let cleanedCount = 0;
  let addedCount = 0;
  const syncedBookmarks: BookmarkData = {};

  for (const [fileName, content] of Object.entries(bookmarks)) {
    if (textFileSet.has(fileName)) {
      syncedBookmarks[fileName] = content;
    } else {
      cleanedCount++;
    }
  }

  for (const fileName of textFiles) {
    if (!(fileName in syncedBookmarks)) {
      syncedBookmarks[fileName] = '';
      addedCount++;
    }
  }

  if (cleanedCount > 0 || addedCount > 0) {
    await writeBookmarkFile(syncedBookmarks, directory);
  }

  return { cleaned: cleanedCount, added: addedCount };
}

export async function syncBookmarks(): Promise<{ cleaned: number; added: number }> {
  const { directories } = await listTextFiles();
  let totalCleaned = 0;
  let totalAdded = 0;

  for (const dir of directories) {
    const { cleaned, added } = await syncBookmarksInDirectory(dir);
    totalCleaned += cleaned;
    totalAdded += added;
  }

  return { cleaned: totalCleaned, added: totalAdded };
}

const RUBY_REGISTRY_FILE = 'ruby-registry.json';

function getRubyRegistryPath(directory: string, bookName: string): string {
  return path.join(process.cwd(), PUBLIC_DIR, directory, bookName, RUBY_REGISTRY_FILE);
}

export async function readRubyRegistry(directory: string, bookName: string): Promise<RubyRegistry | null> {
  const filePath = getRubyRegistryPath(directory, bookName);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function writeRubyRegistry(
  directory: string,
  bookName: string,
  registry: RubyRegistry
): Promise<void> {
  const filePath = getRubyRegistryPath(directory, bookName);
  await fs.writeFile(filePath, JSON.stringify(registry, null, 2), 'utf8');
}

export async function upsertRubyEntry(
  directory: string,
  bookName: string,
  entry: RubyEntry
): Promise<RubyRegistry> {
  let registry = await readRubyRegistry(directory, bookName);

  if (!registry) {
    registry = {
      bookTitle: bookName,
      entries: [],
      suggestions: []
    };
  }

  const existingIndex = registry.entries.findIndex(e => e.kanji === entry.kanji);
  if (existingIndex >= 0) {
    registry.entries[existingIndex] = entry;
  } else {
    registry.entries.push(entry);
  }

  registry.suggestions = registry.suggestions.filter(s => s.kanji !== entry.kanji);

  await writeRubyRegistry(directory, bookName, registry);
  return registry;
}

export async function deleteRubyEntry(
  directory: string,
  bookName: string,
  kanji: string
): Promise<RubyRegistry | null> {
  const registry = await readRubyRegistry(directory, bookName);
  if (!registry) return null;

  registry.entries = registry.entries.filter(e => e.kanji !== kanji);
  await writeRubyRegistry(directory, bookName, registry);
  return registry;
}

export async function ignoreSuggestion(
  directory: string,
  bookName: string,
  kanji: string
): Promise<RubyRegistry | null> {
  const registry = await readRubyRegistry(directory, bookName);
  if (!registry) return null;

  registry.suggestions = registry.suggestions.filter(s => s.kanji !== kanji);
  await writeRubyRegistry(directory, bookName, registry);
  return registry;
}
