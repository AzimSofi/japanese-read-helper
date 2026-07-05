'use client';

import { useEffect, useState } from 'react';
import { COLORS } from '@/lib/constants';
import {
  type GuestKeyKind,
  getGuestKey,
  setGuestKey,
  GUEST_KEY_REQUIRED_EVENT,
} from '@/lib/guestKeys';

const COPY: Record<GuestKeyKind, { title: string; help: string; link: string; linkLabel: string }> = {
  gemini: {
    title: 'AI explanations use your own key',
    help: 'In guest mode, AI explanations run on your personal Google Gemini API key. It is stored only in this browser and sent solely to make your request.',
    link: 'https://aistudio.google.com/apikey',
    linkLabel: 'Get a free Gemini API key',
  },
  tts: {
    title: 'Audio uses your own key',
    help: 'In guest mode, text-to-speech runs on your personal Google Cloud TTS API key. It is stored only in this browser and sent solely to make your request.',
    link: 'https://console.cloud.google.com/apis/credentials',
    linkLabel: 'Get a Google Cloud TTS API key',
  },
};

export default function GuestApiKeyModal() {
  const [kind, setKind] = useState<GuestKeyKind | null>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { kind: GuestKeyKind };
      setKind(detail.kind);
      setValue(getGuestKey(detail.kind) || '');
    };
    window.addEventListener(GUEST_KEY_REQUIRED_EVENT, handler);
    return () => window.removeEventListener(GUEST_KEY_REQUIRED_EVENT, handler);
  }, []);

  if (!kind) return null;

  const copy = COPY[kind];

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setGuestKey(kind, trimmed);
    setKind(null);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={() => setKind(null)}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-2" style={{ color: '#1D1D1F' }}>
          {copy.title}
        </h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#636366' }}>
          {copy.help}
        </p>

        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          placeholder="Paste your API key"
          autoFocus
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-3"
          style={{ border: '1px solid rgba(0,0,0,0.12)', backgroundColor: '#F2F2F7' }}
        />

        <a
          href={copy.link}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium interactive-link"
          style={{ color: COLORS.PRIMARY }}
        >
          {copy.linkLabel}
        </a>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={() => setKind(null)}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#F2F2F7', color: '#1D1D1F' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!value.trim()}
            className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
            style={{ backgroundColor: COLORS.PRIMARY, color: '#FFFFFF' }}
          >
            Save key
          </button>
        </div>
      </div>
    </div>
  );
}
