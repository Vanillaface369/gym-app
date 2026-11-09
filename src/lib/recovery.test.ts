import { describe, expect, it } from 'vitest';
import { band, muscleRecovery, requiredHours, sessionDoses, type DoseExercise, type TrainedSession } from './recovery';

const H = 3_600_000;
const NOW = 1_000 * H;
const ex = new Map<string, DoseExercise>([
  ['bench', { primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'front_delts'] }],
  ['curl', { primaryMuscles: ['biceps'], secondaryMuscles: [] }],
]);
const sess = (id: string, hoursAgo: number, doses: TrainedSession['doses']): TrainedSession => ({ id, name: id, endedAt: NOW - hoursAgo * H, doses });

describe('recovery', () => {
  it('doses are 1 per primary set and 0.5 per secondary, skipping warm-ups', () => {
    const d = sessionDoses([
      { exerciseId: 'bench', isWarmup: false, reps: 10 },
      { exerciseId: 'bench', isWarmup: false, reps: 8 },
      { exerciseId: 'bench', isWarmup: true, reps: 10 },
      { exerciseId: 'curl', isWarmup: false, reps: 0 },
    ], ex);
    expect(d).toEqual({ chest: 2, triceps: 1, front_delts: 1 });
  });

  it('required hours run from 48 to 96', () => {
    expect(requiredHours(1)).toBe(48);
    expect(requiredHours(3)).toBe(48);
    expect(requiredHours(7.5)).toBe(72);
    expect(requiredHours(12)).toBe(96);
    expect(requiredHours(30)).toBe(96);
  });

  it('recovery % is hours since / hours needed, capped at 100', () => {
    const r = muscleRecovery('chest', [sess('a', 24, { chest: 3 })], undefined, NOW);
    expect(r.percent).toBe(50);
    expect(r.hoursToFull).toBe(24);
    expect(muscleRecovery('chest', [sess('a', 100, { chest: 3 })], undefined, NOW).percent).toBe(100);
    expect(muscleRecovery('quads', [sess('a', 1, { chest: 3 })], undefined, NOW)).toMatchObject({ percent: 100, hoursToFull: 0 });
  });

  it('the least recovered workout counts', () => {
    const r = muscleRecovery('chest', [sess('old', 60, { chest: 12 }), sess('new', 12, { chest: 1 })], undefined, NOW);
    expect(r.percent).toBe(25); // 12 / 48
    expect(r.hoursToFull).toBe(36);
    expect(r.lastTrainedAt).toBe(NOW - 12 * H);
  });

  it('an override keeps rising at the normal pace', () => {
    const r = muscleRecovery('chest', [sess('a', 30, { chest: 2 })], { percent: 50, setAt: NOW - 12 * H }, NOW);
    expect(r.overridden).toBe(true);
    expect(r.percent).toBe(75); // 50 + 12/48
    expect(r.hoursToFull).toBe(12);
  });

  it('an override is dropped once a later workout trains the muscle', () => {
    const r = muscleRecovery('chest', [sess('a', 6, { chest: 3 })], { percent: 100, setAt: NOW - 10 * H }, NOW);
    expect(r.overridden).toBe(false);
    expect(r.percent).toBe(13); // 6 / 48
  });

  it('an override set a moment after "now" still applies', () => {
    expect(muscleRecovery('chest', [], { percent: 40, setAt: NOW + 30_000 }, NOW)).toMatchObject({ percent: 40, overridden: true });
  });

  it('bands', () => {
    expect(band(10)).toBe('low');
    expect(band(50)).toBe('mid');
    expect(band(89)).toBe('mid');
    expect(band(90)).toBe('fresh');
  });
});
