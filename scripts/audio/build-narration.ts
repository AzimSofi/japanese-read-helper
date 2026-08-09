#!/usr/bin/env npx tsx
/**
 * Build a narration manifest from aligned audiobook timings.
 *
 * align-transcript.py emits cues keyed by transcript line. The reader instead
 * plays PlayableUnits, so this maps one onto the other and writes the manifest
 * the reader fetches, with null for any unit the recording does not cover.
 *
 * Usage:
 *   npx tsx scripts/audio/build-narration.ts \
 *     --timings "<book>.timings.json" \
 *     --text "public/bookv2-furigana/<book>/<book>-rephrase-furigana.txt" \
 *     --audio-url "https://cdn.example.com/<book>.m4a" \
 *     --out "public/bookv2-furigana/<book>.narration.json"
 */

import * as fs from 'fs';
import { buildPlayableUnits } from '@/lib/utils/buildPlayableUnits';
import { stripFurigana } from '@/lib/utils/furiganaParser';
import type { NarrationCue, NarrationManifest } from '@/lib/types';

interface TimingCue {
  start: number;
  end: number;
  text: string;
}

const SEARCH_WINDOW = 12;
const MAX_SPAN_LENGTH_RATIO = 1.6;
const MIN_SCORE = 0.6;
const DROPPED_PATTERN = /[\s。、「」『』（）()・！？!?…‥,.]/g;

function normalize(text: string): string {
  return stripFurigana(text).normalize('NFKC').replace(DROPPED_PATTERN, '');
}

function bigrams(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i++) {
    const gram = text.slice(i, i + 2);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}

/** Dice coefficient over character bigrams: order-aware enough, cheap, and no deps. */
function similarity(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftGrams = bigrams(left);
  const rightGrams = bigrams(right);
  let shared = 0;
  for (const [gram, count] of leftGrams) {
    shared += Math.min(count, rightGrams.get(gram) ?? 0);
  }
  return (2 * shared) / (left.length - 1 + right.length - 1);
}

function readArg(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= process.argv.length) return null;
  return process.argv[index + 1];
}

function matchCues(unitTexts: string[], cues: TimingCue[]): (NarrationCue | null)[] {
  const cueTexts = cues.map((cue) => normalize(cue.text));
  const matched: (NarrationCue | null)[] = [];
  let cursor = 0;

  for (const unitText of unitTexts) {
    if (!unitText) {
      matched.push(null);
      continue;
    }

    let bestScore = 0;
    let bestFrom = -1;
    let bestSpan = 1;
    // A unit can cover several cues when the reader merges lines the transcript
    // kept apart, so the span grows until it overshoots the unit's own length.
    for (let offset = 0; offset < SEARCH_WINDOW && cursor + offset < cues.length; offset++) {
      let joined = '';
      for (let span = 1; cursor + offset + span <= cues.length; span++) {
        joined += cueTexts[cursor + offset + span - 1];
        const score = similarity(unitText, joined);
        if (score > bestScore) {
          bestScore = score;
          bestFrom = cursor + offset;
          bestSpan = span;
        }
        if (joined.length >= unitText.length * MAX_SPAN_LENGTH_RATIO) break;
      }
    }

    if (bestFrom < 0 || bestScore < MIN_SCORE) {
      matched.push(null);
      continue;
    }
    matched.push({ start: cues[bestFrom].start, end: cues[bestFrom + bestSpan - 1].end });
    cursor = bestFrom + bestSpan;
  }

  return matched;
}

function main(): void {
  const timingsPath = readArg('timings');
  const textPath = readArg('text');
  const audioUrl = readArg('audio-url');
  const outPath = readArg('out');

  if (!timingsPath || !textPath || !audioUrl || !outPath) {
    console.error('Usage: --timings <file> --text <file> --audio-url <url> --out <file>');
    process.exit(1);
  }

  const cues: TimingCue[] = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
  // The reader parses paragraphs out of LF text, so CRLF source files would
  // otherwise collapse into a single unit.
  const content = fs.readFileSync(textPath, 'utf8').replace(/\r\n/g, '\n');
  const units = buildPlayableUnits(content);
  const matched = matchCues(units.map((unit) => normalize(unit.main)), cues);

  const manifest: NarrationManifest = { audioUrl, cues: matched };
  fs.writeFileSync(outPath, JSON.stringify(manifest), 'utf8');

  const covered = matched.filter(Boolean).length;
  console.log(`units:   ${units.length}`);
  console.log(`cues:    ${cues.length}`);
  console.log(`covered: ${covered} (${((covered / units.length) * 100).toFixed(1)}%)`);
  console.log(`wrote    ${outPath}`);
}

main();
