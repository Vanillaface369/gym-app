import { useEffect, useRef, useState } from 'react';
import { activeActions } from '../../db/actions';
import type { ActiveWorkout } from '../../db/types';
import { beep, useExercises, useNow, useSettings, vibrate } from '../../lib/hooks';
import { fmtClock, fmtWeight } from '../../lib/format';
import { Sheet } from '../../components/ui';
import { IconPause, IconPlay, IconTimer } from '../../components/icons';

export function restRemainingMs(rest: ActiveWorkout['rest'], now: number): number | null {
  if (!rest) return null;
  if (rest.pausedRemainingMs !== null) return rest.pausedRemainingMs;
  if (rest.endsAt !== null) return rest.endsAt - now;
  return null;
}

const alerted = new Set<number>();

/**
 * Mounted once at app level. Fires vibration + sound when rest reaches zero.
 * Uses the stored end timestamp, so if the phone was locked it still knows when rest ended.
 */
export function RestAlarm({ active }: { active: ActiveWorkout | null | undefined }) {
  const settings = useSettings();
  const rest = active?.rest ?? null;
  const running = !!rest && rest.endsAt !== null;
  const now = useNow(250, running);
  useEffect(() => {
    if (!rest || rest.endsAt === null) return;
    const left = rest.endsAt - now;
    // Only alert near the moment it ends (not if you open the app an hour later).
    if (left <= 0 && left > -30_000 && !alerted.has(rest.endsAt)) {
      alerted.add(rest.endsAt);
      if (settings.vibration) vibrate();
      if (settings.sound) beep();
    }
  }, [now, rest, settings.vibration, settings.sound]);
  return null;
}

/** Mini bar + full sheet. Opens automatically when a new rest starts. */
export function RestTimerUI({ active, label }: { active: ActiveWorkout; label?: string }) {
  const rest = active.rest;
  const now = useNow(200, !!rest);
  const settings = useSettings();
  const { map } = useExercises();
  const [open, setOpen] = useState(false);
  const seen = useRef<number | null>(rest?.startedAt ?? null);

  // Pop the sheet open whenever a new rest starts (not on +/-10 s or pause).
  useEffect(() => {
    const id = rest?.startedAt ?? null;
    if (id !== null && id !== seen.current && Date.now() - id < 5000) setOpen(true);
    seen.current = id;
  }, [rest?.startedAt]);

  const left = restRemainingMs(rest, now);
  if (!rest || left === null) return null;
  const over = left <= 0;
  const paused = rest.pausedRemainingMs !== null;
  if (over && left < -15_000 && !open) return null;

  const pct = Math.min(1, Math.max(0, 1 - left / rest.durationMs));

  // What comes after this rest: the next set of this exercise, or the next exercise.
  const item = active.items.find((i) => i.key === rest.itemKey);
  const nextIdx = item ? item.sets.findIndex((s) => !s.done) : -1;
  let upNext: string | null = null;
  if (item && nextIdx >= 0) {
    const s = item.sets[nextIdx];
    const n = s.isWarmup ? 'Warm-up' : `Set ${item.sets.slice(0, nextIdx + 1).filter((x) => !x.isWarmup).length}`;
    upNext = `${n} · ${s.reps} × ${s.weightKg ? fmtWeight(s.weightKg, settings.units) : 'bodyweight'}`;
  } else {
    const after = active.items.find((i) => i.sets.some((s) => !s.done));
    if (after) upNext = map.get(after.exerciseId)?.name ?? null;
  }
  const R = 108;
  const C = 2 * Math.PI * R;

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex w-[calc(100%-2rem)] max-w-[30rem] items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 shadow-xl shadow-black/50">
          <IconTimer size={20} className={over ? 'text-accent' : 'text-muted'} />
          <span className="min-w-0 flex-1 truncate text-left text-sm">{over ? 'Rest over, next set' : paused ? 'Rest paused' : 'Resting'}{label ? ` · ${label}` : ''}</span>
          <span className={`tabular text-lg font-bold ${over ? 'text-accent' : ''}`}>{fmtClock(Math.ceil(Math.max(0, left) / 1000))}</span>
        </button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Rest">
        <div className="flex flex-col items-center">
          <div className="relative my-2 h-60 w-60">
            <svg viewBox="0 0 240 240" className="h-full w-full -rotate-90">
              <circle cx="120" cy="120" r={R} fill="none" stroke="var(--color-surface-2)" strokeWidth="12" />
              <circle cx="120" cy="120" r={R} fill="none" stroke="var(--color-accent)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * pct} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`tabular text-6xl font-bold ${over ? 'text-accent' : ''}`}>{fmtClock(Math.ceil(Math.max(0, left) / 1000))}</span>
              <span className="mt-1 text-sm text-muted">{over ? 'Time to lift' : paused ? 'Paused' : `of ${fmtClock(rest.durationMs / 1000)}`}</span>
            </div>
          </div>
          {upNext && <p className="tabular mb-1 text-center text-base"><span className="text-muted">Next: </span><span className="font-semibold">{upNext}</span></p>}
          <div className="mt-2 grid w-full grid-cols-3 gap-3">
            <button className="rounded-xl bg-surface-2 py-4 text-lg font-semibold" onClick={() => activeActions.restAdjust(-10)}>−10 s</button>
            <button aria-label={paused ? 'Resume' : 'Pause'} className="flex items-center justify-center rounded-xl bg-surface-2 py-4" onClick={() => activeActions.restPauseToggle()} disabled={over}>
              {paused ? <IconPlay /> : <IconPause />}
            </button>
            <button className="rounded-xl bg-surface-2 py-4 text-lg font-semibold" onClick={() => activeActions.restAdjust(10)}>+10 s</button>
          </div>
          <button className="mt-3 min-h-14 w-full rounded-xl bg-accent text-lg font-bold text-accent-ink" onClick={() => { activeActions.restStop(); setOpen(false); }}>{over ? 'Next set' : 'Skip rest'}</button>
        </div>
      </Sheet>
    </>
  );
}
