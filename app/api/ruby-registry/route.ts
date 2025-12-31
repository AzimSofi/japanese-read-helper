import { NextResponse } from 'next/server';
import {
  readRubyRegistry,
  upsertRubyEntry,
  deleteRubyEntry,
  ignoreSuggestion
} from '@/lib/services/fileService';
import type { RubyRegistryResponse, RubyEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse<RubyRegistryResponse>> {
  const { searchParams } = new URL(request.url);
  const directory = searchParams.get('directory');
  const bookName = searchParams.get('bookName');

  if (!directory || !bookName) {
    return NextResponse.json({
      success: false,
      message: 'directory and bookName are required'
    }, { status: 400 });
  }

  if (directory.includes('..') || bookName.includes('..')) {
    return NextResponse.json({
      success: false,
      message: 'Invalid path'
    }, { status: 400 });
  }

  try {
    const registry = await readRubyRegistry(directory, bookName);
    if (!registry) {
      return NextResponse.json({
        success: true,
        registry: {
          bookTitle: bookName,
          entries: [],
          suggestions: []
        },
        message: 'No registry found, returning empty'
      });
    }

    return NextResponse.json({
      success: true,
      registry,
      message: 'Registry loaded'
    });
  } catch (error) {
    console.error('Error reading ruby registry:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to read registry'
    }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse<RubyRegistryResponse>> {
  try {
    const body = await request.json();
    const { directory, bookName, entry } = body as {
      directory: string;
      bookName: string;
      entry: RubyEntry;
    };

    if (!directory || !bookName || !entry) {
      return NextResponse.json({
        success: false,
        message: 'directory, bookName, and entry are required'
      }, { status: 400 });
    }

    if (!entry.kanji || !entry.reading) {
      return NextResponse.json({
        success: false,
        message: 'entry must have kanji and reading'
      }, { status: 400 });
    }

    const registry = await upsertRubyEntry(directory, bookName, {
      ...entry,
      source: entry.source || 'user',
      note: entry.note || ''
    });

    return NextResponse.json({
      success: true,
      registry,
      message: 'Entry saved'
    });
  } catch (error) {
    console.error('Error saving ruby entry:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to save entry'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse<RubyRegistryResponse>> {
  const { searchParams } = new URL(request.url);
  const directory = searchParams.get('directory');
  const bookName = searchParams.get('bookName');
  const kanji = searchParams.get('kanji');
  const type = searchParams.get('type') || 'entry';

  if (!directory || !bookName || !kanji) {
    return NextResponse.json({
      success: false,
      message: 'directory, bookName, and kanji are required'
    }, { status: 400 });
  }

  try {
    let registry;
    if (type === 'suggestion') {
      registry = await ignoreSuggestion(directory, bookName, kanji);
    } else {
      registry = await deleteRubyEntry(directory, bookName, kanji);
    }

    if (!registry) {
      return NextResponse.json({
        success: false,
        message: 'Registry not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      registry,
      message: type === 'suggestion' ? 'Suggestion ignored' : 'Entry deleted'
    });
  } catch (error) {
    console.error('Error deleting ruby entry:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete'
    }, { status: 500 });
  }
}
