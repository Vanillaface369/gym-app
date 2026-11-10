import { describe, expect, it } from 'vitest';
import { addPlanSet, editPlanSet, samePlan } from './planEdit';

describe('editing today\'s plan', () => {
  const plan = [{ reps: 10, weightKg: 50 }, { reps: 10, weightKg: 50 }, { reps: 8, weightKg: 55 }];

  it('carries a new weight to later sets that matched the old one', () => {
    const out = editPlanSet(plan, 0, { weightKg: 52.5 });
    expect(out.map((s) => s.weightKg)).toEqual([52.5, 52.5, 55]);
    expect(plan[0].weightKg).toBe(50); // original untouched
  });

  it('fills later sets that have no weight yet', () => {
    const blank = [{ reps: 10, weightKg: 0 }, { reps: 10, weightKg: 0 }];
    expect(editPlanSet(blank, 0, { weightKg: 20 }).map((s) => s.weightKg)).toEqual([20, 20]);
  });

  it('changes reps the same way and leaves earlier sets alone', () => {
    const out = editPlanSet(plan, 1, { reps: 12 });
    expect(out.map((s) => s.reps)).toEqual([10, 12, 8]);
  });

  it('adds a set copying the last one and compares plans', () => {
    const more = addPlanSet(plan);
    expect(more.at(-1)).toEqual({ reps: 8, weightKg: 55 });
    expect(samePlan(plan, plan.map((s) => ({ ...s })))).toBe(true);
    expect(samePlan(plan, more)).toBe(false);
  });
});
