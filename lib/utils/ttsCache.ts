import { API_ROUTES, type TTSVoiceGender } from '@/lib/constants';
import type { TTSRequest, TTSResponse } from '@/lib/types';
import { cleanTextForTTS } from '@/lib/utils/ttsTextCleaner';

interface FetchTTSParams {
  text: string;
  speed: number;
  voiceGender: TTSVoiceGender;
}

const MAX_ENTRIES = 60;
const audioByKey = new Map<string, string>();
const inFlightByKey = new Map<string, Promise<string>>();

function cacheKey({ text, speed, voiceGender }: FetchTTSParams): string {
  return `${voiceGender}|${speed}|${text}`;
}

function rememberAudio(key: string, audioBase64: string): void {
  if (audioByKey.has(key)) {
    audioByKey.delete(key);
  }
  audioByKey.set(key, audioBase64);
  if (audioByKey.size > MAX_ENTRIES) {
    const oldestKey = audioByKey.keys().next().value;
    if (oldestKey !== undefined) audioByKey.delete(oldestKey);
  }
}

async function synthesize({ text, speed, voiceGender }: FetchTTSParams): Promise<string> {
  const body: TTSRequest = { text, speed, voiceGender };
  const response = await fetch(API_ROUTES.TTS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`TTS request failed: ${response.status}`);
  }
  const data: TTSResponse = await response.json();
  if (!data.audioContent) {
    throw new Error(data.message || 'Empty audio content');
  }
  return data.audioContent;
}

/**
 * Returns base64 MP3 for the text, served from cache when possible.
 * Resolves to null when the text is empty after cleaning (nothing to speak).
 * Concurrent requests for the same key share a single network call.
 */
export async function fetchTTS(params: FetchTTSParams): Promise<string | null> {
  if (!cleanTextForTTS(params.text)) return null;

  const key = cacheKey(params);
  const cached = audioByKey.get(key);
  if (cached) {
    rememberAudio(key, cached);
    return cached;
  }

  const pending = inFlightByKey.get(key);
  if (pending) return pending;

  const request = synthesize(params)
    .then((audioBase64) => {
      inFlightByKey.delete(key);
      rememberAudio(key, audioBase64);
      return audioBase64;
    })
    .catch((error) => {
      inFlightByKey.delete(key);
      throw error;
    });

  inFlightByKey.set(key, request);
  return request;
}

export function clearTTSCache(): void {
  audioByKey.clear();
  inFlightByKey.clear();
}
