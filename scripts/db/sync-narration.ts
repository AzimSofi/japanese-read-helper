#!/usr/bin/env npx tsx
/**
 * Loads a narration build into the narration table, pairing it with the S3 key
 * of the recording. See scripts/README.md for the full workflow.
 *
 *   npx tsx scripts/db/sync-narration.ts \
 *     --manifest "<book>.narration.json" \
 *     --audio-key "<book>.m4a" \
 *     --directory "bookv2-furigana" \
 *     --file-name "<book>"
 */

import * as fs from 'fs';
import { upsertNarration } from '@/lib/db/narrationQueries.sql';
import type { NarrationCue } from '@/lib/types';

function readArg(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= process.argv.length) return null;
  const value = process.argv[index + 1];
  if (value.startsWith('--')) {
    console.error(`--${name} needs a value, found "${value}".`);
    process.exit(1);
  }
  return value;
}

function parseBuild(path: string): { unitCount: number; cues: (NarrationCue | null)[] } {
  const parsed: unknown = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (!parsed || typeof parsed !== 'object') {
    console.error(`${path} is not an object.`);
    process.exit(1);
  }
  const { unitCount, cues } = parsed as Record<string, unknown>;
  if (typeof unitCount !== 'number' || !Number.isInteger(unitCount) || unitCount <= 0) {
    console.error(`${path} has no usable unitCount.`);
    process.exit(1);
  }
  if (!Array.isArray(cues) || cues.length !== unitCount) {
    console.error(`${path} declares ${unitCount} units but has ${Array.isArray(cues) ? cues.length : 0} cues.`);
    process.exit(1);
  }
  return { unitCount, cues: cues as (NarrationCue | null)[] };
}

async function main(): Promise<void> {
  const manifestPath = readArg('manifest');
  const audioKey = readArg('audio-key');
  const directory = readArg('directory');
  const fileName = readArg('file-name');

  if (!manifestPath || !audioKey || !directory || !fileName) {
    console.error('Usage: --manifest <file> --audio-key <key> --directory <dir> --file-name <name>');
    process.exit(1);
  }

  const { unitCount, cues } = parseBuild(manifestPath);
  await upsertNarration({ fileName, directory, audioKey, unitCount, cues });

  const covered = cues.filter(Boolean).length;
  console.log(`synced ${directory}/${fileName}`);
  console.log(`  audio key : ${audioKey}`);
  console.log(`  units     : ${unitCount}`);
  console.log(`  covered   : ${covered} (${((covered / unitCount) * 100).toFixed(1)}%)`);
}

main().catch((error) => {
  console.error('sync failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
