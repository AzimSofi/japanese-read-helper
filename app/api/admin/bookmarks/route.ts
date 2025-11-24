import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { upsertBookmark } from '@/lib/db/queries';

/**
 * @swagger
 * /api/admin/bookmarks:
 *   post:
 *     summary: Create or update a bookmark
 *     description: Creates or updates a bookmark for a specific file
 *     tags:
 *       - Admin
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - bookmarkText
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Name of the file (without .txt extension)
 *                 example: "my-book"
 *               directory:
 *                 type: string
 *                 description: Directory containing the file
 *                 default: "bookv2-furigana"
 *                 example: "bookv2-furigana"
 *               bookmarkText:
 *                 type: string
 *                 description: The bookmark text/position marker
 *                 example: "< 今日は良い天気です。"
 *     responses:
 *       200:
 *         description: Bookmark created/updated successfully
 *       401:
 *         description: Unauthorized - invalid or missing API key
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

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
    console.error('Error in POST /api/admin/bookmarks:', error);
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
