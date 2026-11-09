import { describe, expect, it } from 'vitest';
import { levelUps, lifetimeTotals, longestStreak, milestoneLevel, MILESTONE_TIERS, monthGrid, startOfWeek, weekStreak } from './stats';

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

describe('milestones and streaks', () => {
  it('lifetime totals add the starting numbers', () => {
    expect(lifetimeTotals([{ volumeKg: 1000, caloriesEst: 300 }, { volumeKg: 500, caloriesEst: 200 }], { workouts: 10, volumeKg: 100, calories: 50 }))
      .toEqual({ workouts: 12, volumeKg: 1600, calories: 550 });
  });

  it('spots level-ups', () => {
    const before = { workouts: 24, volumeKg: 9_000, calories: 900 };
    expect(levelUps(before, { workouts: 25, volumeKg: 9_500, calories: 900 })).toEqual([{ track: 'workouts', level: 2, next: 50 }]);
    expect(levelUps(before, before)).toEqual([]);
  });

  it('longest streak looks across all weeks', () => {
    const now = new Date(2026, 10, 11, 12).getTime(); // Wed 11 Nov 2026
    const d = (y: number, m: number, day: number) => new Date(y, m, day, 10).getTime();
    // Three good weeks in Oct (2 days each), a gap, then one good week, and this week not yet met.
    const t = [d(2026, 9, 5), d(2026, 9, 6), d(2026, 9, 12), d(2026, 9, 13), d(2026, 9, 19), d(2026, 9, 20), d(2026, 10, 2), d(2026, 10, 3), d(2026, 10, 9)];
    expect(longestStreak(t, 2, 0, now)).toBe(3);
    expect(longestStreak([], 2, 0, now)).toBe(0);
  });
});
