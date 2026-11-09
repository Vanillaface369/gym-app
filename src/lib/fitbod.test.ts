import { describe, expect, it } from 'vitest';
import { findColumns, groupWorkouts, matchExercise, nameScore, parseCsv, parseDate, parseFitbod } from './fitbod';

const CSV = [
  'Date,Exercise,Reps,Weight(kg),Duration(s),Distance(m),Incline,Resistance,isWarmup,Note,multiplier',
  '2024-03-05 18:00:00 +0000,Lat Pulldown,10,50,0,0,0,0,true,,1',
  '2024-03-05 18:03:00 +0000,Lat Pulldown,8,70,0,0,0,0,false,"felt good, strong",1',
  '2024-03-05 18:40:00 +0000,Dumbbell Bicep Curl,12,10,0,0,0,0,false,,2',
  '2024-03-05 18:45:00 +0000,Running,0,0,600,1500,0,0,false,,1',
  '2024-03-07 09:00:00 +0000,Leg Press,10,120,0,0,0,0,false,,1',
].join('\r\n');

describe('fitbod import', () => {
  it('parses quoted CSV fields', () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([['a', 'b, c', 'd "e"'], ['1', '2', '3']]);
  });

  it('finds columns loosely and spots pounds', () => {
    expect(findColumns(['Date', 'Exercise', 'Reps', 'Weight(kg)'])).toMatchObject({ date: 0, exercise: 1, reps: 2, weight: 3, weightUnit: 'kg' });
    expect(findColumns(['date', 'exercise name', 'reps', 'Weight (lbs)']).weightUnit).toBe('lb');
    expect(() => findColumns(['Date', 'Reps'])).toThrow(/no Exercise, Weight/);
  });

  it('parses Fitbod dates with offsets', () => {
    expect(parseDate('2024-03-05 18:00:00 +0000')).toBe(Date.UTC(2024, 2, 5, 18));
    expect(parseDate('2024-03-05 18:00:00 +1000')).toBe(Date.UTC(2024, 2, 5, 8));
    expect(parseDate('2024-03-05T18:00:00Z')).toBe(Date.UTC(2024, 2, 5, 18));
    expect(parseDate('nonsense')).toBeNull();
  });

  it('turns rows into sets, skipping cardio rows', () => {
    const r = parseFitbod(CSV);
    expect(r.sets).toHaveLength(4);
    expect(r.skipped).toBe(1);
    expect(r.sets[0]).toMatchObject({ exercise: 'Lat Pulldown', reps: 10, weightKg: 50, isWarmup: true });
    expect(r.sets[1].isWarmup).toBe(false);
  });

  it('converts pounds to kg', () => {
    const r = parseFitbod('Date,Exercise,Reps,Weight(lbs)\n2024-01-01 10:00:00 +0000,Squat,5,220.462');
    expect(r.sets[0].weightKg).toBe(100);
  });

  it('groups sets into workouts by time gaps and estimates duration', () => {
    const w = groupWorkouts(parseFitbod(CSV).sets);
    expect(w).toHaveLength(2);
    expect(w[0].sets).toHaveLength(3);
    expect(w[0].durationSec).toBe(40 * 60 + 120); // 18:00 -> 18:40, plus 2 min
    expect(w[1].durationSec).toBe(20 * 60); // one timestamp: 3 min per set, at least 20 min
  });

  it('matches exercise names', () => {
    const mine = [{ id: 'lat-pulldown', name: 'Lat Pulldown' }, { id: 'db-curl', name: 'Seated Dumbbell Curl' }, { id: 'leg-press', name: 'Leg Press' }];
    expect(matchExercise('lat pulldown', mine)).toEqual({ id: 'lat-pulldown', score: 1 });
    expect(matchExercise('Leg Presses', mine).id).toBe('leg-press');
    expect(matchExercise('Barbell Back Squat', mine).id).toBeNull();
    expect(nameScore('Dumbbell Bicep Curl', 'Seated Dumbbell Curl')).toBeLessThan(0.8); // close-ish, but left for the user to confirm
  });
});
