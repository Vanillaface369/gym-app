// Workout generation, simple version (SPEC 5). Pure functions: the caller supplies recovery and history.
import type { Equipment, Muscle, SplitDay } from '../db/types';
import { GROUP_MUSCLES } from './targets';

export type Split = 'ppl' | 'upper_lower' | 'full' | 'custom';
export type Variability = 'low' | 'balanced' | 'high';

/** The days in each split, in rotation order. */
export function splitDays(split: Split): SplitDay[] {
  if (split === 'upper_lower') return ['upper', 'lower'];
  if (split === 'full') return ['full'];
  return ['push', 'pull', 'legs'];
}

export const DAY_LABEL: Partial<Record<SplitDay, string>> = {
  push: 'Push Day', pull: 'Pull Day', legs: 'Leg Day', upper: 'Upper Body', lower: 'Lower Body', full: 'Full Body',
};

/** Small muscles a split day doesn't chase on its own; they still get work from the big moves (and can be picked by hand). */
export const MINOR_MUSCLES: Muscle[] = ['traps', 'lower_back', 'forearms', 'adductors', 'abductors'];

export function dayMuscles(day: SplitDay): Muscle[] {
  const major = (ms: Muscle[]) => ms.filter((m) => !MINOR_MUSCLES.includes(m));
  const push = major(GROUP_MUSCLES.push), pull = major(GROUP_MUSCLES.pull), legs = major(GROUP_MUSCLES.legs);
  if (day === 'push') return push;
  if (day === 'pull') return pull;
  if (day === 'legs' || day === 'lower') return legs;
  if (day === 'upper') return [...push, ...pull];
  return [...push, ...pull, ...legs];
}

/**
 * The day due next: the one done least recently. Ties (e.g. never done) go to the day whose muscles are freshest,
 * then to rotation order.
 */
export function chooseDay(days: { day: SplitDay; lastDone: number; freshness: number }[]): SplitDay | null {
  if (!days.length) return null;
  return days.reduce((a, b) => (b.lastDone < a.lastDone || (b.lastDone === a.lastDone && b.freshness > a.freshness) ? b : a)).day;
}

export interface GenExercise {
  id: string; name: string; primaryMuscles: Muscle[]; secondaryMuscles: Muscle[]; equipment: Equipment[];
  preference: -1 | 0 | 1; useCount: number; archived: boolean;
}
export interface GenInput {
  muscles: Muscle[];
  exercises: GenExercise[];
  equipment: Equipment[];
  bodyweightOnly: boolean;
  avoid: Muscle[];
  /** Recovery % per muscle (missing = 100). */
  recovery: Partial<Record<Muscle, number>>;
  /** Exercises done in the most recent session of this kind (for rotation). */
  lastTime: Set<string>;
  variability: Variability;
  durationMin: number;
}

export const MIN_PER_EXERCISE = 7.5;
export const exerciseCount = (durationMin: number) => Math.max(3, Math.min(10, Math.round(durationMin / MIN_PER_EXERCISE)));

/** Can this exercise be done with the gym's equipment? Bodyweight always can. */
export function available(ex: GenExercise, equipment: Equipment[], bodyweightOnly: boolean): boolean {
  const needs = ex.equipment.filter((e) => e !== 'bodyweight');
  if (bodyweightOnly) return needs.length === 0;
  return needs.every((e) => equipment.includes(e));
}

/**
 * Pick exercises for the target muscles. Each candidate is scored by preference, familiarity (use count) and how fresh
 * its main muscles are; the rotation setting rewards (low) or penalises (high) repeating last time's exercises.
 * Picking is greedy, and each pick lowers the score of others hitting the same main muscle, so the workout spreads out.
 * Big multi-muscle moves go first. Deterministic: the same inputs give the same workout.
 */
export function pickExercises(input: GenInput): GenExercise[] {
  const target = new Set(input.muscles);
  const avoid = new Set(input.avoid);
  const pool = input.exercises.filter((ex) =>
    !ex.archived &&
    ex.primaryMuscles.some((m) => target.has(m)) &&
    !ex.primaryMuscles.some((m) => avoid.has(m)) &&
    available(ex, input.equipment, input.bodyweightOnly));

  const rotation = { low: 1.5, balanced: -0.75, high: -3 }[input.variability];
  const base = new Map(pool.map((ex) => {
    const fresh = ex.primaryMuscles.reduce((t, m) => t + (input.recovery[m] ?? 100), 0) / ex.primaryMuscles.length / 100;
    const score = ex.preference * 2 + Math.log10(ex.useCount + 1) + fresh * 2 + (input.lastTime.has(ex.id) ? rotation : 0);
    return [ex.id, score];
  }));

  const picked: GenExercise[] = [];
  const hits = new Map<Muscle, number>();
  const want = Math.min(exerciseCount(input.durationMin), pool.length);
  while (picked.length < want) {
    let bestEx: GenExercise | null = null, bestScore = -Infinity;
    for (const ex of pool) {
      if (picked.includes(ex)) continue;
      const crowd = ex.primaryMuscles.reduce((t, m) => t + (hits.get(m) ?? 0), 0);
      const s = base.get(ex.id)! - crowd * 1.75;
      if (s > bestScore || (s === bestScore && bestEx && ex.name < bestEx.name)) { bestEx = ex; bestScore = s; }
    }
    if (!bestEx) break;
    picked.push(bestEx);
    for (const m of bestEx.primaryMuscles) hits.set(m, (hits.get(m) ?? 0) + 1);
  }
  const size = (ex: GenExercise) => ex.primaryMuscles.length + ex.secondaryMuscles.length * 0.5;
  return picked.sort((a, b) => size(b) - size(a) || a.name.localeCompare(b.name));
}
