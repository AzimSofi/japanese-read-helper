#!/usr/bin/env npx tsx
/**
 * Build a narration manifest from aligned audiobook timings.
 *
 * align-transcript.py emits cues keyed by transcript line. The reader instead
 * plays PlayableUnits, so this maps one onto the other and writes the manifest
 * the reader fetches, with null for any unit the recording does not cover.
 *
 * Flags are listed by --help; see scripts/README.md for the full workflow, the
 * manifest path the reader expects, and why --text must match the synced text.
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
const DEFAULT_MIN_COVERAGE = 0.9;
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
  // Single characters have no bigrams, so fall back to equality above.
  const totalGrams = left.length - 1 + right.length - 1;
  if (totalGrams <= 0) return 0;
  const leftGrams = bigrams(left);
  const rightGrams = bigrams(right);
  let shared = 0;
  for (const [gram, count] of leftGrams) {
    shared += Math.min(count, rightGrams.get(gram) ?? 0);
  }
  return (2 * shared) / totalGrams;
}

/** Same barricade the reader applies, so a truncated timings file fails loudly. */
function parseTimings(raw: string, path: string): TimingCue[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    console.error(`${path} is not a non-empty array of cues.`);
    process.exit(1);
  }
  return parsed.map((entry, index) => {
    const { start, end, text } = (entry ?? {}) as Record<string, unknown>;
    if (typeof start !== 'number' || typeof end !== 'number' || !isFinite(start) || !isFinite(end)) {
      console.error(`${path} cue ${index} has no finite start/end.`);
      process.exit(1);
    }
    if (typeof text !== 'string') {
      console.error(`${path} cue ${index} has no text.`);
      process.exit(1);
    }
    return { start, end, text };
  });
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

    const start = bestFrom < 0 ? 0 : cues[bestFrom].start;
    const end = bestFrom < 0 ? 0 : cues[bestFrom + bestSpan - 1].end;
    // The reader rejects non-positive spans, so never emit one it would silently
    // drop while this script still counted it as covered.
    if (bestFrom < 0 || bestScore < MIN_SCORE || end <= start) {
      matched.push(null);
      continue;
    }
    matched.push({ start, end });
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
    console.error('Usage: --timings <file> --text <file> --audio-url <url> --out <file> [--min-coverage <0-1>]');
    process.exit(1);
  }

  const cues = parseTimings(fs.readFileSync(timingsPath, 'utf8'), timingsPath);
  // The plain/furigana reader splits paragraphs on a blank LF line, so a CRLF
  // source would collapse into a single unit there. Rephrase text splits on any
  // newline and is unaffected, but both formats are accepted here.
  const content = fs.readFileSync(textPath, 'utf8').replace(/\r\n/g, '\n');
  const units = buildPlayableUnits(content);
  if (units.length === 0) {
    console.error(`No reader units parsed from ${textPath}; refusing to write a manifest.`);
    process.exit(1);
  }

  const matched = matchCues(units.map((unit) => normalize(unit.main)), cues);
  const covered = matched.filter(Boolean).length;
  const coverage = covered / units.length;

  console.log(`units:    ${units.length}`);
  console.log(`cues:     ${cues.length}`);
  console.log(`covered:  ${covered} (${(coverage * 100).toFixed(1)}%)`);

  const minCoverage = parseFloat(readArg('min-coverage') ?? `${DEFAULT_MIN_COVERAGE}`);
  if (coverage < minCoverage) {
    console.error(
      `Coverage ${(coverage * 100).toFixed(1)}% is below ${(minCoverage * 100).toFixed(1)}%. ` +
      'This usually means --text is not the text the transcript was aligned against. ' +
      'Pass --min-coverage to accept it anyway.'
    );
    process.exit(1);
  }

  const manifest: NarrationManifest = { audioUrl, unitCount: units.length, cues: matched };
  fs.writeFileSync(outPath, JSON.stringify(manifest), 'utf8');
  console.log(`wrote     ${outPath}`);
}

main();
