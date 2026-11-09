// Progressive overload: double progression (SPEC 5). Pure functions.
import type { Equipment } from '../db/types';
import { e1rm } from './calc';

export type StepKind = 'dumbbell' | 'cable_machine' | 'barbell' | 'plate_loaded';
export const DEFAULT_STEPS: Record<StepKind, number> = { dumbbell: 2, cable_machine: 2.5, barbell: 2.5, plate_loaded: 5 };
export const STEP_LABEL: Record<StepKind, string> = { dumbbell: 'Dumbbells', cable_machine: 'Cables & machines', barbell: 'Barbell', plate_loaded: 'Plate-loaded' };

/** Which weight step applies to an exercise, or null for bodyweight-only moves (reps progress instead). */
export function stepKind(equipment: Equipment[]): StepKind | null {
  if (equipment.includes('barbell') || equipment.includes('ez_bar')) return 'barbell';
  if (equipment.includes('plate_loaded')) return 'plate_loaded';
  if (equipment.includes('dumbbell')) return 'dumbbell';
  if (equipment.some((e) => e === 'cable' || e === 'machine' || e === 'assisted_machine')) return 'cable_machine';
  return null;
}

export interface RepRange { min: number; max: number }
/** Default rep range for a goal. */
export function goalRange(goal: string): RepRange {
  if (/strength/i.test(goal)) return { min: 4, max: 6 };
  if (/general|fitness|endurance/i.test(goal)) return { min: 10, max: 15 };
  return { min: 8, max: 12 }; // Build Muscle
}

export interface PastSet { reps: number; weightKg: number }
export type ProgressionKind = 'up' | 'reps' | 'deload';
export interface Suggestion {
  sets: PastSet[];
  kind: ProgressionKind;
  /** Short note shown with the exercise, e.g. "↑ +2.5 kg". Weights in the note are kg; the UI converts. */
  note: string;
  deltaKg?: number;
}

const roundTo = (v: number, step: number) => (step > 0 ? Math.max(0, Math.round(v / step) * step) : v);
const best = (ss: PastSet[]) => Math.max(...ss.map((s) => e1rm(s.weightKg, s.reps)));

/**
 * Next session's sets from the last sessions (newest first, working sets only).
 * - Every set last time hit the top of the range: add one weight step, reps back to the bottom.
 * - Best e1RM dropped two sessions in a row: suggest a 10% lighter session.
 * - Otherwise: same weight, one more rep on the first set below the top of the range.
 * Returns null without history.
 */
export function suggest(history: PastSet[][], setCount: number, range: RepRange, step: number): Suggestion | null {
  const last = history[0]?.filter((s) => s.reps > 0);
  if (!last?.length) return null;
  const top = Math.max(...last.map((s) => s.weightKg));
  const at = (i: number) => last[Math.min(i, last.length - 1)];
  const n = Math.max(1, setCount);

  if (history.length >= 3 && history[1].length && history[2].length && best(last) < best(history[1]) && best(history[1]) < best(history[2]) && top > 0) {
    const w = roundTo(top * 0.9, step || 0.5);
    return { kind: 'deload', note: 'Lighter session: −10%', deltaKg: w - top, sets: Array.from({ length: n }, (_, i) => ({ reps: Math.max(range.min, at(i).reps), weightKg: w })) };
  }

  const working = last.filter((s) => s.weightKg === top);
  if (working.every((s) => s.reps >= range.max)) {
    if (step > 0 && top > 0) {
      return { kind: 'up', note: `↑ +${step} kg`, deltaKg: step, sets: Array.from({ length: n }, () => ({ reps: range.min, weightKg: top + step })) };
    }
    // Bodyweight: no weight to add, so keep adding reps.
    return { kind: 'reps', note: '+1 rep', sets: Array.from({ length: n }, (_, i) => ({ reps: at(i).reps + (i === 0 ? 1 : 0), weightKg: top })) };
  }

  const sets = Array.from({ length: n }, (_, i) => ({ reps: Math.min(range.max, Math.max(range.min, at(i).reps)), weightKg: top }));
  const i = sets.findIndex((s) => s.reps < range.max);
  if (i >= 0) sets[i].reps++;
  return { kind: 'reps', note: '+1 rep', sets };
}
