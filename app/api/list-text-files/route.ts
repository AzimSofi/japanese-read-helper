/**
 * publicディレクトリ内のすべてのテキストファイルを構造化データとしてリストするAPIルート
 * All text files now stored in and listed from Vercel Postgres database
 */

import { NextResponse } from 'next/server';
import { getAllTextEntries, initializeBookmarksForFiles } from '@/lib/db/queries';
import type { TextFileListResponse } from '@/lib/types';

export async function GET(): Promise<NextResponse<any>> {
  try {
    // Get all text files from database
    const { directories, filesByDirectory } = await getAllTextEntries();

    // Initialize bookmarks for any files that don't have them yet
    for (const directory of directories) {
      const files = filesByDirectory[directory] || [];
      await initializeBookmarksForFiles(files, directory);
    }

    // Flatten files into directory/filename format for backward compatibility
    const flatFiles: string[] = [];
    directories.forEach(dir => {
      const files = filesByDirectory[dir] || [];
      files.forEach(file => {
        flatFiles.push(`${dir}/${file}`);
      });
    });

    return NextResponse.json({
      directories,
      filesByDirectory,
      files: flatFiles, // Add flat array for backward compatibility
    });
  } catch (error) {
    console.error('Error reading text files:', error);
    return NextResponse.json({
      directories: [],
      filesByDirectory: {},
      files: []
    });
  }
}
