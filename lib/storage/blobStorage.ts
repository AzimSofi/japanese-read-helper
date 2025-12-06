/**
 * Blob Storage Utilities
 *
 * Provides unified interface for local file storage.
 * All files stored in public/bookv2-furigana/ directory.
 */

import { readFile, writeFile, unlink, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const LOCAL_STORAGE_PATH = path.join(process.cwd(), 'public', 'bookv2-furigana');

/**
 * Upload a file to storage
 *
 * @param fileName - Name of the file (e.g., "book-title.txt")
 * @param content - File content as string or Buffer
 * @param contentType - MIME type (unused, kept for API compatibility)
 * @returns URL to access the file
 */
export async function uploadFile(
  fileName: string,
  content: string | Buffer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contentType: string = 'text/plain; charset=utf-8'
): Promise<string> {
  const filePath = path.join(LOCAL_STORAGE_PATH, fileName);
  const dir = path.dirname(filePath);

  // Ensure directory exists
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // Write file
  await writeFile(filePath, content, 'utf-8');

  // Return public URL path
  return `/bookv2-furigana/${fileName}`;
}

/**
 * Upload an image file to storage
 *
 * @param fileName - Name of the image file
 * @param buffer - Image data as Buffer
 * @param contentType - MIME type (unused, kept for API compatibility)
 * @returns URL to access the image
 */
export async function uploadImage(
  fileName: string,
  buffer: Buffer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contentType: string = 'image/jpeg'
): Promise<string> {
  const filePath = path.join(LOCAL_STORAGE_PATH, fileName);
  const dir = path.dirname(filePath);

  // Ensure directory exists
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // Write image file
  await writeFile(filePath, buffer);

  // Return public URL path
  return `/bookv2-furigana/${fileName}`;
}

/**
 * Read a file from storage
 *
 * @param fileName - Name of the file to read
 * @returns File content as string
 */
export async function readFileFromStorage(fileName: string): Promise<string> {
  const filePath = path.join(LOCAL_STORAGE_PATH, fileName);
  return await readFile(filePath, 'utf-8');
}

/**
 * Delete a file from storage
 *
 * @param fileUrl - Full URL or path to the file
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  // Extract filename from URL path
  const fileName = fileUrl.replace('/bookv2-furigana/', '');
  const filePath = path.join(LOCAL_STORAGE_PATH, fileName);

  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}

/**
 * List all files in a directory
 *
 * @param prefix - Directory prefix (e.g., "book-title/images/")
 * @returns Array of file URLs
 */
export async function listFiles(prefix?: string): Promise<string[]> {
  const searchPath = prefix
    ? path.join(LOCAL_STORAGE_PATH, prefix)
    : LOCAL_STORAGE_PATH;

  if (!existsSync(searchPath)) {
    return [];
  }

  const files = await readdir(searchPath, { recursive: true });
  return files
    .filter((file) => typeof file === 'string')
    .map((file) => `/bookv2-furigana/${prefix ? prefix + '/' : ''}${file}`);
}

/**
 * Get the full storage path for a file
 *
 * @param fileName - Name of the file
 * @returns Full path
 */
export function getStoragePath(fileName: string): string {
  return `/bookv2-furigana/${fileName}`;
}
