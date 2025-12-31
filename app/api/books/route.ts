/**
 * Books API Routes
 *
 * GET /api/books - List all books
 * POST /api/books - Create a new book
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBooks, createBook } from '@/lib/db/bookQueries.sql';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName') || undefined;

    const books = await getBooks(fileName);

    return NextResponse.json({
      books,
      count: books.length,
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      author,
      fileName,
      textFilePath,
      originalEpubName,
      processingHistory,
      images,
    } = body;

    if (!title || !author || !fileName || !textFilePath || !originalEpubName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const book = await createBook({
      title,
      author,
      fileName,
      textFilePath,
      originalEpubName,
      processingHistory,
      images,
    });

    return NextResponse.json({
      message: 'Book created successfully',
      book,
    });
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Failed to create book', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
