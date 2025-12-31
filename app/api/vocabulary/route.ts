import { NextResponse } from 'next/server';
import { getVocabularyEntries, createVocabularyEntry } from '@/lib/db/vocabularyQueries.sql';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word') || undefined;
    const fileName = searchParams.get('fileName') || undefined;
    const directory = searchParams.get('directory') || undefined;
    const today = searchParams.get('today') === 'true';

    const entries = await getVocabularyEntries({
      word,
      fileName,
      directory,
      today,
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { word, reading, sentence, fileName, directory, paragraphText, notes } = body;

    if (!word || !sentence || !fileName || !directory) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: word, sentence, fileName, directory',
        },
        { status: 400 }
      );
    }

    const entry = await createVocabularyEntry({
      word,
      reading,
      sentence,
      fileName,
      directory,
      paragraphText,
      notes,
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
