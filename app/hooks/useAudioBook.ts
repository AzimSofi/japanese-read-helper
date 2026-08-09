'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS, TTS_CONFIG, type TTSVoiceGender } from '@/lib/constants';
import type { AudioBookContentMode, NarrationCue, NarrationManifest, PlayableUnit } from '@/lib/types';
import { cleanTextForTTS } from '@/lib/utils/ttsTextCleaner';
import { fetchTTS } from '@/lib/utils/ttsCache';

export type AudioBookStatus = 'idle' | 'loading' | 'playing' | 'paused';

type PlayPart = 'main' | 'sub';
interface PlayStep {
  index: number;
  part: PlayPart;
}

const MAX_CONSECUTIVE_FAILURES = 3;

interface UseAudioBookOptions {
  units: PlayableUnit[];
  contentMode: AudioBookContentMode;
  narration?: NarrationManifest | null;
  onEnd?: () => void;
  getStartIndex?: () => number;
}

function seekTo(audio: HTMLAudioElement, time: number): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    audio.currentTime = time;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    audio.addEventListener('loadedmetadata', () => {
      audio.currentTime = time;
      resolve();
    }, { once: true });
    audio.addEventListener('error', () => reject(new Error('Narration audio failed to load')), { once: true });
  });
}

function partText(unit: PlayableUnit, part: PlayPart): string {
  const raw = part === 'sub' ? unit.sub : unit.main;
  return raw ? cleanTextForTTS(raw) : '';
}

function firstPlayablePart(unit: PlayableUnit, mode: AudioBookContentMode): PlayPart | null {
  if (mode === 'sub') {
    return partText(unit, 'sub') ? 'sub' : null;
  }
  if (partText(unit, 'main')) return 'main';
  if (mode === 'both' && partText(unit, 'sub')) return 'sub';
  return null;
}

function stepAtOrAfter(units: PlayableUnit[], from: number, mode: AudioBookContentMode): PlayStep | null {
  for (let unitIndex = Math.max(0, from); unitIndex < units.length; unitIndex++) {
    const part = firstPlayablePart(units[unitIndex], mode);
    if (part) return { index: unitIndex, part };
  }
  return null;
}

function stepAtOrBefore(units: PlayableUnit[], from: number, mode: AudioBookContentMode): PlayStep | null {
  for (let unitIndex = Math.min(units.length - 1, from); unitIndex >= 0; unitIndex--) {
    const part = firstPlayablePart(units[unitIndex], mode);
    if (part) return { index: unitIndex, part };
  }
  return null;
}

function stepAfter(units: PlayableUnit[], step: PlayStep, mode: AudioBookContentMode): PlayStep | null {
  if (mode === 'both' && step.part === 'main' && partText(units[step.index], 'sub')) {
    return { index: step.index, part: 'sub' };
  }
  return stepAtOrAfter(units, step.index + 1, mode);
}

export function useAudioBook({
  units,
  contentMode,
  narration,
  onEnd,
  getStartIndex,
}: UseAudioBookOptions) {
  const [status, setStatus] = useState<AudioBookStatus>('idle');
  const [index, setIndex] = useState(-1);
  const [cursor, setCursor] = useState(-1);
  const [speed, setSpeedState] = useState<number>(TTS_CONFIG.DEFAULT_SPEED);
  const [voiceGender, setVoiceGenderState] = useState<TTSVoiceGender>(TTS_CONFIG.DEFAULT_VOICE_GENDER);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTokenRef = useRef(0);
  const isAutoRef = useRef(false);
  const indexRef = useRef(-1);
  const cursorRef = useRef(-1);
  const phaseRef = useRef<PlayPart>('main');
  const statusRef = useRef<AudioBookStatus>('idle');

  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);
  const narrationUrlRef = useRef<string | null>(null);

  const unitsRef = useRef(units);
  const narrationRef = useRef(narration);
  const contentModeRef = useRef(contentMode);
  const speedRef = useRef(speed);
  const voiceRef = useRef(voiceGender);
  const startIndexRef = useRef(getStartIndex);
  const onEndRef = useRef(onEnd);
  const playStepRef = useRef<(step: PlayStep, isAuto: boolean) => void>(() => {});
  const consecutiveFailuresRef = useRef(0);

  const releaseNarrationAudio = useCallback(() => {
    const audio = narrationAudioRef.current;
    if (!audio) return;
    if (audioRef.current === audio) audioRef.current = null;
    audio.ontimeupdate = null;
    audio.onerror = null;
    audio.pause();
    audio.src = '';
    narrationAudioRef.current = null;
    narrationUrlRef.current = null;
  }, []);

  useEffect(() => {
    narrationRef.current = narration;
    if (narration?.audioUrl !== narrationUrlRef.current) releaseNarrationAudio();
  }, [narration, releaseNarrationAudio]);
  useEffect(() => { contentModeRef.current = contentMode; }, [contentMode]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { voiceRef.current = voiceGender; }, [voiceGender]);
  useEffect(() => { startIndexRef.current = getStartIndex; }, [getStartIndex]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSpeed = localStorage.getItem(STORAGE_KEYS.TTS_SPEED);
    const parsedSpeed = savedSpeed ? parseFloat(savedSpeed) : NaN;
    if (!isNaN(parsedSpeed) && parsedSpeed >= TTS_CONFIG.MIN_SPEED && parsedSpeed <= TTS_CONFIG.MAX_SPEED) {
      speedRef.current = parsedSpeed;
      setSpeedState(parsedSpeed);
    }
    const savedVoice = localStorage.getItem(STORAGE_KEYS.TTS_VOICE_GENDER);
    if (savedVoice === 'MALE' || savedVoice === 'FEMALE') {
      voiceRef.current = savedVoice;
      setVoiceGenderState(savedVoice);
    }
  }, []);

  const updateStatus = useCallback((next: AudioBookStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const updateIndex = useCallback((next: number) => {
    indexRef.current = next;
    setIndex(next);
  }, []);

  const setStartCursor = useCallback((unitIndex: number) => {
    cursorRef.current = unitIndex;
    setCursor(unitIndex);
  }, []);

  const clearStartCursor = useCallback(() => {
    if (cursorRef.current < 0) return;
    cursorRef.current = -1;
    setCursor(-1);
  }, []);

  const detachAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.onended = null;
    audio.onerror = null;
    audio.ontimeupdate = null;
    audio.pause();
    // The narration element is shared by every unit, so clearing its src here
    // would re-download the whole recording on each sentence.
    if (audio !== narrationAudioRef.current) audio.src = '';
    audioRef.current = null;
  }, []);

  const acquireNarrationAudio = useCallback((audioUrl: string) => {
    const existing = narrationAudioRef.current;
    if (existing && narrationUrlRef.current === audioUrl) return existing;
    releaseNarrationAudio();
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    audio.preservesPitch = true;
    narrationAudioRef.current = audio;
    narrationUrlRef.current = audioUrl;
    return audio;
  }, [releaseNarrationAudio]);

  const cueForStep = useCallback((step: PlayStep): NarrationCue | null => {
    if (step.part !== 'main') return null;
    return narrationRef.current?.cues[step.index] ?? null;
  }, []);

  const prefetch = useCallback((step: PlayStep) => {
    const next = stepAfter(unitsRef.current, step, contentModeRef.current);
    if (!next) return;
    if (cueForStep(next)) return;
    const unit = unitsRef.current[next.index];
    const text = next.part === 'sub' ? unit.sub : unit.main;
    fetchTTS({ text: text ?? '', speed: 1, voiceGender: voiceRef.current }).catch(() => {});
  }, [cueForStep]);

  const advanceAfter = useCallback((token: number) => {
    if (token !== playTokenRef.current) return;
    if (!isAutoRef.current) {
      updateStatus('idle');
      return;
    }
    const next = stepAfter(
      unitsRef.current,
      { index: indexRef.current, part: phaseRef.current },
      contentModeRef.current
    );
    if (!next) {
      isAutoRef.current = false;
      updateStatus('idle');
      onEndRef.current?.();
      return;
    }
    playStepRef.current(next, true);
  }, [updateStatus]);

  // A clip failing (fetch error or decode/play error) is per-clip and usually transient,
  // so skip and keep going while under the limit; only stop once failures pile up.
  const skipOrEndOnFailure = useCallback((token: number) => {
    if (token !== playTokenRef.current) return;
    if (isAutoRef.current && consecutiveFailuresRef.current < MAX_CONSECUTIVE_FAILURES) {
      consecutiveFailuresRef.current += 1;
      advanceAfter(token);
      return;
    }
    consecutiveFailuresRef.current = 0;
    isAutoRef.current = false;
    updateStatus('idle');
  }, [advanceAfter, updateStatus]);

  // A narration failure is a whole-recording problem rather than a bad clip, so
  // it stops playback instead of skipping ahead like the TTS path does.
  const playNarration = useCallback(async (cue: NarrationCue, token: number) => {
    const manifest = narrationRef.current;
    if (!manifest) return;

    const stopOnFailure = (error: unknown) => {
      if (token !== playTokenRef.current) return;
      console.error('Narration playback failed:', error);
      isAutoRef.current = false;
      updateStatus('idle');
    };

    detachAudio();
    const audio = acquireNarrationAudio(manifest.audioUrl);
    audio.playbackRate = speedRef.current;
    // timeupdate only fires a few times per second, but every cue ends where the
    // narrator pauses, so the overshoot lands in silence rather than the next line.
    audio.ontimeupdate = () => {
      if (audio.currentTime < cue.end) return;
      audio.ontimeupdate = null;
      audio.pause();
      advanceAfter(token);
    };
    audio.onerror = () => stopOnFailure(audio.error);
    audioRef.current = audio;

    try {
      await seekTo(audio, cue.start);
      if (token !== playTokenRef.current) return;
      await audio.play();
    } catch (error) {
      stopOnFailure(error);
      return;
    }
    if (token !== playTokenRef.current) return;
    updateStatus('playing');
    consecutiveFailuresRef.current = 0;
    clearStartCursor();
  }, [acquireNarrationAudio, advanceAfter, clearStartCursor, detachAudio, updateStatus]);

  const playStep = useCallback(async (step: PlayStep, isAuto: boolean) => {
    const units2 = unitsRef.current;
    if (step.index < 0 || step.index >= units2.length) return;

    const token = ++playTokenRef.current;
    isAutoRef.current = isAuto;
    phaseRef.current = step.part;
    updateIndex(step.index);
    updateStatus('loading');

    const cue = cueForStep(step);
    if (cue) {
      await playNarration(cue, token);
      return;
    }

    const unit = units2[step.index];
    const text = step.part === 'sub' ? unit.sub : unit.main;

    let audioBase64: string | null = null;
    try {
      audioBase64 = await fetchTTS({ text: text ?? '', speed: 1, voiceGender: voiceRef.current });
    } catch (error) {
      if (token !== playTokenRef.current) return;
      console.error('Audiobook TTS fetch failed:', error);
      skipOrEndOnFailure(token);
      return;
    }
    if (token !== playTokenRef.current) return;
    if (!audioBase64) {
      advanceAfter(token);
      return;
    }

    detachAudio();
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    // Speed is applied client-side via playbackRate, so one cached clip serves every speed and changes are instant.
    audio.preservesPitch = true;
    audio.playbackRate = speedRef.current;
    audio.onended = () => advanceAfter(token);
    audio.onerror = () => {
      if (token !== playTokenRef.current) return;
      console.error('Audiobook clip failed to decode/play');
      skipOrEndOnFailure(token);
    };
    audioRef.current = audio;

    try {
      await audio.play();
    } catch (error) {
      if (token !== playTokenRef.current) return;
      console.error('Audiobook playback failed:', error);
      isAutoRef.current = false;
      updateStatus('idle');
      return;
    }
    if (token !== playTokenRef.current) return;
    updateStatus('playing');
    consecutiveFailuresRef.current = 0;
    clearStartCursor();
    prefetch(step);
  }, [advanceAfter, clearStartCursor, cueForStep, detachAudio, playNarration, prefetch, skipOrEndOnFailure, updateIndex, updateStatus]);

  useEffect(() => { playStepRef.current = playStep; }, [playStep]);

  const resolveStartIndex = useCallback(() => {
    if (cursorRef.current >= 0) return cursorRef.current;
    if (indexRef.current >= 0) return indexRef.current;
    return startIndexRef.current?.() ?? 0;
  }, []);

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    audioRef.current?.pause();
    updateStatus('paused');
  }, [updateStatus]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    const audio = audioRef.current;
    if (!audio) {
      updateStatus('idle');
      return;
    }
    audio.play()
      .then(() => updateStatus('playing'))
      .catch((error) => {
        console.error('Audiobook resume failed:', error);
        updateStatus('idle');
      });
  }, [updateStatus]);

  const stop = useCallback(() => {
    playTokenRef.current++;
    detachAudio();
    isAutoRef.current = false;
    phaseRef.current = 'main';
    updateIndex(-1);
    clearStartCursor();
    updateStatus('idle');
  }, [clearStartCursor, detachAudio, updateIndex, updateStatus]);

  const togglePlayPause = useCallback(() => {
    if (statusRef.current === 'loading') return;
    if (statusRef.current === 'playing') {
      pause();
      return;
    }
    if (statusRef.current === 'paused') {
      resume();
      return;
    }
    const step = stepAtOrAfter(unitsRef.current, resolveStartIndex(), contentModeRef.current);
    if (step) playStep(step, true);
  }, [pause, resume, resolveStartIndex, playStep]);

  const next = useCallback(() => {
    const continueAuto = statusRef.current !== 'paused';
    const from = indexRef.current >= 0 ? indexRef.current + 1 : resolveStartIndex();
    const step = stepAtOrAfter(unitsRef.current, from, contentModeRef.current);
    if (step) playStep(step, continueAuto);
  }, [resolveStartIndex, playStep]);

  const previous = useCallback(() => {
    const continueAuto = statusRef.current !== 'paused';
    const from = indexRef.current >= 0 ? indexRef.current - 1 : resolveStartIndex();
    const step = stepAtOrBefore(unitsRef.current, from, contentModeRef.current);
    if (step) playStep(step, continueAuto);
  }, [resolveStartIndex, playStep]);

  const replay = useCallback(() => {
    const continueAuto = statusRef.current !== 'paused';
    const step = stepAtOrAfter(unitsRef.current, resolveStartIndex(), contentModeRef.current);
    if (step) playStep(step, continueAuto);
  }, [resolveStartIndex, playStep]);

  const playSub = useCallback(() => {
    const targetIndex = indexRef.current >= 0 ? indexRef.current : resolveStartIndex();
    const units2 = unitsRef.current;
    if (targetIndex < 0 || targetIndex >= units2.length) return;
    if (!partText(units2[targetIndex], 'sub')) return;
    const continueAuto = statusRef.current !== 'paused';
    playStep({ index: targetIndex, part: 'sub' }, continueAuto);
  }, [resolveStartIndex, playStep]);

  const setSpeed = useCallback((value: number) => {
    const clamped = Math.max(TTS_CONFIG.MIN_SPEED, Math.min(TTS_CONFIG.MAX_SPEED, value));
    speedRef.current = clamped;
    setSpeedState(clamped);
    if (audioRef.current) audioRef.current.playbackRate = clamped;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TTS_SPEED, clamped.toString());
    }
  }, []);

  useEffect(() => {
    unitsRef.current = units;
    playTokenRef.current++;
    detachAudio();
    isAutoRef.current = false;
    phaseRef.current = 'main';
    indexRef.current = -1;
    cursorRef.current = -1;
    statusRef.current = 'idle';
    setIndex(-1);
    setCursor(-1);
    setStatus('idle');
  }, [units, detachAudio]);

  useEffect(() => {
    return () => {
      playTokenRef.current++;
      detachAudio();
      releaseNarrationAudio();
    };
  }, [detachAudio, releaseNarrationAudio]);

  return {
    status,
    index,
    cursor,
    total: units.length,
    speed,
    hasNarration: Boolean(narration),
    togglePlayPause,
    pause,
    resume,
    stop,
    next,
    previous,
    replay,
    playSub,
    setStartCursor,
    setSpeed,
  };
}
