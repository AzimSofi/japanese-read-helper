/**
 * Individual Book API Routes
 *
 * GET /api/books/[id] - Get a single book by ID
 * PUT /api/books/[id] - Update a book
 * DELETE /api/books/[id] - Delete a book
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Mark as dynamic to prevent static generation during build
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/books/[id]
 *
 * Get a single book with all related data
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { orderIndex: 'asc' },
        },
        processingHistory: {
          orderBy: { processedAt: 'desc' },
        },
        userBookmarks: {
          where: { userId: 'default' },
        },
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ book });
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/books/[id]
 *
 * Update a book's metadata
 *
 * Body:
 * {
 *   title?: string;
 *   author?: string;
 *   textFilePath?: string;
 * }
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { title, author, textFilePath } = body;

    const book = await prisma.book.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(author && { author }),
        ...(textFilePath && { textFilePath }),
      },
      include: {
        images: true,
        processingHistory: true,
      },
    });

    return NextResponse.json({
      message: 'Book updated successfully',
      book,
    });
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Failed to update book', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/books/[id]
 *
 * Delete a book and all related data (cascades to images, history, bookmarks)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    await prisma.book.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Book deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Failed to delete book', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
