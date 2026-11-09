// Muscle recovery model (SPEC 5). Pure functions, no database access, so stage 7 can reuse them.
import type { Muscle } from '../db/types';

export const FRESH = 90;
const H = 3_600_000;

export interface DoseSet { exerciseId: string; isWarmup: boolean; reps: number }
export interface DoseExercise { primaryMuscles: Muscle[]; secondaryMuscles: Muscle[] }
export type Doses = Partial<Record<Muscle, number>>;

/** Fatigue per muscle from one workout: 1 per working set where it's a primary muscle, 0.5 where secondary. */
export function sessionDoses(sets: DoseSet[], exercises: Map<string, DoseExercise>): Doses {
  const out: Doses = {};
  for (const s of sets) {
    if (s.isWarmup || s.reps <= 0) continue;
    const ex = exercises.get(s.exerciseId);
    if (!ex) continue;
    for (const m of ex.primaryMuscles) out[m] = (out[m] ?? 0) + 1;
    for (const m of ex.secondaryMuscles) out[m] = (out[m] ?? 0) + 0.5;
  }
  return out;
}

/** Hours to fully recover: 48 h up to a dose of 3, rising evenly to 96 h at a dose of 12 or more. */
export function requiredHours(dose: number): number {
  if (dose <= 0) return 0;
  return Math.min(96, Math.max(48, 48 + ((dose - 3) / 9) * 48));
}

export interface TrainedSession { id: string; name: string; endedAt: number; doses: Doses }
export interface Override { percent: number; setAt: number }

export interface MuscleRecovery {
  muscle: Muscle;
  percent: number;
  /** Hours until 100%; 0 when already there. */
  hoursToFull: number;
  lastTrainedAt?: number;
  /** A manual value is in effect. */
  overridden: boolean;
}

/**
 * Recovery for one muscle. With several recent workouts, the least recovered one counts.
 * A manual override is a starting point that keeps rising at the muscle's normal pace, and is dropped
 * once a workout that trains the muscle finishes after it was set.
 */
export function muscleRecovery(muscle: Muscle, sessions: TrainedSession[], override: Override | undefined, now: number): MuscleRecovery {
  let percent = 100, hoursToFull = 0, lastTrainedAt: number | undefined, lastRequired = 48;
  for (const s of sessions) {
    const dose = s.doses[muscle];
    if (!dose) continue;
    const req = requiredHours(dose);
    const since = Math.max(0, (now - s.endedAt) / H); // a just-finished workout can look slightly in the future
    percent = Math.min(percent, Math.min(100, (since / req) * 100));
    hoursToFull = Math.max(hoursToFull, req - since);
    if (lastTrainedAt === undefined || s.endedAt > lastTrainedAt) { lastTrainedAt = s.endedAt; lastRequired = req; }
  }
  if (override && (lastTrainedAt === undefined || override.setAt > lastTrainedAt)) {
    // max(0): the screen's clock ticks once a minute, so a just-saved override can look slightly in the future.
    const since = Math.max(0, (now - override.setAt) / H);
    const p = Math.min(100, Math.max(0, override.percent) + (since / lastRequired) * 100);
    return { muscle, percent: Math.round(p), hoursToFull: ((100 - p) / 100) * lastRequired, lastTrainedAt, overridden: true };
  }
  return { muscle, percent: Math.round(percent), hoursToFull: Math.max(0, hoursToFull), lastTrainedAt, overridden: false };
}

export type Band = 'low' | 'mid' | 'fresh';
export const band = (pct: number): Band => (pct >= FRESH ? 'fresh' : pct >= 50 ? 'mid' : 'low');
