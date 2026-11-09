// Exercise progress maths (SPEC 3.5). Pure functions over set logs, so they are easy to test.
import { round1, volumeKg } from './calc';

export type Range = 'week' | 'month' | '6m' | 'year';
export const RANGES: { id: Range; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: '6m', label: '6 Month' },
  { id: 'year', label: 'Year' },
];

export interface SetIn {
  sessionId: string;
  setIndex: number;
  reps: number;
  weightKg: number;
  isWarmup: boolean;
  completedAt: number;
  e1rm: number;
}

/** One session of one exercise. */
export interface SessionPoint {
  sessionId: string;
  date: number;
  /** Best estimated 1RM that session. */
  e1rm: number;
  volumeKg: number;
  /** Working sets in order. */
  sets: { reps: number; weightKg: number }[];
}

/** A point on the chart: one session, or the best session of a month. */
export interface ChartPoint { date: number; e1rm: number; sessionId: string }

const isWorking = (s: SetIn) => !s.isWarmup && s.reps > 0 && s.weightKg > 0;

/** Group an exercise's set logs into sessions (working sets only), oldest first. */
export function sessionPoints(sets: SetIn[]): SessionPoint[] {
  const by = new Map<string, SetIn[]>();
  for (const s of sets) if (isWorking(s)) by.set(s.sessionId, [...(by.get(s.sessionId) ?? []), s]);
  return [...by.entries()]
    .map(([sessionId, ss]) => {
      ss.sort((a, b) => a.setIndex - b.setIndex);
      return {
        sessionId,
        date: Math.min(...ss.map((s) => s.completedAt)),
        e1rm: round1(Math.max(...ss.map((s) => s.e1rm))),
        volumeKg: volumeKg(ss),
        sets: ss.map((s) => ({ reps: s.reps, weightKg: s.weightKg })),
      };
    })
    .sort((a, b) => a.date - b.date);
}

/** Start of the range ending at `now`. */
export function rangeStart(range: Range, now: number): number {
  const d = new Date(now);
  switch (range) {
    case 'week': d.setDate(d.getDate() - 7); break;
    case 'month': d.setMonth(d.getMonth() - 1); break;
    case '6m': d.setMonth(d.getMonth() - 6); break;
    case 'year': d.setFullYear(d.getFullYear() - 1); break;
  }
  return d.getTime();
}

/** Longer ranges show the monthly best rather than every session. */
export const isMonthly = (range: Range) => range === '6m' || range === 'year';

/** Points for the chart: sessions inside the range, or each month's best session for 6 Month / Year. */
export function chartPoints(points: SessionPoint[], range: Range, now: number): ChartPoint[] {
  const from = rangeStart(range, now);
  const inRange = points.filter((p) => p.date >= from && p.date <= now);
  if (!isMonthly(range)) return inRange.map(({ date, e1rm, sessionId }) => ({ date, e1rm, sessionId }));
  const byMonth = new Map<string, SessionPoint>();
  for (const p of inRange) {
    const d = new Date(p.date);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const cur = byMonth.get(k);
    if (!cur || p.e1rm > cur.e1rm) byMonth.set(k, p);
  }
  return [...byMonth.values()].sort((a, b) => a.date - b.date).map(({ date, e1rm, sessionId }) => ({ date, e1rm, sessionId }));
}

export interface RangeSummary { min: number; max: number; avg: number; from: number; to: number }

/** Low/high/average estimated 1RM over the chart points. Null when there are none. */
export function summarise(points: ChartPoint[]): RangeSummary | null {
  if (!points.length) return null;
  const vals = points.map((p) => p.e1rm);
  return {
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: round1(vals.reduce((a, b) => a + b, 0) / vals.length),
    from: points[0].date,
    to: points[points.length - 1].date,
  };
}

export interface Best<T = number> { value: T; date: number; sessionId?: string }
export interface Bests {
  weight?: Best;
  e1rm?: Best & { fromFitbod?: boolean };
  volume?: Best;
  /** Most reps done at each weight, heaviest first. */
  repsAtWeight: { weightKg: number; reps: number; date: number }[];
}

/**
 * All-time bests from the logged sessions. A seeded e1RM (carried over from Fitbod, no session behind it)
 * wins if it is higher than anything logged here.
 */
export function allTimeBests(points: SessionPoint[], seededE1rm?: number): Bests {
  const out: Bests = { repsAtWeight: [] };
  const reps = new Map<number, { reps: number; date: number }>();
  for (const p of points) {
    const top = Math.max(...p.sets.map((s) => s.weightKg));
    if (!out.weight || top > out.weight.value) out.weight = { value: top, date: p.date, sessionId: p.sessionId };
    if (!out.e1rm || p.e1rm > out.e1rm.value) out.e1rm = { value: p.e1rm, date: p.date, sessionId: p.sessionId };
    if (!out.volume || p.volumeKg > out.volume.value) out.volume = { value: p.volumeKg, date: p.date, sessionId: p.sessionId };
    for (const s of p.sets) {
      const cur = reps.get(s.weightKg);
      if (!cur || s.reps > cur.reps) reps.set(s.weightKg, { reps: s.reps, date: p.date });
    }
  }
  if (seededE1rm !== undefined && (!out.e1rm || seededE1rm > out.e1rm.value)) out.e1rm = { value: seededE1rm, date: 0, fromFitbod: true };
  out.repsAtWeight = [...reps.entries()].map(([weightKg, r]) => ({ weightKg, ...r })).sort((a, b) => b.weightKg - a.weightKg);
  return out;
}

/** Benchmark lifts: the pinned list if set, otherwise the most-used exercises. */
export function pickBenchmarks<E extends { id: string; useCount: number; archived: boolean }>(exercises: E[], pinned: string[] | undefined, count = 5): E[] {
  if (pinned) {
    const by = new Map(exercises.map((e) => [e.id, e]));
    return pinned.map((id) => by.get(id)).filter((e): e is E => !!e && !e.archived);
  }
  return exercises.filter((e) => !e.archived && e.useCount > 0).sort((a, b) => b.useCount - a.useCount).slice(0, count);
}
