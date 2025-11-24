/**
 * Books API Routes
 *
 * GET /api/books - List all books
 * POST /api/books - Create a new book
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Mark as dynamic to prevent static generation during build
export const dynamic = 'force-dynamic';

/**
 * GET /api/books
 *
 * List all books with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');

    const books = await prisma.book.findMany({
      where: fileName ? { fileName } : undefined,
      include: {
        images: {
          orderBy: { orderIndex: 'asc' },
        },
        processingHistory: {
          orderBy: { processedAt: 'desc' },
          take: 1, // Only get the most recent processing history
        },
        userBookmarks: {
          where: { userId: 'default' }, // For now, just default user
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

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

/**
 * POST /api/books
 *
 * Create a new book with metadata from EPUB processing
 *
 * Body:
 * {
 *   title: string;
 *   author: string;
 *   fileName: string;
 *   textFilePath: string;
 *   originalEpubName: string;
 *   processingHistory: {
 *     filterMode: 'all' | 'n3';
 *     hiraganaStyle: 'full' | 'long-vowel';
 *     chaptersCount: number;
 *     fileSize: number;
 *     imageCount: number;
 *   };
 *   images: Array<{
 *     fileName: string;
 *     imagePath: string;
 *     orderIndex: number;
 *     chapterName?: string;
 *     altText?: string;
 *   }>;
 * }
 */
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

    // Validate required fields
    if (!title || !author || !fileName || !textFilePath || !originalEpubName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create book with related records in a transaction
    const book = await prisma.book.create({
      data: {
        title,
        author,
        fileName,
        textFilePath,
        originalEpubName,
        // Create processing history
        processingHistory: processingHistory
          ? {
              create: {
                filterMode: processingHistory.filterMode,
                hiraganaStyle: processingHistory.hiraganaStyle,
                chaptersCount: processingHistory.chaptersCount,
                fileSize: processingHistory.fileSize,
                imageCount: processingHistory.imageCount || 0,
              },
            }
          : undefined,
        // Create images
        images: images
          ? {
              create: images.map((img: {
                fileName: string;
                imagePath: string;
                orderIndex: number;
                chapterName?: string;
                altText?: string;
              }) => ({
                fileName: img.fileName,
                imagePath: img.imagePath,
                orderIndex: img.orderIndex,
                chapterName: img.chapterName,
                altText: img.altText,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        processingHistory: true,
      },
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
