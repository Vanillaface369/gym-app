import { describe, expect, it } from 'vitest';
import { milestoneLevel, MILESTONE_TIERS, monthGrid, startOfWeek, weekStreak } from './stats';

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime();

describe('stats', () => {
  it('startOfWeek honours Sunday or Monday start', () => {
    const wed = at(2026, 11, 11); // Wed 11 Nov 2026
    expect(new Date(startOfWeek(wed, 0)).getDate()).toBe(8); // Sun 8
    expect(new Date(startOfWeek(wed, 1)).getDate()).toBe(9); // Mon 9
  });

  it('streak counts consecutive weeks meeting the goal', () => {
    const now = at(2026, 11, 11);
    // This week: 1 day (not met yet, doesn't break). Last 2 weeks: 2 days each. Week before: 1 day.
    const times = [at(2026, 11, 9), at(2026, 11, 2), at(2026, 11, 4), at(2026, 10, 26), at(2026, 10, 28), at(2026, 10, 20)];
    expect(weekStreak(times, 2, 0, now)).toBe(2);
    // Two sessions on the same day count as one training day
    expect(weekStreak([at(2026, 11, 2, 8), at(2026, 11, 2, 18)], 2, 0, now)).toBe(0);
    // Met this week too
    expect(weekStreak([...times, at(2026, 11, 10)], 2, 0, now)).toBe(3);
  });

  it('monthGrid pads to whole weeks', () => {
    const g = monthGrid(2026, 10, 0); // November 2026 starts on a Sunday
    expect(g[0][0]).toBe(at(2026, 11, 1, 0));
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g.length).toBe(5);
  });

  it('milestone level and next target', () => {
    expect(milestoneLevel(206, MILESTONE_TIERS.workouts)).toEqual({ level: 5, next: 500 });
    expect(milestoneLevel(5, MILESTONE_TIERS.workouts)).toEqual({ level: 0, next: 10 });
  });
});
