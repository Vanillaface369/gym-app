// Date maths for the Log tab: weeks, streaks, calendar grid, milestone tiers. Local time throughout.

const DAY = 86_400_000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Midnight at the start of the week containing ts. weekStart 0 = Sunday, 1 = Monday. */
export function startOfWeek(ts: number, weekStart: 0 | 1): number {
  const d = new Date(startOfDay(ts));
  const diff = (d.getDay() - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n); // DST-safe, unlike adding n * DAY
  return d.getTime();
}

/** Distinct training days within [from, to). */
export function trainingDays(startTimes: number[], from: number, to: number): number {
  return new Set(startTimes.filter((t) => t >= from && t < to).map(dayKey)).size;
}

/**
 * Consecutive weeks that hit the goal (distinct training days >= goal).
 * The current week counts if already met; if not met yet it doesn't break the streak.
 */
export function weekStreak(startTimes: number[], goal: number, weekStart: 0 | 1, now = Date.now()): number {
  if (goal <= 0 || !startTimes.length) return 0;
  const earliest = Math.min(...startTimes);
  let wk = startOfWeek(now, weekStart);
  let streak = 0;
  const thisWeekMet = trainingDays(startTimes, wk, addDays(wk, 7)) >= goal;
  if (thisWeekMet) streak++;
  wk = addDays(wk, -7);
  while (wk + 7 * DAY > earliest) {
    if (trainingDays(startTimes, wk, addDays(wk, 7)) >= goal) streak++;
    else break;
    wk = addDays(wk, -7);
  }
  return streak;
}

/** 6x7 (or fewer) grid of day timestamps covering the month, padded to whole weeks. */
export function monthGrid(year: number, month: number, weekStart: 0 | 1): number[][] {
  const first = new Date(year, month, 1).getTime();
  let day = startOfWeek(first, weekStart);
  const last = new Date(year, month + 1, 0).getTime();
  const weeks: number[][] = [];
  while (day <= last) {
    const wk: number[] = [];
    for (let i = 0; i < 7; i++) { wk.push(day); day = addDays(day, 1); }
    weeks.push(wk);
  }
  return weeks;
}

export function weekdayLabels(weekStart: 0 | 1): string[] {
  const names = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return [...names.slice(weekStart), ...names.slice(0, weekStart)];
}

// ---------- Milestones ----------
export const MILESTONE_TIERS = {
  workouts: [10, 25, 50, 100, 200, 500, 1000, 2000],
  volumeKg: [10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000],
  calories: [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000],
} as const;

/** Level = number of tiers reached; next = the next target (null when maxed). */
export function milestoneLevel(value: number, tiers: readonly number[]): { level: number; next: number | null } {
  const level = tiers.filter((t) => value >= t).length;
  return { level, next: tiers[level] ?? null };
}

export type Track = 'workouts' | 'volumeKg' | 'calories';
export interface Totals { workouts: number; volumeKg: number; calories: number }

/** Lifetime totals: carried-over starting numbers plus every logged workout. */
export function lifetimeTotals(sessions: { volumeKg: number; caloriesEst: number }[], offset: Totals): Totals {
  return {
    workouts: offset.workouts + sessions.length,
    volumeKg: offset.volumeKg + sessions.reduce((t, s) => t + s.volumeKg, 0),
    calories: offset.calories + sessions.reduce((t, s) => t + s.caloriesEst, 0),
  };
}

/** Tracks whose milestone level went up between two totals, with the new level. */
export function levelUps(before: Totals, after: Totals): { track: Track; level: number; next: number | null }[] {
  return (Object.keys(MILESTONE_TIERS) as Track[])
    .map((track) => ({ track, b: milestoneLevel(before[track], MILESTONE_TIERS[track]), a: milestoneLevel(after[track], MILESTONE_TIERS[track]) }))
    .filter((x) => x.a.level > x.b.level)
    .map((x) => ({ track: x.track, level: x.a.level, next: x.a.next }));
}

/** Longest run of consecutive weeks that met the goal, ever (the current week counts only once met). */
export function longestStreak(startTimes: number[], goal: number, weekStart: 0 | 1, now = Date.now()): number {
  if (goal <= 0 || !startTimes.length) return 0;
  let best = 0, run = 0;
  const thisWeek = startOfWeek(now, weekStart);
  for (let wk = startOfWeek(Math.min(...startTimes), weekStart); wk <= thisWeek; wk = addDays(wk, 7)) {
    const met = trainingDays(startTimes, wk, addDays(wk, 7)) >= goal;
    if (met) best = Math.max(best, ++run);
    else if (wk !== thisWeek) run = 0;
  }
  return best;
}
