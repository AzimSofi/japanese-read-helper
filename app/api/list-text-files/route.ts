import { NextResponse } from 'next/server';
import { getAllTextEntries } from '@/lib/db/queries';
import type { TextFileListResponse } from '@/lib/types';

export async function GET(): Promise<NextResponse<TextFileListResponse>> {
  try {
    const { directories, filesByDirectory } = await getAllTextEntries();

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
      files: flatFiles,
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
