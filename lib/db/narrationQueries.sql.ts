import { sql } from './connection';
import type { QueryResult } from './schema';
import type { NarrationCue } from '@/lib/types';

export interface NarrationRow {
  audio_key: string;
  unit_count: number;
  cues: (NarrationCue | null)[];
}

function firstRow<T>(result: QueryResult<T>): T | null {
  const rows: unknown = result && 'rows' in result && Array.isArray(result.rows) ? result.rows : result;
  return Array.isArray(rows) && rows.length > 0 ? (rows[0] as T) : null;
}

export async function getNarration(
  fileName: string,
  directory: string
): Promise<NarrationRow | null> {
  const result = await sql<NarrationRow>`
    SELECT audio_key, unit_count, cues
    FROM narration
    WHERE file_name = ${fileName} AND directory = ${directory}
  `;
  return firstRow<NarrationRow>(result);
}

export async function upsertNarration(entry: {
  fileName: string;
  directory: string;
  audioKey: string;
  unitCount: number;
  cues: (NarrationCue | null)[];
}): Promise<void> {
  await sql`
    INSERT INTO narration (file_name, directory, audio_key, unit_count, cues, created_at, updated_at)
    VALUES (
      ${entry.fileName}, ${entry.directory}, ${entry.audioKey}, ${entry.unitCount},
      ${JSON.stringify(entry.cues)}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT (file_name, directory)
    DO UPDATE SET
      audio_key = ${entry.audioKey},
      unit_count = ${entry.unitCount},
      cues = ${JSON.stringify(entry.cues)}::jsonb,
      updated_at = CURRENT_TIMESTAMP
  `;
}
