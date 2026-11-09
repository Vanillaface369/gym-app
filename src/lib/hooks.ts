import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { defaultSettings } from '../db/seed';
import type { Exercise } from '../db/types';

export function useSettings() {
  return useLiveQuery(() => db.settings.get('settings'), []) ?? defaultSettings;
}

/** undefined while loading, null when there's no workout in progress. */
export function useActive() {
  return useLiveQuery(async () => (await db.active.get('current')) ?? null, []);
}

export function useExercises() {
  const list = useLiveQuery(() => db.exercises.toArray(), []);
  const map = useMemo(() => new Map<string, Exercise>((list ?? []).map((e) => [e.id, e])), [list]);
  return { list: list ?? [], map, loading: list === undefined };
}

/** Re-renders every `ms` while enabled; the value is Date.now(). */
export function useNow(ms = 250, enabled = true) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    const vis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [ms, enabled]);
  return now;
}

/** Keep the screen awake while `on` is true (re-acquired when the app comes back to the front). */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState === 'visible' && !cancelled) lock = await navigator.wakeLock.request('screen');
      } catch { /* denied (e.g. battery saver): ignore */ }
    };
    acquire();
    const vis = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', vis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', vis);
      lock?.release().catch(() => {});
    };
  }, [on]);
}

// ---------- Sound ----------
let audioCtx: AudioContext | null = null;
/** Call from a tap handler so the browser allows sound later. */
export function unlockAudio() {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* no audio */ }
}

export function beep() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  [0, 0.25, 0.5].forEach((off, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === 2 ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, t0 + off);
    gain.gain.exponentialRampToValueAtTime(0.5, t0 + off + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.18);
    osc.connect(gain).connect(audioCtx!.destination);
    osc.start(t0 + off);
    osc.stop(t0 + off + 0.2);
  });
}

export function vibrate() {
  try { navigator.vibrate?.([300, 120, 300, 120, 500]); } catch { /* unsupported */ }
}
