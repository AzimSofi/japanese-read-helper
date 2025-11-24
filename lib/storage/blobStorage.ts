/**
 * Blob Storage Utilities
 *
 * Provides unified interface for file storage:
 * - Development: Local filesystem (public/bookv2-furigana/)
 * - Production: Vercel Blob Storage
 */

import { put, del, list } from '@vercel/blob';
import { readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOCAL_STORAGE_PATH = path.join(process.cwd(), 'public', 'bookv2-furigana');

/**
 * Upload a file to storage
 *
 * @param fileName - Name of the file (e.g., "book-title.txt")
 * @param content - File content as string or Buffer
 * @param contentType - MIME type (default: text/plain)
 * @returns URL to access the file
 */
export async function uploadFile(
  fileName: string,
  content: string | Buffer,
  contentType: string = 'text/plain; charset=utf-8'
): Promise<string> {
  if (IS_PRODUCTION) {
    // Production: Upload to Vercel Blob
    const blob = await put(fileName, content, {
      access: 'public',
      contentType,
    });
    return blob.url;
  } else {
    // Development: Save to local filesystem
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
}

/**
 * Upload an image file to storage
 *
 * @param fileName - Name of the image file
 * @param buffer - Image data as Buffer
 * @param contentType - MIME type (e.g., "image/jpeg")
 * @returns URL to access the image
 */
export async function uploadImage(
  fileName: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string> {
  if (IS_PRODUCTION) {
    const blob = await put(fileName, buffer, {
      access: 'public',
      contentType,
    });
    return blob.url;
  } else {
    // Development: Save to local filesystem
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
}

/**
 * Read a file from storage
 *
 * @param fileName - Name of the file to read
 * @returns File content as string
 */
export async function readFileFromStorage(fileName: string): Promise<string> {
  if (IS_PRODUCTION) {
    // Production: Fetch from Vercel Blob URL
    // Note: In production, files are accessed via their blob URLs directly
    // This function is mainly for local development
    throw new Error('Reading from Vercel Blob should use the blob URL directly');
  } else {
    // Development: Read from local filesystem
    const filePath = path.join(LOCAL_STORAGE_PATH, fileName);
    return await readFile(filePath, 'utf-8');
  }
}

/**
 * Delete a file from storage
 *
 * @param fileUrl - Full URL or path to the file
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  if (IS_PRODUCTION) {
    // Production: Delete from Vercel Blob
    await del(fileUrl);
  } else {
    // Development: Delete from local filesystem
    // Extract filename from URL path
    const fileName = fileUrl.replace('/bookv2-furigana/', '');
    const filePath = path.join(LOCAL_STORAGE_PATH, fileName);

    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }
}

/**
 * List all files in a directory
 *
 * @param prefix - Directory prefix (e.g., "book-title/images/")
 * @returns Array of file URLs
 */
export async function listFiles(prefix?: string): Promise<string[]> {
  if (IS_PRODUCTION) {
    // Production: List from Vercel Blob
    const { blobs } = await list({
      prefix,
    });
    return blobs.map((blob) => blob.url);
  } else {
    // Development: List from local filesystem
    const fs = await import('fs/promises');
    const searchPath = prefix
      ? path.join(LOCAL_STORAGE_PATH, prefix)
      : LOCAL_STORAGE_PATH;

    if (!existsSync(searchPath)) {
      return [];
    }

    const files = await fs.readdir(searchPath, { recursive: true });
    return files
      .filter((file) => typeof file === 'string')
      .map((file) => `/bookv2-furigana/${prefix ? prefix + '/' : ''}${file}`);
  }
}

/**
 * Get the full storage path for a file
 *
 * @param fileName - Name of the file
 * @returns Full path or URL
 */
export function getStoragePath(fileName: string): string {
  if (IS_PRODUCTION) {
    // In production, paths will be Vercel Blob URLs
    // This is a placeholder - actual URLs are returned from upload functions
    return `blob:${fileName}`;
  } else {
    return `/bookv2-furigana/${fileName}`;
  }
}
