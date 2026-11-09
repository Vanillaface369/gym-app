// Pure calculations (SPEC section 5). No database access here, so they are easy to test.

/** Epley estimated 1RM. reps = 1 returns the weight itself. */
export function e1rm(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export interface SetLike { reps: number; weightKg: number; isWarmup: boolean }

/** Sum of reps x weight across working sets. */
export function volumeKg(sets: SetLike[]): number {
  return sets.filter((s) => !s.isWarmup).reduce((t, s) => t + s.reps * s.weightKg, 0);
}

/** MET x bodyweight x hours. MET 4.5 sits in the 3.5-5 range for resistance training. */
export function caloriesEst(bodyweightKg: number, durationSec: number, met = 4.5): number {
  return Math.round(met * bodyweightKg * (durationSec / 3600));
}

/** Round to the nearest increment (default 2.5 kg), never below 0. */
export function roundTo(value: number, step = 2.5): number {
  return Math.max(0, Math.round(value / step) * step);
}

/**
 * Max Effort Day ramp: work up to a heavy top set.
 * Returns one {reps, weightKg} per set, the last being the top set.
 */
export function maxEffortRamp(sets: number, topWeightKg: number, topReps: number): { reps: number; weightKg: number }[] {
  if (sets <= 1) return [{ reps: topReps, weightKg: topWeightKg }];
  const out: { reps: number; weightKg: number }[] = [];
  for (let i = 0; i < sets; i++) {
    const t = i / (sets - 1); // 0 .. 1
    const pct = 0.7 + 0.3 * t; // 70% -> 100%
    const reps = i === sets - 1 ? topReps : Math.max(topReps + 1, Math.round(8 - (8 - topReps) * t));
    out.push({ reps, weightKg: i === sets - 1 ? topWeightKg : roundTo(topWeightKg * pct) });
  }
  return out;
}

export interface SessionSetInput { exerciseId: string; reps: number; weightKg: number; isWarmup: boolean }
export interface PriorBest { weight?: number; e1rm?: number; volume?: number; repsAtWeight: Map<number, number> }
export interface NewRecord { exerciseId: string; type: 'weight' | 'e1rm' | 'reps' | 'volume'; value: number; weightKg?: number; previous?: number }

/**
 * Compare one exercise's working sets this session against its prior bests.
 * A record only counts if there was something to beat (first-ever sessions set a baseline silently;
 * those are returned with previous = undefined so the caller can store them without celebrating).
 */
export function detectRecords(exerciseId: string, sets: SessionSetInput[], prior: PriorBest): NewRecord[] {
  const work = sets.filter((s) => !s.isWarmup && s.reps > 0 && s.weightKg > 0);
  if (!work.length) return [];
  const out: NewRecord[] = [];
  const bestWeight = Math.max(...work.map((s) => s.weightKg));
  const bestE1rm = Math.max(...work.map((s) => e1rm(s.weightKg, s.reps)));
  const vol = volumeKg(work);
  if (prior.weight === undefined || bestWeight > prior.weight + 1e-9) out.push({ exerciseId, type: 'weight', value: bestWeight, previous: prior.weight });
  if (prior.e1rm === undefined || bestE1rm > prior.e1rm + 1e-9) out.push({ exerciseId, type: 'e1rm', value: round1(bestE1rm), previous: prior.e1rm });
  if (prior.volume === undefined || vol > prior.volume + 1e-9) out.push({ exerciseId, type: 'volume', value: vol, previous: prior.volume });
  // Best reps at each weight used today
  const repsHere = new Map<number, number>();
  for (const s of work) repsHere.set(s.weightKg, Math.max(repsHere.get(s.weightKg) ?? 0, s.reps));
  for (const [w, r] of repsHere) {
    const prev = prior.repsAtWeight.get(w);
    if (prev === undefined || r > prev) out.push({ exerciseId, type: 'reps', value: r, weightKg: w, previous: prev });
  }
  return out;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Records worth celebrating: they beat a previous best. */
export const isCelebrated = (r: NewRecord) => r.previous !== undefined;
