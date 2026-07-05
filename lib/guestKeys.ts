import { STORAGE_KEYS, GUEST_KEY_HEADERS } from '@/lib/constants';

/**
 * Guest bring-your-own API keys. Keys live only in the browser's localStorage
 * and are attached to paid requests via headers. When a paid request fails,
 * call sites use promptGuestKeyOnFailure to open the key modal (GUEST_KEY_REQUIRED_EVENT) --
 * whether the key was missing or a stored key was rejected. After a key is saved,
 * GUEST_KEY_UPDATED_EVENT fires; AI explanations re-run automatically, other
 * actions resume on the next interaction.
 */
export type GuestKeyKind = 'gemini' | 'tts' | 'translate';

export const GUEST_KEY_REQUIRED_EVENT = 'guestKeyRequired';
export const GUEST_KEY_UPDATED_EVENT = 'guestKeyUpdated';

const STORAGE_KEY_BY_KIND: Record<GuestKeyKind, string> = {
  gemini: STORAGE_KEYS.GUEST_GEMINI_KEY,
  tts: STORAGE_KEYS.GUEST_TTS_KEY,
  translate: STORAGE_KEYS.GUEST_TRANSLATE_KEY,
};

const HEADER_BY_KIND: Record<GuestKeyKind, string> = {
  gemini: GUEST_KEY_HEADERS.GEMINI,
  tts: GUEST_KEY_HEADERS.TTS,
  translate: GUEST_KEY_HEADERS.TRANSLATE,
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

// Clears every stored guest key. Called once a real session is detected so a
// signed-in owner never carries a stale guest key from an earlier guest session.
export function clearGuestKeys(): void {
  if (typeof window === 'undefined') return;
  (Object.keys(STORAGE_KEY_BY_KIND) as GuestKeyKind[]).forEach((kind) => {
    localStorage.removeItem(STORAGE_KEY_BY_KIND[kind]);
  });
}

async function serverRequestedGuestKey(
  kind: GuestKeyKind,
  response: Response
): Promise<boolean> {
  if (response.status !== 401) return false;
  const info = await response.json().catch(() => null);
  return info?.requiresGuestKey === kind;
}

/**
 * Handle a failed paid-endpoint response by opening the key modal when either
 * the server reported a missing key (401 requiresGuestKey) or a stored key was
 * rejected (any failure while a key is set). Guest keys are cleared once a
 * session is detected, so in practice this only affects guests. Returns true if
 * it prompted.
 */
export async function promptGuestKeyOnFailure(
  kind: GuestKeyKind,
  response: Response
): Promise<boolean> {
  const needsKey = await serverRequestedGuestKey(kind, response);
  if (!needsKey && !getGuestKey(kind)) return false;
  promptGuestKey(kind);
  return true;
}
