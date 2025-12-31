import { sql } from './connection';
import type { VocabularyEntry, QueryResult } from './schema';
import { nanoid } from 'nanoid';

function normalizeResult<T>(result: QueryResult<T>): T[] {
  if (result && 'rows' in result && Array.isArray(result.rows)) {
    return result.rows;
  }
  if (Array.isArray(result)) {
    return result;
  }
  return [];
}

export interface VocabularyFilter {
  word?: string;
  fileName?: string;
  directory?: string;
  today?: boolean;
}

export interface CreateVocabularyInput {
  word: string;
  reading?: string;
  sentence: string;
  fileName: string;
  directory: string;
  paragraphText?: string;
  notes?: string;
}

export interface UpdateVocabularyInput {
  word?: string;
  reading?: string;
  sentence?: string;
  paragraphText?: string;
  notes?: string;
}

export async function getVocabularyEntries(filter?: VocabularyFilter): Promise<VocabularyEntry[]> {
  try {
    let result: QueryResult<VocabularyEntry>;

    if (!filter || Object.keys(filter).length === 0) {
      result = await sql<VocabularyEntry>`
        SELECT * FROM vocabulary_entries ORDER BY created_at DESC
      `;
    } else if (filter.today) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      if (filter.fileName && filter.directory) {
        result = await sql<VocabularyEntry>`
          SELECT * FROM vocabulary_entries
          WHERE created_at >= ${startOfDay} AND created_at <= ${endOfDay}
            AND file_name = ${filter.fileName} AND directory = ${filter.directory}
          ORDER BY created_at DESC
        `;
      } else if (filter.word) {
        result = await sql<VocabularyEntry>`
          SELECT * FROM vocabulary_entries
          WHERE created_at >= ${startOfDay} AND created_at <= ${endOfDay}
            AND word ILIKE ${'%' + filter.word + '%'}
          ORDER BY created_at DESC
        `;
      } else {
        result = await sql<VocabularyEntry>`
          SELECT * FROM vocabulary_entries
          WHERE created_at >= ${startOfDay} AND created_at <= ${endOfDay}
          ORDER BY created_at DESC
        `;
      }
    } else if (filter.word && filter.fileName && filter.directory) {
      result = await sql<VocabularyEntry>`
        SELECT * FROM vocabulary_entries
        WHERE word ILIKE ${'%' + filter.word + '%'}
          AND file_name = ${filter.fileName} AND directory = ${filter.directory}
        ORDER BY created_at DESC
      `;
    } else if (filter.fileName && filter.directory) {
      result = await sql<VocabularyEntry>`
        SELECT * FROM vocabulary_entries
        WHERE file_name = ${filter.fileName} AND directory = ${filter.directory}
        ORDER BY created_at DESC
      `;
    } else if (filter.word) {
      result = await sql<VocabularyEntry>`
        SELECT * FROM vocabulary_entries
        WHERE word ILIKE ${'%' + filter.word + '%'}
        ORDER BY created_at DESC
      `;
    } else if (filter.fileName) {
      result = await sql<VocabularyEntry>`
        SELECT * FROM vocabulary_entries
        WHERE file_name = ${filter.fileName}
        ORDER BY created_at DESC
      `;
    } else if (filter.directory) {
      result = await sql<VocabularyEntry>`
        SELECT * FROM vocabulary_entries
        WHERE directory = ${filter.directory}
        ORDER BY created_at DESC
      `;
    } else {
      result = await sql<VocabularyEntry>`
        SELECT * FROM vocabulary_entries ORDER BY created_at DESC
      `;
    }

    return normalizeResult(result);
  } catch (error) {
    console.error('Error fetching vocabulary entries:', error);
    throw error;
  }
}

export async function getVocabularyEntryById(id: string): Promise<VocabularyEntry | null> {
  try {
    const result = await sql<VocabularyEntry>`
      SELECT * FROM vocabulary_entries WHERE id = ${id}
    `;
    const entries = normalizeResult(result);
    return entries.length > 0 ? entries[0] : null;
  } catch (error) {
    console.error('Error fetching vocabulary entry by id:', error);
    throw error;
  }
}

export async function createVocabularyEntry(input: CreateVocabularyInput): Promise<VocabularyEntry> {
  try {
    const id = nanoid();
    const now = new Date();

    await sql`
      INSERT INTO vocabulary_entries (id, word, reading, sentence, file_name, directory, paragraph_text, notes, created_at, updated_at)
      VALUES (${id}, ${input.word}, ${input.reading || null}, ${input.sentence}, ${input.fileName}, ${input.directory}, ${input.paragraphText || null}, ${input.notes || null}, ${now}, ${now})
    `;

    const entry = await getVocabularyEntryById(id);
    if (!entry) {
      throw new Error('Failed to retrieve created vocabulary entry');
    }
    return entry;
  } catch (error) {
    console.error('Error creating vocabulary entry:', error);
    throw error;
  }
}

export async function updateVocabularyEntry(id: string, input: UpdateVocabularyInput): Promise<VocabularyEntry | null> {
  try {
    const now = new Date();

    await sql`
      UPDATE vocabulary_entries
      SET word = COALESCE(${input.word}, word),
          reading = COALESCE(${input.reading}, reading),
          sentence = COALESCE(${input.sentence}, sentence),
          paragraph_text = COALESCE(${input.paragraphText}, paragraph_text),
          notes = COALESCE(${input.notes}, notes),
          updated_at = ${now}
      WHERE id = ${id}
    `;

    return getVocabularyEntryById(id);
  } catch (error) {
    console.error('Error updating vocabulary entry:', error);
    throw error;
  }
}

export async function deleteVocabularyEntry(id: string): Promise<void> {
  try {
    await sql`DELETE FROM vocabulary_entries WHERE id = ${id}`;
  } catch (error) {
    console.error('Error deleting vocabulary entry:', error);
    throw error;
  }
}

export async function getTodayVocabularyEntries(): Promise<VocabularyEntry[]> {
  return getVocabularyEntries({ today: true });
}
