import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/vocabulary/[id] - Get a specific vocabulary entry
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const entry = await prisma.vocabularyEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, message: 'Vocabulary entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (error) {
    console.error('Error fetching vocabulary entry:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch vocabulary entry' },
      { status: 500 }
    );
  }
}

// PUT /api/vocabulary/[id] - Update a vocabulary entry (mainly notes)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes, word, reading } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (notes !== undefined) updateData.notes = notes;
    if (word !== undefined) updateData.word = word;
    if (reading !== undefined) updateData.reading = reading;

    const entry = await prisma.vocabularyEntry.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Vocabulary entry updated',
      entry,
    });
  } catch (error) {
    console.error('Error updating vocabulary entry:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update vocabulary entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/vocabulary/[id] - Delete a vocabulary entry
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.vocabularyEntry.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Vocabulary entry deleted',
    });
  } catch (error) {
    console.error('Error deleting vocabulary entry:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete vocabulary entry' },
      { status: 500 }
    );
  }
}
