import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { sessionPoints, type SessionPoint } from '../../lib/progress';

export interface ExerciseProgress {
  points: SessionPoint[];
  /** e1RM carried over from Fitbod (a seeded record with no session behind it). */
  seededE1rm?: number;
}

export async function loadProgress(exerciseId: string): Promise<ExerciseProgress> {
  const [sets, records] = await Promise.all([
    db.sets.where('exerciseId').equals(exerciseId).toArray(),
    db.records.where('[exerciseId+type]').equals([exerciseId, 'e1rm']).toArray(),
  ]);
  const seeded = records.filter((r) => !r.sessionId).map((r) => r.value);
  return { points: sessionPoints(sets), seededE1rm: seeded.length ? Math.max(...seeded) : undefined };
}

/** undefined while loading. */
export function useProgress(exerciseId: string) {
  return useLiveQuery(() => loadProgress(exerciseId), [exerciseId]);
}
