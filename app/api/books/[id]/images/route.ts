/**
 * Book Images API Routes
 *
 * GET /api/books/[id]/images - Get all images for a book
 * POST /api/books/[id]/images - Add a new image to a book
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Mark as dynamic to prevent static generation during build
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/books/[id]/images
 *
 * Get all images for a specific book
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const images = await prisma.bookImage.findMany({
      where: { bookId: id },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({
      images,
      count: images.length,
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/books/[id]/images
 *
 * Add a new image to a book
 *
 * Body:
 * {
 *   fileName: string;
 *   imagePath: string;
 *   orderIndex: number;
 *   chapterName?: string;
 *   altText?: string;
 * }
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { fileName, imagePath, orderIndex, chapterName, altText } = body;

    // Validate required fields
    if (!fileName || !imagePath || orderIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, imagePath, orderIndex' },
        { status: 400 }
      );
    }

    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id },
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Create image
    const image = await prisma.bookImage.create({
      data: {
        bookId: id,
        fileName,
        imagePath,
        orderIndex,
        chapterName,
        altText,
      },
    });

    return NextResponse.json({
      message: 'Image added successfully',
      image,
    });
  } catch (error) {
    console.error('Error adding image:', error);
    return NextResponse.json(
      { error: 'Failed to add image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
