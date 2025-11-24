/**
 * Text entries management API route
 * Handles CRUD operations for database text entries
 */

import { NextResponse } from 'next/server';
import {
  getTextEntry,
  getAllTextEntries,
  deleteTextEntry,
  upsertTextEntry
} from '@/lib/db/queries';
import { readTextFile } from '@/lib/services/fileService';

// Mark as dynamic to prevent static generation during build
export const dynamic = 'force-dynamic';

/**
 * GET /api/text-entries?fileName=X&directory=Y
 * Retrieve specific text entry or list all entries
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('fileName');
  const directory = searchParams.get('directory');

  try {
    // If fileName and directory are provided, get specific entry
    if (fileName && directory) {
      // Validation (prevent directory traversal attacks)
      if (fileName.includes('..') || directory.includes('..')) {
        return NextResponse.json(
          { message: 'Invalid file name or directory' },
          { status: 400 }
        );
      }

      const content = await getTextEntry(fileName, directory);
      return NextResponse.json({
        success: true,
        data: { fileName, directory, content }
      });
    }

    // Otherwise, return all entries
    const allEntries = await getAllTextEntries();
    return NextResponse.json({
      success: true,
      data: allEntries
    });
  } catch (error) {
    console.error('Error fetching text entry:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch text entry',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/text-entries?fileName=X&directory=Y
 * Remove specific text entry from database
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('fileName');
  const directory = searchParams.get('directory');

  if (!fileName || !directory) {
    return NextResponse.json(
      {
        success: false,
        message: 'Missing required parameters: fileName and directory'
      },
      { status: 400 }
    );
  }

  // Validation (prevent directory traversal attacks)
  if (fileName.includes('..') || directory.includes('..')) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid file name or directory'
      },
      { status: 400 }
    );
  }

  try {
    await deleteTextEntry(fileName, directory);
    console.log(`Deleted text entry: ${directory}/${fileName}`);

    return NextResponse.json({
      success: true,
      message: 'Text entry deleted successfully',
      deleted: { fileName, directory }
    });
  } catch (error) {
    console.error('Error deleting text entry:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete text entry',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/text-entries
 * Update/re-migrate specific file from filesystem to database
 * Body: { fileName: string, directory: string }
 */
export async function PUT(request: Request) {
  if (request.headers.get('content-type') !== 'application/json') {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid Content-Type'
      },
      { status: 400 }
    );
  }

  try {
    const { fileName, directory } = await request.json();

    if (!fileName || !directory) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: fileName and directory'
        },
        { status: 400 }
      );
    }

    // Validation (prevent directory traversal attacks)
    if (fileName.includes('..') || directory.includes('..')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid file name or directory'
        },
        { status: 400 }
      );
    }

    // Read file from filesystem
    const filePath = `${directory}/${fileName}`;
    const content = await readTextFile(filePath);

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          message: `File not found or empty: ${filePath}`
        },
        { status: 404 }
      );
    }

    // Update database entry
    await upsertTextEntry(fileName, content, directory);
    console.log(`Updated text entry: ${directory}/${fileName} (${content.length} chars)`);

    return NextResponse.json({
      success: true,
      message: 'Text entry updated successfully',
      updated: {
        fileName,
        directory,
        charCount: content.length
      }
    });
  } catch (error) {
    console.error('Error updating text entry:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update text entry',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
