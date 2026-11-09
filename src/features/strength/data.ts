import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { SetLog } from '../../db/types';
import { useExercises, useSettings } from '../../lib/hooks';
import { sessionPoints } from '../../lib/progress';
import { addDays, startOfWeek } from '../../lib/stats';
import { weeklyScores, type Point } from '../../lib/strength';

/**
 * Everything the strength screens need: all working sets, and the score at each week start
 * from the first logged week to this week (scores only change on week start, per SPEC 3.9a).
 */
export function useStrength() {
  const settings = useSettings();
  const { map, loading } = useExercises();
  const sets = useLiveQuery(() => db.sets.toArray(), []);
  const weekStart = settings.weekStart;

  const result = useMemo(() => {
    if (!sets || loading) return undefined;
    const byEx = new Map<string, SetLog[]>();
    for (const s of sets) byEx.set(s.exerciseId, [...(byEx.get(s.exerciseId) ?? []), s]);
    const points = new Map<string, Point[]>();
    for (const [id, ss] of byEx) points.set(id, sessionPoints(ss).map((p) => ({ date: p.date, e1rm: p.e1rm })));

    const thisWeek = startOfWeek(Date.now(), weekStart);
    const first = sets.length ? startOfWeek(Math.min(...sets.map((s) => s.completedAt)), weekStart) : thisWeek;
    const weeks: number[] = [];
    // At least 5 weeks so there's always a "4 weeks ago" to compare against.
    for (let w = Math.min(first, addDays(thisWeek, -28)); w <= thisWeek; w = addDays(w, 7)) weeks.push(w);
    return { series: weeklyScores(points, map, weeks), sets, exercises: map };
  }, [sets, loading, map, weekStart]);

  return result;
}

export type StrengthData = NonNullable<ReturnType<typeof useStrength>>;
