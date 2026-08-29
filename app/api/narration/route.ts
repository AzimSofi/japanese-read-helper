/**
 * Narration manifest for one text variant of a book.
 *
 * The recording itself is private, so this returns a short-lived presigned URL
 * rather than a durable one. Requires a session: the recordings are purchased
 * audiobooks and must not be reachable by the guest preview.
 */

import { NextResponse } from 'next/server';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getNarration } from '@/lib/db/narrationQueries.sql';
import { isAuthenticated } from '@/lib/auth/apiSession';

export const dynamic = 'force-dynamic';

// Long enough to listen through a full book without the URL expiring mid-seek,
// short enough that a copied link is not a durable handout.
const SIGNED_URL_TTL_SECONDS = 12 * 60 * 60;

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('fileName');
  const directory = searchParams.get('directory');
  if (!fileName || !directory) {
    return NextResponse.json({ error: 'fileName and directory are required' }, { status: 400 });
  }

  const bucket = process.env.NARRATION_AUDIO_BUCKET;
  if (!bucket) {
    console.error('NARRATION_AUDIO_BUCKET is not configured');
    return NextResponse.json({ error: 'Narration storage is not configured' }, { status: 500 });
  }

  try {
    const narration = await getNarration(fileName, directory);
    if (!narration) {
      return NextResponse.json({ error: 'No narration for this text' }, { status: 404 });
    }

    const audioUrl = await getSignedUrl(
      new S3Client({}),
      new GetObjectCommand({ Bucket: bucket, Key: narration.audio_key }),
      { expiresIn: SIGNED_URL_TTL_SECONDS }
    );

    return NextResponse.json({
      audioUrl,
      unitCount: narration.unit_count,
      cues: narration.cues,
    });
  } catch (error) {
    console.error('Failed to build narration manifest:', error);
    return NextResponse.json({ error: 'Failed to load narration' }, { status: 500 });
  }
}
