import { describe, expect, it } from 'vitest';
import { countSets, fmtSets, progress, type CountExercise } from './targets';

const ex = new Map<string, CountExercise>([
  ['bench', { category: 'push', primaryMuscles: ['chest'], secondaryMuscles: ['front_delts', 'triceps'] }],
  ['row', { category: 'pull', primaryMuscles: ['upper_back', 'lats'], secondaryMuscles: ['biceps'] }],
  ['squat', { category: 'legs', primaryMuscles: ['quads'], secondaryMuscles: ['glutes'] }],
  ['crunch', { category: 'core', primaryMuscles: ['abs'], secondaryMuscles: [] }],
]);
const s = (exerciseId: string, n = 1, isWarmup = false) => Array.from({ length: n }, () => ({ exerciseId, isWarmup, reps: 10 }));

describe('targets', () => {
  it('counts each working set once for its group, and 1 / 0.5 per muscle', () => {
    const c = countSets([...s('bench', 3), ...s('bench', 1, true), ...s('row', 2), ...s('crunch', 4), ...s('unknown', 2)], ex);
    expect(c.groups).toEqual({ push: 3, pull: 2, legs: 0 });
    expect(c.muscles.chest).toBe(3);
    expect(c.muscles.triceps).toBe(1.5);
    expect(c.muscles.lats).toBe(2);
    expect(c.muscles.biceps).toBe(1);
    expect(c.muscles.abs).toBe(4);
  });

  it('ignores sets with no reps', () => {
    expect(countSets([{ exerciseId: 'squat', isWarmup: false, reps: 0 }], ex).groups.legs).toBe(0);
  });

  it('caps each group at its target for the overall %', () => {
    const p = progress({ push: 50, pull: 0, legs: 10 }, { push: 40, pull: 20, legs: 40 });
    expect(p.groups.push).toEqual({ done: 50, target: 40, toGo: 0, pct: 100 });
    expect(p.groups.legs.toGo).toBe(30);
    expect(p.overall).toBe(50); // (40 + 0 + 10) / 100
  });

  it('handles zero targets', () => {
    const p = progress({ push: 5, pull: 0, legs: 0 }, { push: 0, pull: 0, legs: 0 });
    expect(p.groups.push.pct).toBe(0);
    expect(p.overall).toBe(0);
  });

  it('formats half sets', () => {
    expect(fmtSets(3)).toBe('3');
    expect(fmtSets(1.5)).toBe('1.5');
  });
});
