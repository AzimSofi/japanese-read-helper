import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { upsertTextEntry, initializeBookmarksForFiles } from '@/lib/db/queries';

/**
 * @swagger
 * /api/admin/text-entries:
 *   post:
 *     summary: Upload or update a text entry
 *     description: Creates or updates a text entry in the database. Automatically initializes an empty bookmark for the file.
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
 *               - content
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
 *               content:
 *                 type: string
 *                 description: Text content of the file
 *                 example: "< 今日は良い天気です。>> This is a good weather today. >> Today's weather is nice. >> The weather is pleasant today."
 *     responses:
 *       200:
 *         description: Text entry created/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     fileName:
 *                       type: string
 *                     directory:
 *                       type: string
 *                     contentLength:
 *                       type: number
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
    console.error('Error in POST /api/admin/text-entries:', error);
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
