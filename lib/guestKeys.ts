import { STORAGE_KEYS, GUEST_KEY_HEADERS } from '@/lib/constants';

/**
 * Guest bring-your-own API keys. Keys live only in the browser's localStorage
 * and are attached to paid requests via headers. Call sites dispatch
 * GUEST_KEY_REQUIRED_EVENT when the server reports a missing key; the modal host
 * listens for it and, once saved, fires GUEST_KEY_UPDATED_EVENT so the original
 * action can retry.
 */
export type GuestKeyKind = 'gemini' | 'tts';

export const GUEST_KEY_REQUIRED_EVENT = 'guestKeyRequired';
export const GUEST_KEY_UPDATED_EVENT = 'guestKeyUpdated';

const STORAGE_KEY_BY_KIND: Record<GuestKeyKind, string> = {
  gemini: STORAGE_KEYS.GUEST_GEMINI_KEY,
  tts: STORAGE_KEYS.GUEST_TTS_KEY,
};

const HEADER_BY_KIND: Record<GuestKeyKind, string> = {
  gemini: GUEST_KEY_HEADERS.GEMINI,
  tts: GUEST_KEY_HEADERS.TTS,
};

export function getGuestKey(kind: GuestKeyKind): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_BY_KIND[kind]);
}

export function setGuestKey(kind: GuestKeyKind, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_BY_KIND[kind], value);
  window.dispatchEvent(new CustomEvent(GUEST_KEY_UPDATED_EVENT, { detail: { kind } }));
}

export function guestKeyHeaders(kind: GuestKeyKind): Record<string, string> {
  const key = getGuestKey(kind);
  return key ? { [HEADER_BY_KIND[kind]]: key } : {};
}

export function promptGuestKey(kind: GuestKeyKind): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(GUEST_KEY_REQUIRED_EVENT, { detail: { kind } }));
}
