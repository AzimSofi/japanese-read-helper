import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { upsertTextEntry, upsertBookmark, initializeBookmarksForFiles } from '@/lib/db/queries';

interface TextEntryUpload {
  fileName: string;
  directory?: string;
  content: string;
}

interface UploadResult {
  fileName: string;
  directory: string;
  success: boolean;
  error?: string;
}

/**
 * Consolidated admin API route
 * Handles text entries, bookmarks, and bulk operations with action routing
 *
 * POST /api/admin?action=text-entries - Upload/update text entry
 * POST /api/admin?action=bookmarks - Create/update bookmark
 * POST /api/admin?action=bulk-seed - Bulk upload multiple entries
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'text-entries') {
    return handleTextEntry(request);
  } else if (action === 'bookmarks') {
    return handleBookmark(request);
  } else if (action === 'bulk-seed') {
    return handleBulkSeed(request);
  }

  return NextResponse.json(
    {
      success: false,
      message: 'Invalid action. Use action=text-entries, action=bookmarks, or action=bulk-seed',
    },
    { status: 400 }
  );
}

// Handler for text entry upload/update
async function handleTextEntry(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, directory = 'bookv2-furigana', content } = body;

    // Validate required fields
    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'fileName is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'content is required and must be a string',
        },
        { status: 400 }
      );
    }

    // Upsert text entry
    await upsertTextEntry(fileName, content, directory);

    // Initialize empty bookmark for this file
    await initializeBookmarksForFiles([fileName], directory);

    return NextResponse.json({
      success: true,
      message: `Text entry for ${directory}/${fileName} created/updated successfully`,
      stats: {
        fileName,
        directory,
        contentLength: content.length,
      },
    });
  } catch (error) {
    console.error('Error in handleTextEntry:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// Handler for bookmark creation/update
async function handleBookmark(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, directory = 'bookv2-furigana', bookmarkText } = body;

    // Validate required fields
    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'fileName is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (bookmarkText === undefined || typeof bookmarkText !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'bookmarkText is required and must be a string (can be empty)',
        },
        { status: 400 }
      );
    }

    // Upsert bookmark
    await upsertBookmark(fileName, bookmarkText, directory);

    return NextResponse.json({
      success: true,
      message: `Bookmark for ${directory}/${fileName} created/updated successfully`,
      bookmark: {
        fileName,
        directory,
        bookmarkText,
      },
    });
  } catch (error) {
    console.error('Error in handleBookmark:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// Handler for bulk upload
async function handleBulkSeed(request: NextRequest) {
  try {
    const body = await request.json();
    const { entries } = body;

    // Validate entries array
    if (!Array.isArray(entries)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'entries must be an array',
        },
        { status: 400 }
      );
    }

    if (entries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          message: 'entries array cannot be empty',
        },
        { status: 400 }
      );
    }

    const results: UploadResult[] = [];
    let succeeded = 0;
    let failed = 0;

    // Process each entry
    for (const entry of entries) {
      const { fileName, directory = 'bookv2-furigana', content } = entry as TextEntryUpload;

      // Validate individual entry
      if (!fileName || typeof fileName !== 'string') {
        results.push({
          fileName: fileName || 'unknown',
          directory: directory || 'bookv2-furigana',
          success: false,
          error: 'fileName is required and must be a string',
        });
        failed++;
        continue;
      }

      if (!content || typeof content !== 'string') {
        results.push({
          fileName,
          directory: directory || 'bookv2-furigana',
          success: false,
          error: 'content is required and must be a string',
        });
        failed++;
        continue;
      }

      // Attempt to upsert
      try {
        await upsertTextEntry(fileName, content, directory);
        await initializeBookmarksForFiles([fileName], directory);
        results.push({
          fileName,
          directory,
          success: true,
        });
        succeeded++;
      } catch (error) {
        results.push({
          fileName,
          directory,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: failed === 0,
      message: `Bulk upload completed: ${succeeded} succeeded, ${failed} failed`,
      stats: {
        total: entries.length,
        succeeded,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error('Error in handleBulkSeed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
