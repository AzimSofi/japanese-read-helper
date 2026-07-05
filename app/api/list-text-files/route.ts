import { NextResponse } from 'next/server';
import { getAllTextEntries } from '@/lib/db/queries';
import { isAuthenticated } from '@/lib/auth/apiSession';
import { PUBLIC_BOOKS } from '@/lib/publicBooks';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authed = await isAuthenticated();
    const { directories, filesByDirectory } = await getAllTextEntries();

    if (!authed) {
      const available = PUBLIC_BOOKS.filter((book) =>
        (filesByDirectory[book.directory] || []).includes(book.fileName)
      );
      return NextResponse.json({
        directories: available.map((book) => book.directory),
        filesByDirectory: Object.fromEntries(
          available.map((book) => [book.directory, [book.fileName]])
        ),
        files: available.map((book) => `${book.directory}/${book.fileName}`),
      });
    }

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
    return NextResponse.json({ error: 'Failed to load text files' }, { status: 500 });
  }
}
