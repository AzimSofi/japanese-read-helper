import { NextRequest, NextResponse } from 'next/server';
import { getBookById, getBookImages, addBookImage } from '@/lib/db/bookQueries.sql';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const images = await getBookImages(id);

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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { fileName, imagePath, orderIndex, chapterName, altText } = body;

    if (!fileName || !imagePath || orderIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, imagePath, orderIndex' },
        { status: 400 }
      );
    }

    const book = await getBookById(id);
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const image = await addBookImage(id, {
      fileName,
      imagePath,
      orderIndex,
      chapterName,
      altText,
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
