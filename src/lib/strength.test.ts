import { describe, expect, it } from 'vitest';
import { bucketVolume, exerciseRatio, scoresAt, setVolumeBySub, toScore, trend, type ExerciseInfo, type Point } from './strength';

const DAY = 86_400_000;
const T0 = 1_000 * DAY;
const pts = (...xs: [number, number][]): Point[] => xs.map(([d, e]) => ({ date: T0 + d * DAY, e1rm: e }));

const ex = new Map<string, ExerciseInfo>([
  ['bench', { primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'front_delts'] }],
  ['press', { primaryMuscles: ['front_delts'], secondaryMuscles: ['triceps'] }],
  ['row', { primaryMuscles: ['upper_back', 'lats'], secondaryMuscles: ['biceps'] }],
  ['squat', { primaryMuscles: ['quads'], secondaryMuscles: ['glutes'] }],
]);

describe('strength score', () => {
  it('ratio is best of last 4 weeks over best of first 4 weeks', () => {
    const p = pts([0, 80], [10, 84], [40, 90], [90, 100], [100, 96]);
    expect(exerciseRatio(p, T0 + 110 * DAY)).toBeCloseTo(100 / 84);
    expect(exerciseRatio(p, T0 + 20 * DAY)).toBe(1); // baseline and current are the same weeks
    expect(exerciseRatio(p, T0)).toBeNull(); // nothing before asOf
    expect(exerciseRatio(p, T0 + 200 * DAY)).toBeNull(); // not done in the last 4 weeks
  });

  it('maps ratio to 0-100 with 50 at baseline', () => {
    expect(toScore(1)).toBe(50);
    expect(toScore(1.2)).toBe(60);
    expect(toScore(3)).toBe(150); // no cap at 100
    expect(toScore(-1)).toBe(0);
  });

  it('averages sub-groups into groups and overall', () => {
    const by = new Map([
      ['bench', pts([0, 100], [60, 120])], // chest 60
      ['press', pts([0, 50], [60, 50])], // shoulders 50
      ['row', pts([0, 80], [60, 88])], // back 55
    ]);
    const s = scoresAt(by, ex, T0 + 70 * DAY);
    expect(s.subs.chest).toBe(60);
    expect(s.subs.shoulders).toBe(50);
    expect(s.subs.triceps).toBeNull(); // no exercise has triceps as primary
    expect(s.subs.back).toBe(55);
    expect(s.groups.push).toBe(55);
    expect(s.groups.pull).toBe(55);
    expect(s.groups.legs).toBeNull();
    expect(s.overall).toBe(55);
  });

  it('trend compares with 4 weeks earlier', () => {
    expect(trend([50, 51, 52, 53, 55])).toBe(5);
    expect(trend([null, 51, 52, 53, 55])).toBeNull();
    expect(trend([50, 52])).toBeNull();
  });
});

describe('muscle volume', () => {
  it('counts full for primary, half for secondary, once per sub-group', () => {
    const set = { exerciseId: 'bench', reps: 10, weightKg: 50, isWarmup: false, completedAt: 0 };
    expect(setVolumeBySub(set, ex.get('bench'))).toEqual({ chest: 500, triceps: 250, shoulders: 250 });
    expect(setVolumeBySub({ ...set, exerciseId: 'row' }, ex.get('row'))).toEqual({ back: 500, biceps: 250 });
    expect(setVolumeBySub({ ...set, isWarmup: true }, ex.get('bench'))).toEqual({});
  });

  it('buckets volume by period', () => {
    const sets = [
      { exerciseId: 'squat', reps: 10, weightKg: 100, isWarmup: false, completedAt: 5 },
      { exerciseId: 'squat', reps: 5, weightKg: 100, isWarmup: false, completedAt: 15 },
      { exerciseId: 'bench', reps: 10, weightKg: 50, isWarmup: false, completedAt: 15 },
    ];
    const b = bucketVolume(sets, ex, 'quads', (t) => (t < 10 ? 0 : 10));
    expect([...b]).toEqual([[0, 1000], [10, 500]]);
    expect([...bucketVolume(sets, ex, 'glutes', () => 0)]).toEqual([[0, 750]]);
  });
});
