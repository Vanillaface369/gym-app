import { describe, expect, it } from 'vitest';
import { available, chooseDay, dayMuscles, exerciseCount, pickExercises, splitDays, type GenExercise, type GenInput } from './generate';

const ex = (id: string, primary: GenExercise['primaryMuscles'], equipment: GenExercise['equipment'], extra: Partial<GenExercise> = {}): GenExercise => ({
  id, name: id, primaryMuscles: primary, secondaryMuscles: [], equipment, preference: 0, useCount: 10, archived: false, ...extra,
});
const ALL_EQ: GenInput['equipment'] = ['dumbbell', 'cable', 'machine', 'bench', 'barbell'];
const input = (exercises: GenExercise[], over: Partial<GenInput> = {}): GenInput => ({
  muscles: ['chest', 'triceps', 'side_delts', 'front_delts'], exercises, equipment: ALL_EQ, bodyweightOnly: false, avoid: [],
  recovery: {}, lastTime: new Set(), variability: 'balanced', durationMin: 30, ...over,
});

describe('generate', () => {
  it('split days and their muscles', () => {
    expect(splitDays('ppl')).toEqual(['push', 'pull', 'legs']);
    expect(splitDays('upper_lower')).toEqual(['upper', 'lower']);
    expect(dayMuscles('upper')).toContain('lats');
    expect(dayMuscles('upper')).toContain('chest');
    expect(dayMuscles('lower')).not.toContain('chest');
    expect(dayMuscles('pull')).not.toContain('traps'); // minor muscles aren't chased by split days
  });

  it('chooses the day done least recently, then the freshest', () => {
    expect(chooseDay([{ day: 'push', lastDone: 5, freshness: 1 }, { day: 'pull', lastDone: 3, freshness: 0 }, { day: 'legs', lastDone: 4, freshness: 1 }])).toBe('pull');
    expect(chooseDay([{ day: 'push', lastDone: 0, freshness: 50 }, { day: 'pull', lastDone: 0, freshness: 90 }])).toBe('pull');
    expect(chooseDay([])).toBeNull();
  });

  it('exercise count follows the duration', () => {
    expect(exerciseCount(60)).toBe(8);
    expect(exerciseCount(30)).toBe(4);
    expect(exerciseCount(10)).toBe(3);
  });

  it('respects equipment, bodyweight-only and archived', () => {
    expect(available(ex('a', ['chest'], ['barbell', 'bench']), ['dumbbell', 'bench'], false)).toBe(false);
    expect(available(ex('b', ['chest'], ['bodyweight']), [], false)).toBe(true);
    expect(available(ex('c', ['chest'], ['dumbbell']), ALL_EQ, true)).toBe(false);
  });

  it('only picks exercises for the target muscles, skipping avoided ones', () => {
    const list = [ex('bench', ['chest'], ['dumbbell']), ex('curl', ['biceps'], ['dumbbell']), ex('pushdown', ['triceps'], ['cable'])];
    expect(pickExercises(input(list)).map((e) => e.id).sort()).toEqual(['bench', 'pushdown']);
    expect(pickExercises(input(list, { avoid: ['triceps'] })).map((e) => e.id)).toEqual(['bench']);
  });

  it('spreads across muscles and favours preferred, fresh exercises', () => {
    const list = [
      ex('bench', ['chest'], ['dumbbell']), ex('fly', ['chest'], ['machine']), ex('press', ['chest'], ['machine'], { preference: -1 }),
      ex('pushdown', ['triceps'], ['cable']), ex('raise', ['side_delts'], ['dumbbell'], { preference: 1 }), ex('ohp', ['front_delts'], ['machine']),
    ];
    const picked = pickExercises(input(list, { durationMin: 30 })).map((e) => e.id);
    expect(picked).toHaveLength(4);
    expect(picked).toContain('raise'); // preferred
    expect(picked).not.toContain('press'); // less often
    expect(picked.filter((id) => ['bench', 'fly', 'press'].includes(id)).length).toBe(1); // one chest move, not three
    const tired = pickExercises(input(list, { durationMin: 22, recovery: { triceps: 0 } })).map((e) => e.id);
    expect(tired).not.toContain('pushdown');
  });

  it('rotation: low keeps last time, high swaps', () => {
    // Four chest moves, three slots (the minimum): does last time's exercise make the cut?
    const list = ['a', 'b', 'c', 'fly'].map((id) => ex(id, ['chest'], ['dumbbell']));
    const has = (variability: GenInput['variability']) =>
      pickExercises(input(list, { muscles: ['chest'], durationMin: 1, variability, lastTime: new Set(['fly']) })).some((e) => e.id === 'fly');
    expect(has('low')).toBe(true);
    expect(has('high')).toBe(false);
  });

  it('is deterministic', () => {
    const list = [ex('b', ['chest'], ['dumbbell']), ex('a', ['chest'], ['dumbbell'])];
    expect(pickExercises(input(list)).map((e) => e.id)).toEqual(pickExercises(input(list)).map((e) => e.id));
  });
});
