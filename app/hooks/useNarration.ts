'use client';

import { useEffect, useState } from 'react';
import { bookAssetPath } from '@/lib/utils/bookAssetPath';
import type { NarrationCue, NarrationManifest } from '@/lib/types';

function parseCue(value: unknown): NarrationCue | null {
  if (!value || typeof value !== 'object') return null;
  const { start, end } = value as Record<string, unknown>;
  if (typeof start !== 'number' || typeof end !== 'number') return null;
  if (!isFinite(start) || !isFinite(end) || end <= start) return null;
  return { start, end };
}

function parseManifest(value: unknown): NarrationManifest | null {
  if (!value || typeof value !== 'object') return null;
  const { audioUrl, cues } = value as Record<string, unknown>;
  if (typeof audioUrl !== 'string' || !audioUrl) return null;
  if (!Array.isArray(cues)) return null;
  return { audioUrl, cues: cues.map(parseCue) };
}

/**
 * Loads the narration manifest that pairs a book with its audiobook recording.
 * Returns null whenever the book has no recording, which keeps playback on TTS.
 */
export function useNarration(fileName: string | null, directory: string | null): NarrationManifest | null {
  const [manifest, setManifest] = useState<NarrationManifest | null>(null);

  useEffect(() => {
    if (!fileName || !directory) {
      setManifest(null);
      return;
    }

    const controller = new AbortController();

    const loadManifest = async () => {
      try {
        const response = await fetch(bookAssetPath(directory, fileName, '.narration.json'), {
          signal: controller.signal,
        });
        if (!response.ok) {
          setManifest(null);
          return;
        }
        setManifest(parseManifest(await response.json()));
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Failed to load narration manifest:', error);
        setManifest(null);
      }
    };

    loadManifest();
    return () => controller.abort();
  }, [fileName, directory]);

  return manifest;
}
