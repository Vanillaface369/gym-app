// Weekly set targets (SPEC 3.7 and 5). Pure functions, no database access.
import type { Category, Muscle } from '../db/types';

export type Group = 'push' | 'pull' | 'legs';
export const GROUPS: { id: Group; label: string }[] = [
  { id: 'push', label: 'Push muscles' },
  { id: 'pull', label: 'Pull muscles' },
  { id: 'legs', label: 'Leg muscles' },
];

/** Muscles shown under each group's breakdown. Abs and obliques have no target, so they're left out. */
export const GROUP_MUSCLES: Record<Group, Muscle[]> = {
  push: ['chest', 'front_delts', 'side_delts', 'triceps'],
  pull: ['lats', 'upper_back', 'traps', 'rear_delts', 'biceps', 'forearms', 'lower_back'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
};

export interface CountSet { exerciseId: string; isWarmup: boolean; reps: number }
export interface CountExercise { category: Category; primaryMuscles: Muscle[]; secondaryMuscles: Muscle[] }

export interface WeekCounts {
  /** Working sets per group: each set counts once, toward its exercise's category. */
  groups: Record<Group, number>;
  /** Per muscle: a primary muscle gets 1 per set, a secondary muscle 0.5. */
  muscles: Partial<Record<Muscle, number>>;
}

const isGroup = (c: Category): c is Group => c === 'push' || c === 'pull' || c === 'legs';

export function countSets(sets: CountSet[], exercises: Map<string, CountExercise>): WeekCounts {
  const out: WeekCounts = { groups: { push: 0, pull: 0, legs: 0 }, muscles: {} };
  const add = (m: Muscle, n: number) => { out.muscles[m] = (out.muscles[m] ?? 0) + n; };
  for (const s of sets) {
    if (s.isWarmup || s.reps <= 0) continue;
    const ex = exercises.get(s.exerciseId);
    if (!ex) continue;
    if (isGroup(ex.category)) out.groups[ex.category]++;
    for (const m of ex.primaryMuscles) add(m, 1);
    for (const m of ex.secondaryMuscles) add(m, 0.5);
  }
  return out;
}

export interface GroupProgress { done: number; target: number; toGo: number; pct: number }
export interface WeekProgress { groups: Record<Group, GroupProgress>; overall: number }

/** % per group capped at 100. Overall counts each group only up to its target, so extra push sets can't cover missing legs. */
export function progress(groups: Record<Group, number>, targets: Record<Group, number>): WeekProgress {
  const g = {} as Record<Group, GroupProgress>;
  let done = 0, total = 0;
  for (const { id } of GROUPS) {
    const target = Math.max(0, targets[id]);
    const d = groups[id];
    g[id] = { done: d, target, toGo: Math.max(0, target - d), pct: target ? Math.min(100, Math.round((d / target) * 100)) : 0 };
    done += Math.min(d, target);
    total += target;
  }
  return { groups: g, overall: total ? Math.round((done / total) * 100) : 0 };
}

/** Halves show as ".5"; whole numbers stay whole. */
export const fmtSets = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
