'use client';

import { useEffect, useState } from 'react';
import { bookVariantAssetPath } from '@/lib/utils/bookAssetPath';
import type { NarrationCue, NarrationManifest } from '@/lib/types';

export interface NarrationLoad {
  manifest: NarrationManifest | null;
  error: string | null;
}

const ABSENT: NarrationLoad = { manifest: null, error: null };

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
    console.error(`Narration manifest declares ${unitCount} units but has ${cues.length} cues: ${url}`);
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
 * Loads the narration recording paired with the text variant being read.
 *
 * Cues are positional, so the manifest is only usable when the book still starts
 * with the units it was built from. A shorter book is accepted because it is a
 * prefix -- that is how the guest preview arrives -- but a longer one means the
 * text was re-processed and every cue after the change would play the wrong line.
 */
export function useNarration(
  fileName: string | null,
  directory: string | null,
  unitCount: number
): NarrationLoad {
  const [load, setLoad] = useState<NarrationLoad>(ABSENT);

  useEffect(() => {
    // Drop the previous book's manifest before anything else. Cues are positional,
    // so serving book A's cues against book B's units for even one render is the
    // exact mismatch unitCount exists to prevent.
    setLoad(ABSENT);
    if (!fileName || !directory || unitCount <= 0) return;

    const controller = new AbortController();
    const url = bookVariantAssetPath(directory, fileName, '.narration.json');

    const fail = (message: string, detail: string) => {
      console.error(`${detail}: ${url}`);
      setLoad({ manifest: null, error: message });
    };

    const loadManifest = async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!response.ok) {
          // 404 just means this variant has no recording, which is the normal case.
          if (response.status === 404) return;
          fail('Audiobook recording could not be loaded', `Narration manifest request failed (${response.status})`);
          return;
        }
        // A guest is redirected to the login page, and a CDN can answer a missing
        // object with an HTML error body -- both arrive as a perfectly ok
        // response. Neither is a fault worth showing, so treat them as absent.
        if (!response.headers.get('content-type')?.includes('json')) return;

        const parsed = parseManifest(await response.json(), url);
        if (controller.signal.aborted) return;
        if (!parsed) {
          fail('Audiobook recording is unusable', 'Narration manifest failed validation');
          return;
        }
        if (parsed.unitCount < unitCount) {
          fail(
            'Audiobook recording is out of date',
            `Narration manifest is stale: built for ${parsed.unitCount} units, this text now has ${unitCount}. Rebuild it with scripts/audio/build-narration.ts`
          );
          return;
        }
        setLoad({ manifest: parsed, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(`Failed to load narration manifest: ${url}`, error);
        setLoad({ manifest: null, error: 'Audiobook recording could not be loaded' });
      }
    };

    loadManifest();
    return () => controller.abort();
  }, [fileName, directory, unitCount]);

  return load;
}
