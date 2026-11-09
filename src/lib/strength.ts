// Strength score (SPEC 5) and per-muscle volume (SPEC 3.9a). Pure functions over session points.
import type { Muscle } from '../db/types';
import type { Group } from './targets';

const DAY = 86_400_000;
const WINDOW = 28 * DAY; // "first 4 weeks" / "last 4 weeks"

export type Sub = 'chest' | 'shoulders' | 'triceps' | 'back' | 'biceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves';
export const SUBS: { id: Sub; label: string; group: Group; muscles: Muscle[]; side: 'front' | 'back' }[] = [
  { id: 'chest', label: 'Chest', group: 'push', muscles: ['chest'], side: 'front' },
  { id: 'shoulders', label: 'Shoulders', group: 'push', muscles: ['front_delts', 'side_delts', 'rear_delts'], side: 'front' },
  { id: 'triceps', label: 'Triceps', group: 'push', muscles: ['triceps'], side: 'back' },
  { id: 'back', label: 'Back', group: 'pull', muscles: ['lats', 'upper_back', 'traps', 'lower_back'], side: 'back' },
  { id: 'biceps', label: 'Biceps', group: 'pull', muscles: ['biceps'], side: 'front' },
  { id: 'quads', label: 'Quads', group: 'legs', muscles: ['quads'], side: 'front' },
  { id: 'hamstrings', label: 'Hamstrings', group: 'legs', muscles: ['hamstrings'], side: 'back' },
  { id: 'glutes', label: 'Glutes', group: 'legs', muscles: ['glutes'], side: 'back' },
  { id: 'calves', label: 'Calves', group: 'legs', muscles: ['calves'], side: 'back' },
];
export const SUB_BY_ID = new Map(SUBS.map((s) => [s.id, s]));

export interface Point { date: number; e1rm: number }
export interface ExerciseInfo { primaryMuscles: Muscle[]; secondaryMuscles: Muscle[] }

/**
 * Current best e1RM (last 4 weeks before `asOf`) / baseline best e1RM (first 4 weeks logged).
 * Null when the exercise has no data before `asOf`, or none in the last 4 weeks.
 */
export function exerciseRatio(points: Point[], asOf: number): number | null {
  const before = points.filter((p) => p.date < asOf && p.e1rm > 0);
  if (!before.length) return null;
  const first = Math.min(...before.map((p) => p.date));
  const baseline = Math.max(...before.filter((p) => p.date < first + WINDOW).map((p) => p.e1rm));
  const recent = before.filter((p) => p.date >= asOf - WINDOW);
  if (!recent.length) return null;
  return Math.max(...recent.map((p) => p.e1rm)) / baseline;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const toScore = (ratio: number) => Math.max(0, Math.min(100, 50 * ratio));

export interface Scores {
  subs: Record<Sub, number | null>;
  groups: Record<Group, number | null>;
  overall: number | null;
}

/** Scores as of a moment: per sub-group, the mean ratio of exercises whose primary muscles fall in it. */
export function scoresAt(byExercise: Map<string, Point[]>, exercises: Map<string, ExerciseInfo>, asOf: number): Scores {
  const ratios = new Map<string, number>();
  for (const [id, pts] of byExercise) {
    const r = exerciseRatio(pts, asOf);
    if (r !== null) ratios.set(id, r);
  }
  const subs = {} as Record<Sub, number | null>;
  for (const s of SUBS) {
    const rs: number[] = [];
    for (const [id, r] of ratios) {
      const ex = exercises.get(id);
      if (ex?.primaryMuscles.some((m) => s.muscles.includes(m))) rs.push(r);
    }
    const m = mean(rs);
    subs[s.id] = m === null ? null : round(toScore(m));
  }
  const groups = {} as Record<Group, number | null>;
  for (const g of ['push', 'pull', 'legs'] as Group[]) {
    const m = mean(SUBS.filter((s) => s.group === g).map((s) => subs[s.id]).filter((v): v is number => v !== null));
    groups[g] = m === null ? null : round(m);
  }
  const o = mean(Object.values(groups).filter((v): v is number => v !== null));
  return { subs, groups, overall: o === null ? null : round(o) };
}

const round = (n: number) => Math.round(n);

/** Scores at each week start from `from` to `to` (inclusive), oldest first. Week starts come from the caller. */
export function weeklyScores(byExercise: Map<string, Point[]>, exercises: Map<string, ExerciseInfo>, weekStarts: number[]) {
  return weekStarts.map((w) => ({ week: w, ...scoresAt(byExercise, exercises, w) }));
}

/** Change against 4 weeks earlier, or null if either side has no score. */
export function trend(series: (number | null)[]): number | null {
  const now = series[series.length - 1];
  const then = series[series.length - 5];
  if (now == null || then == null) return null;
  return now - then;
}

// ---- Volume ----
export interface VolumeSet { exerciseId: string; reps: number; weightKg: number; isWarmup: boolean; completedAt: number }

/**
 * Per sub-group volume for one set: full kg if the exercise's primary muscles touch the sub-group, half if only its
 * secondary muscles do. Counted once per sub-group even when several of its muscles are involved.
 */
export function setVolumeBySub(set: VolumeSet, ex: ExerciseInfo | undefined): Partial<Record<Sub, number>> {
  if (!ex || set.isWarmup || set.reps <= 0 || set.weightKg <= 0) return {};
  const v = set.reps * set.weightKg;
  const out: Partial<Record<Sub, number>> = {};
  for (const s of SUBS) {
    if (ex.primaryMuscles.some((m) => s.muscles.includes(m))) out[s.id] = v;
    else if (ex.secondaryMuscles.some((m) => s.muscles.includes(m))) out[s.id] = v / 2;
  }
  return out;
}

/** Sum a sub-group's volume into buckets. `bucketOf` returns the bucket start for a timestamp, or null to skip. */
export function bucketVolume(sets: VolumeSet[], exercises: Map<string, ExerciseInfo>, sub: Sub, bucketOf: (t: number) => number | null): Map<number, number> {
  const out = new Map<number, number>();
  for (const s of sets) {
    const v = setVolumeBySub(s, exercises.get(s.exerciseId))[sub];
    if (!v) continue;
    const b = bucketOf(s.completedAt);
    if (b === null) continue;
    out.set(b, (out.get(b) ?? 0) + v);
  }
  return out;
}
