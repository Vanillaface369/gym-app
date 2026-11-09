import { describe, expect, it } from 'vitest';
import { caloriesEst, detectRecords, e1rm, maxEffortRamp, volumeKg } from './calc';

describe('calc', () => {
  it('e1rm uses Epley and returns weight for 1 rep', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(60, 10)).toBeCloseTo(80);
    expect(e1rm(0, 5)).toBe(0);
  });

  it('volume ignores warm-ups', () => {
    expect(volumeKg([
      { reps: 10, weightKg: 50, isWarmup: false },
      { reps: 10, weightKg: 20, isWarmup: true },
      { reps: 8, weightKg: 50, isWarmup: false },
    ])).toBe(900);
  });

  it('calories is MET x kg x hours', () => {
    expect(caloriesEst(80, 3600)).toBe(360);
  });

  it('max effort ramp ends on the top set and climbs', () => {
    const r = maxEffortRamp(4, 80, 2);
    expect(r).toHaveLength(4);
    expect(r[3]).toEqual({ reps: 2, weightKg: 80 });
    expect(r[0].weightKg).toBeLessThan(r[1].weightKg);
    expect(r[0].reps).toBeGreaterThan(r[3].reps);
  });

  it('detects records only above prior bests', () => {
    const sets = [{ exerciseId: 'x', reps: 10, weightKg: 50, isWarmup: false }];
    const none = detectRecords('x', sets, { weight: 50, e1rm: 70, volume: 1000, repsAtWeight: new Map([[50, 10]]) });
    expect(none).toEqual([]);
    const some = detectRecords('x', sets, { weight: 45, e1rm: 60, volume: 400, repsAtWeight: new Map([[50, 8]]) });
    expect(some.map((r) => r.type).sort()).toEqual(['e1rm', 'reps', 'volume', 'weight']);
  });
});
