'use client';

import { useEffect, useState } from 'react';
import { bookAssetPath } from '@/lib/utils/bookAssetPath';
import type { NarrationCue, NarrationManifest } from '@/lib/types';

function parseCue(value: unknown): NarrationCue | null {
  if (!value || typeof value !== 'object') return null;
  const { start, end } = value as Record<string, unknown>;
  if (typeof start !== 'number' || typeof end !== 'number') return null;
  if (!isFinite(start) || !isFinite(end)) return null;
  if (start < 0 || end <= start) return null;
  return { start, end };
}

function parseManifest(value: unknown, url: string): NarrationManifest | null {
  if (!value || typeof value !== 'object') {
    console.error(`Narration manifest is not an object: ${url}`);
    return null;
  }
  const { audioUrl, unitCount, cues } = value as Record<string, unknown>;
  if (typeof audioUrl !== 'string' || !audioUrl) {
    console.error(`Narration manifest has no audioUrl: ${url}`);
    return null;
  }
  if (typeof unitCount !== 'number' || !Number.isInteger(unitCount) || unitCount <= 0) {
    console.error(`Narration manifest has no usable unitCount: ${url}`);
    return null;
  }
  if (!Array.isArray(cues)) {
    console.error(`Narration manifest has no cues array: ${url}`);
    return null;
  }
  // cues is what gets indexed by unit, so a short array would quietly drop the
  // tail of the book even though unitCount looked right.
  if (cues.length !== unitCount) {
    console.error(`Narration manifest has ${cues.length} cues for ${unitCount} units: ${url}`);
    return null;
  }

  const parsed = cues.map(parseCue);
  const dropped = parsed.filter((cue, index) => !cue && cues[index] !== null).length;
  if (dropped > 0) {
    console.error(`Narration manifest has ${dropped} malformed cues, those units fall back to TTS: ${url}`);
  }
  if (!parsed.some(Boolean)) {
    console.error(`Narration manifest covers no units: ${url}`);
    return null;
  }
  return { audioUrl, unitCount, cues: parsed };
}

/**
 * Loads the narration manifest that pairs a book with its audiobook recording.
 *
 * Returns null whenever the book has no usable recording, which keeps playback on
 * TTS. `unitCount` must match the reader's own unit count or the manifest is
 * rejected: cues are positional, so a re-processed book would otherwise play the
 * wrong audio for every line after the first inserted or removed paragraph.
 */
export function useNarration(
  fileName: string | null,
  directory: string | null,
  unitCount: number
): NarrationManifest | null {
  const [manifest, setManifest] = useState<NarrationManifest | null>(null);

  useEffect(() => {
    // Drop the previous book's manifest before anything else. Cues are positional,
    // so serving book A's cues against book B's units for even one render is the
    // exact mismatch unitCount exists to prevent.
    setManifest(null);
    if (!fileName || !directory || unitCount <= 0) return;

    const controller = new AbortController();
    const url = bookAssetPath(directory, fileName, '.narration.json');

    const loadManifest = async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!response.ok) {
          // 404 just means this book has no recording; anything else is a fault
          // worth seeing, since both downgrade silently to TTS.
          if (response.status !== 404) {
            console.error(`Narration manifest request failed (${response.status}): ${url}`);
          }
          return;
        }

        const parsed = parseManifest(await response.json(), url);
        if (controller.signal.aborted) return;
        if (parsed && parsed.unitCount !== unitCount) {
          console.error(
            `Narration manifest is stale: built for ${parsed.unitCount} units, book now has ${unitCount}. Rebuild it with scripts/audio/build-narration.ts.`
          );
          return;
        }
        setManifest(parsed);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(`Failed to load narration manifest: ${url}`, error);
      }
    };

    loadManifest();
    return () => controller.abort();
  }, [fileName, directory, unitCount]);

  return manifest;
}
