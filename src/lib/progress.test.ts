import { describe, expect, it } from 'vitest';
import { allTimeBests, chartPoints, pickBenchmarks, rangeStart, sessionPoints, summarise, type SetIn } from './progress';
import { e1rm } from './calc';

const day = 86_400_000;
const NOW = new Date(2026, 10, 10, 12).getTime(); // 10 Nov 2026

let n = 0;
function set(sessionId: string, daysAgo: number, reps: number, weightKg: number, isWarmup = false): SetIn {
  return { sessionId, setIndex: n++, reps, weightKg, isWarmup, completedAt: NOW - daysAgo * day, e1rm: e1rm(weightKg, reps) };
}

describe('progress', () => {
  it('groups sets into sessions, ignoring warm-ups and empty sets', () => {
    const pts = sessionPoints([
      set('a', 10, 10, 20, true),
      set('a', 10, 10, 60),
      set('a', 10, 8, 65),
      set('a', 10, 0, 65),
      set('b', 3, 1, 90),
    ]);
    expect(pts.map((p) => p.sessionId)).toEqual(['a', 'b']); // oldest first
    expect(pts[0].sets).toEqual([{ reps: 10, weightKg: 60 }, { reps: 8, weightKg: 65 }]);
    expect(pts[0].e1rm).toBe(82.3); // 65 x (1 + 8/30) = 82.33
    expect(pts[0].volumeKg).toBe(1120);
    expect(pts[1].e1rm).toBe(90);
  });

  it('range start goes back by calendar units', () => {
    expect(new Date(rangeStart('month', NOW)).getMonth()).toBe(9);
    expect(new Date(rangeStart('6m', NOW)).getMonth()).toBe(4);
    expect(new Date(rangeStart('year', NOW)).getFullYear()).toBe(2025);
    expect(rangeStart('week', NOW)).toBe(NOW - 7 * day);
  });

  it('week and month show every session in range; longer ranges show the monthly best', () => {
    const pts = sessionPoints([
      set('old', 400, 5, 100),
      set('m1', 60, 5, 70), set('m1b', 55, 5, 75), // same month (Sep), 75 wins
      set('w1', 20, 5, 80),
      set('w2', 2, 5, 85),
    ]);
    expect(chartPoints(pts, 'week', NOW).map((p) => p.sessionId)).toEqual(['w2']);
    expect(chartPoints(pts, 'month', NOW).map((p) => p.sessionId)).toEqual(['w1', 'w2']);
    const six = chartPoints(pts, '6m', NOW);
    expect(six.map((p) => p.sessionId)).toEqual(['m1b', 'w1', 'w2']);
    expect(chartPoints(pts, 'year', NOW).some((p) => p.sessionId === 'old')).toBe(false);
  });

  it('summarises min, max and average', () => {
    expect(summarise([])).toBeNull();
    const s = summarise([{ date: 1, e1rm: 80, sessionId: 'a' }, { date: 2, e1rm: 90.7, sessionId: 'b' }, { date: 3, e1rm: 85, sessionId: 'c' }]);
    expect(s).toEqual({ min: 80, max: 90.7, avg: 85.2, from: 1, to: 3 });
  });

  it('finds all-time bests and lets a higher Fitbod e1RM win', () => {
    const pts = sessionPoints([
      set('a', 10, 10, 60), set('a', 10, 12, 60),
      set('b', 3, 5, 70), set('b', 3, 5, 70),
    ]);
    const b = allTimeBests(pts);
    expect(b.weight?.value).toBe(70);
    expect(b.e1rm?.sessionId).toBe('a'); // 60 x 12 = 84 beats 70 x 5 = 81.7
    expect(b.volume?.value).toBe(1320);
    expect(b.repsAtWeight).toEqual([{ weightKg: 70, reps: 5, date: NOW - 3 * day }, { weightKg: 60, reps: 12, date: NOW - 10 * day }]);
    expect(allTimeBests(pts, 90.7).e1rm).toEqual({ value: 90.7, date: 0, fromFitbod: true });
    expect(allTimeBests(pts, 50).e1rm?.fromFitbod).toBeUndefined();
    expect(allTimeBests([], 90.7).e1rm?.value).toBe(90.7);
  });

  it('benchmarks default to the most used, or follow the pinned list', () => {
    const ex = [
      { id: 'a', useCount: 5, archived: false },
      { id: 'b', useCount: 50, archived: false },
      { id: 'c', useCount: 99, archived: true },
      { id: 'd', useCount: 0, archived: false },
    ];
    expect(pickBenchmarks(ex, undefined).map((e) => e.id)).toEqual(['b', 'a']);
    expect(pickBenchmarks(ex, ['d', 'c', 'zz', 'a']).map((e) => e.id)).toEqual(['d', 'a']);
  });
});
