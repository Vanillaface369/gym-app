// Fitbod history import (SPEC 6): preview first, then write sessions and sets, rebuild PRs and adjust lifetime totals.
import { db } from './db';
import { getSettings, rebuildRecords, updateSettings } from './actions';
import type { Exercise, SetLog, SplitDay, WorkoutSession } from './types';
import { caloriesEst, e1rm, round1, volumeKg } from '../lib/calc';
import { uid } from '../lib/format';
import { dayOf, groupWorkouts, matchExercise, parseFitbod, type FitbodWorkout } from '../lib/fitbod';

export interface NameRow { name: string; sets: number; workouts: number; match: string | null; score: number }
export interface ImportPreview {
  toImport: FitbodWorkout[];
  /** Fitbod workouts skipped because this app already has a workout that day. */
  sameDay: number;
  /** Rows with no reps (cardio, timed holds) or no readable date. */
  skippedRows: number;
  names: NameRow[];
  from: number;
  to: number;
}

export async function previewFitbod(text: string): Promise<ImportPreview> {
  const { sets, skipped } = parseFitbod(text);
  if (!sets.length) throw new Error('No sets with reps found in this file.');
  const workouts = groupWorkouts(sets);
  const existingDays = new Set((await db.sessions.toArray()).map((s) => dayOf(s.startedAt)));
  const toImport = workouts.filter((w) => !existingDays.has(dayOf(w.start)));
  const exercises = (await db.exercises.toArray()).filter((e) => !e.archived);
  const byName = new Map<string, NameRow>();
  for (const w of toImport) {
    const seen = new Set<string>();
    for (const s of w.sets) {
      let row = byName.get(s.exercise);
      if (!row) {
        const m = matchExercise(s.exercise, exercises);
        row = { name: s.exercise, sets: 0, workouts: 0, match: m.id, score: m.score };
        byName.set(s.exercise, row);
      }
      row.sets++;
      if (!seen.has(s.exercise)) { row.workouts++; seen.add(s.exercise); }
    }
  }
  return {
    toImport, sameDay: workouts.length - toImport.length, skippedRows: skipped,
    names: [...byName.values()].sort((a, b) => Number(a.match !== null) - Number(b.match !== null) || b.sets - a.sets),
    from: workouts[0].start, to: workouts[workouts.length - 1].start,
  };
}

/** Per Fitbod exercise name: one of the user's exercise ids, 'new' (create a custom exercise) or 'skip'. */
export type NameChoice = string;
export const NEW = 'new';
export const SKIP = 'skip';

export interface ImportResult { workouts: number; sets: number; newExercises: number }

export async function applyFitbod(preview: ImportPreview, choices: Record<string, NameChoice>): Promise<ImportResult> {
  const settings = await getSettings();
  const exercises = await db.exercises.toArray();
  const byId = new Map(exercises.map((e) => [e.id, e]));

  // Custom exercises for names the user chose to add.
  const created: Exercise[] = [];
  const idFor = new Map<string, string>();
  for (const row of preview.names) {
    const c = choices[row.name] ?? row.match ?? SKIP;
    if (c === SKIP) continue;
    if (c === NEW) {
      const ex: Exercise = {
        id: uid(), name: row.name, category: 'other', primaryMuscles: [], secondaryMuscles: [], equipment: [], isBodyweight: false,
        defaultRestSec: settings.restDefaultSec, preference: 0, isCustom: true, archived: false, useCount: row.workouts,
      };
      created.push(ex);
      byId.set(ex.id, ex);
      idFor.set(row.name, ex.id);
    } else if (byId.has(c)) idFor.set(row.name, c);
  }

  const sessions: WorkoutSession[] = [];
  const setLogs: SetLog[] = [];
  let calories = 0, volume = 0;
  for (const w of preview.toImport) {
    const kept = w.sets.filter((s) => idFor.has(s.exercise));
    if (!kept.length) continue;
    const id = uid();
    const counts = new Map<string, number>();
    const logs: SetLog[] = kept.map((s) => {
      const exerciseId = idFor.get(s.exercise)!;
      const setIndex = counts.get(exerciseId) ?? 0;
      counts.set(exerciseId, setIndex + 1);
      return {
        id: uid(), sessionId: id, exerciseId, setIndex, reps: s.reps, weightKg: s.weightKg, isWarmup: s.isWarmup,
        completedAt: s.at, e1rm: s.isWarmup ? 0 : round1(e1rm(s.weightKg, s.reps)),
      };
    });
    const day = guessDay(logs, byId);
    const vol = Math.round(volumeKg(logs));
    const cal = caloriesEst(settings.bodyweightKg, w.durationSec);
    sessions.push({
      id, name: DAY_NAME[day] ?? 'Workout', ...(day !== 'custom' ? { splitDay: day } : {}),
      startedAt: w.start, endedAt: w.start + w.durationSec * 1000, durationSec: w.durationSec,
      gymProfileId: settings.activeGymProfileId, caloriesEst: cal, volumeKg: vol, recordsCount: 0,
      exerciseOrder: [...counts.keys()],
    });
    setLogs.push(...logs);
    calories += cal;
    volume += vol;
  }
  if (!sessions.length) return { workouts: 0, sets: 0, newExercises: 0 };

  await db.transaction('rw', [db.exercises, db.sessions, db.sets], async () => {
    if (created.length) await db.exercises.bulkAdd(created);
    await db.sessions.bulkAdd(sessions);
    await db.sets.bulkAdd(setLogs);
  });

  // PRs: the real sessions replace any carried-over (seeded) records for these exercises, then everything is replayed in order.
  const touched = [...new Set(setLogs.map((s) => s.exerciseId))];
  const seeded = (await db.records.where('exerciseId').anyOf(touched).toArray()).filter((r) => !r.sessionId);
  await db.records.bulkDelete(seeded.map((r) => r.id));
  await rebuildRecords(touched);

  // The starting totals were Fitbod's lifetime numbers; take off what's now real data so nothing counts twice.
  const off = settings.lifetimeOffset;
  await updateSettings({
    lifetimeOffset: {
      workouts: Math.max(0, off.workouts - sessions.length),
      volumeKg: Math.max(0, off.volumeKg - volume),
      calories: Math.max(0, off.calories - calories),
    },
  });
  return { workouts: sessions.length, sets: setLogs.length, newExercises: created.length };
}

const DAY_NAME: Partial<Record<SplitDay, string>> = { push: 'Push Day', pull: 'Pull Day', legs: 'Leg Day' };

/** Push / Pull / Legs when at least 60% of working sets are in one group; otherwise a general workout. */
function guessDay(logs: SetLog[], byId: Map<string, Exercise>): SplitDay {
  const n = { push: 0, pull: 0, legs: 0 };
  let total = 0;
  for (const s of logs) {
    if (s.isWarmup) continue;
    total++;
    const c = byId.get(s.exerciseId)?.category;
    if (c === 'push' || c === 'pull' || c === 'legs') n[c]++;
  }
  const [best, count] = (Object.entries(n) as [SplitDay, number][]).sort((a, b) => b[1] - a[1])[0];
  return total && count / total >= 0.6 ? best : 'custom';
}
