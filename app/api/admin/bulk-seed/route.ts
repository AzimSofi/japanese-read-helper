import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { upsertTextEntry, initializeBookmarksForFiles } from '@/lib/db/queries';

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
 * @swagger
 * /api/admin/bulk-seed:
 *   post:
 *     summary: Bulk upload multiple text entries
 *     description: Upload multiple text entries at once. Each entry is processed independently.
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
 *               - entries
 *             properties:
 *               entries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - fileName
 *                     - content
 *                   properties:
 *                     fileName:
 *                       type: string
 *                     directory:
 *                       type: string
 *                       default: "bookv2-furigana"
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: Bulk upload completed (may include partial failures)
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
 *                     total:
 *                       type: number
 *                     succeeded:
 *                       type: number
 *                     failed:
 *                       type: number
 *                 results:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

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
    console.error('Error in POST /api/admin/bulk-seed:', error);
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
