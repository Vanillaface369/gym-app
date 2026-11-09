import { describe, expect, it } from 'vitest';
import { goalRange, stepKind, suggest } from './progression';

const R = { min: 8, max: 12 };
const s = (reps: number, weightKg: number) => ({ reps, weightKg });

describe('progression', () => {
  it('no history means no suggestion', () => {
    expect(suggest([], 3, R, 2.5)).toBeNull();
  });

  it('adds a step and resets reps when every set hit the top', () => {
    const r = suggest([[s(12, 50), s(12, 50), s(12, 50)]], 3, R, 2.5)!;
    expect(r.kind).toBe('up');
    expect(r.sets).toEqual([s(8, 52.5), s(8, 52.5), s(8, 52.5)]);
    expect(r.note).toBe('↑ +2.5 kg');
  });

  it('otherwise keeps the weight and adds one rep to the first set below the top', () => {
    const r = suggest([[s(12, 50), s(10, 50), s(9, 50)]], 3, R, 2.5)!;
    expect(r.kind).toBe('reps');
    expect(r.sets).toEqual([s(12, 50), s(11, 50), s(9, 50)]);
  });

  it('only the heaviest sets decide whether to go up', () => {
    const r = suggest([[s(12, 50), s(12, 50), s(7, 40)]], 3, R, 2.5)!;
    expect(r.kind).toBe('up'); // back-off set at 40 kg doesn't block progress
  });

  it('pads or trims to the planned number of sets', () => {
    expect(suggest([[s(10, 20)]], 3, R, 2)!.sets).toHaveLength(3);
    expect(suggest([[s(10, 20), s(10, 20), s(10, 20), s(10, 20)]], 2, R, 2)!.sets).toHaveLength(2);
  });

  it('suggests 10% lighter after two drops in a row', () => {
    const r = suggest([[s(8, 50)], [s(10, 50)], [s(12, 50)]], 3, R, 2.5)!;
    expect(r.kind).toBe('deload');
    expect(r.sets[0].weightKg).toBe(45);
  });

  it('bodyweight moves add reps instead of weight', () => {
    const r = suggest([[s(12, 0), s(12, 0)]], 2, R, 0)!;
    expect(r.sets).toEqual([s(13, 0), s(12, 0)]);
  });

  it('picks the weight step from the equipment', () => {
    expect(stepKind(['dumbbell', 'bench'])).toBe('dumbbell');
    expect(stepKind(['ez_bar', 'preacher_bench'])).toBe('barbell');
    expect(stepKind(['cable'])).toBe('cable_machine');
    expect(stepKind(['plate_loaded'])).toBe('plate_loaded');
    expect(stepKind(['bodyweight'])).toBeNull();
  });

  it('rep range follows the goal', () => {
    expect(goalRange('Build Muscle')).toEqual({ min: 8, max: 12 });
    expect(goalRange('Strength')).toEqual({ min: 4, max: 6 });
    expect(goalRange('General Fitness')).toEqual({ min: 10, max: 15 });
  });
});
