import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// GET /api/vocabulary - List all vocabulary entries with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');
    const fileName = searchParams.get('fileName');
    const directory = searchParams.get('directory');
    const today = searchParams.get('today') === 'true';

    // Build filter conditions
    const where: Record<string, unknown> = {};

    if (word) {
      where.word = { contains: word };
    }

    if (fileName) {
      where.fileName = fileName;
    }

    if (directory) {
      where.directory = directory;
    }

    if (today) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const entries = await prisma.vocabularyEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      entries,
      count: entries.length,
    });
  } catch (error) {
    console.error('Error fetching vocabulary entries:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch vocabulary entries' },
      { status: 500 }
    );
  }
}

// POST /api/vocabulary - Create a new vocabulary entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { word, reading, sentence, fileName, directory, paragraphText, notes } = body;

    // Validate required fields
    if (!word || !sentence || !fileName || !directory) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: word, sentence, fileName, directory',
        },
        { status: 400 }
      );
    }

    const entry = await prisma.vocabularyEntry.create({
      data: {
        word,
        reading: reading || null,
        sentence,
        fileName,
        directory,
        paragraphText: paragraphText || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Vocabulary entry created',
      entry,
    });
  } catch (error) {
    console.error('Error creating vocabulary entry:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create vocabulary entry' },
      { status: 500 }
    );
  }
}
