import { db } from './db';
import { defaultSettings } from './seed';
import type {
  ActiveItem, ActiveWorkout, Exercise, PersonalRecord, SetLog, Settings, TemplateItem, WorkoutSession, WorkoutTemplate,
} from './types';
import { caloriesEst, detectRecords, e1rm, isCelebrated, maxEffortRamp, round1, volumeKg, type NewRecord, type PriorBest } from '../lib/calc';
import { uid } from '../lib/format';

// ---------- Settings ----------
export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('settings')) ?? defaultSettings;
}
export async function updateSettings(patch: Partial<Settings>) {
  const cur = await getSettings();
  await db.settings.put({ ...cur, ...patch, id: 'settings' });
}

// ---------- History helpers ----------
/** Working sets from the most recent finished sessions containing this exercise, newest first, grouped by session. */
export async function recentSessionsFor(exerciseId: string, limit = 2): Promise<SetLog[][]> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const bySession = new Map<string, SetLog[]>();
  for (const s of sets) {
    if (s.isWarmup) continue;
    const arr = bySession.get(s.sessionId) ?? [];
    arr.push(s);
    bySession.set(s.sessionId, arr);
  }
  return [...bySession.values()]
    .map((a) => a.sort((x, y) => x.setIndex - y.setIndex))
    .sort((a, b) => b[0].completedAt - a[0].completedAt)
    .slice(0, limit);
}

/** +1 if best e1RM went up last session vs the one before, -1 if down, 0 otherwise / not enough data. */
export async function progressionTrend(exerciseId: string): Promise<-1 | 0 | 1> {
  const [last, prev] = await recentSessionsFor(exerciseId, 2);
  if (!last || !prev) return 0;
  const best = (ss: SetLog[]) => Math.max(...ss.map((s) => s.e1rm));
  const d = best(last) - best(prev);
  return d > 0.01 ? 1 : d < -0.01 ? -1 : 0;
}

// ---------- Building a workout ----------
async function buildItem(t: Pick<TemplateItem, 'exerciseId' | 'sets' | 'targetReps' | 'targetWeightKg' | 'restSec' | 'maxEffort'>): Promise<ActiveItem> {
  const [last] = await recentSessionsFor(t.exerciseId, 1);
  const lastTop = last?.length ? Math.max(...last.map((s) => s.weightKg)) : null;
  if (t.maxEffort) {
    const top = lastTop ?? t.targetWeightKg ?? 0;
    return {
      key: uid(), exerciseId: t.exerciseId, restSec: t.restSec, maxEffort: true,
      sets: maxEffortRamp(t.sets, top, t.targetReps).map((s) => ({ ...s, done: false, isWarmup: false })),
    };
  }
  const sets = Array.from({ length: t.sets }, (_, i) => {
    const fromLast = last?.[Math.min(i, last.length - 1)]?.weightKg;
    return { reps: t.targetReps, weightKg: fromLast ?? t.targetWeightKg ?? 0, done: false, isWarmup: false };
  });
  return { key: uid(), exerciseId: t.exerciseId, restSec: t.restSec, sets };
}

export async function itemForExercise(ex: Exercise): Promise<ActiveItem> {
  return buildItem({ exerciseId: ex.id, sets: 3, targetReps: 10, targetWeightKg: null, restSec: ex.defaultRestSec });
}

/** The template to suggest today: the one picked via Switch, else the split day done least recently. */
export async function suggestedTemplate(): Promise<WorkoutTemplate | null> {
  const settings = await getSettings();
  if (settings.selectedTemplateId) {
    const t = await db.templates.get(settings.selectedTemplateId);
    if (t) return t;
  }
  const order = ['push', 'pull', 'legs'];
  const splits = (await db.templates.toArray())
    .filter((t) => t.splitDay && order.includes(t.splitDay))
    .sort((a, b) => order.indexOf(a.splitDay!) - order.indexOf(b.splitDay!));
  if (!splits.length) return (await db.templates.toArray())[0] ?? null;
  const sessions = await db.sessions.orderBy('startedAt').reverse().toArray();
  const lastDone = (t: WorkoutTemplate) =>
    sessions.find((s) => s.templateId === t.id || (s.splitDay && s.splitDay === t.splitDay))?.startedAt ?? 0;
  return splits.reduce((best, t) => (lastDone(t) < lastDone(best) ? t : best));
}

export async function startWorkout(template: WorkoutTemplate): Promise<void> {
  const items: ActiveItem[] = [];
  for (const t of [...template.items].sort((a, b) => a.order - b.order)) items.push(await buildItem(t));
  const active: ActiveWorkout = {
    id: 'current', name: template.name, templateId: template.id, splitDay: template.splitDay,
    startedAt: Date.now(), items, rest: null,
  };
  await db.active.put(active);
}

export async function startEmptyWorkout(name = 'Workout'): Promise<void> {
  await db.active.put({ id: 'current', name, startedAt: Date.now(), items: [], rest: null });
}

// ---------- Active workout mutations ----------
async function mutateActive(fn: (a: ActiveWorkout) => void) {
  await db.transaction('rw', db.active, async () => {
    const a = await db.active.get('current');
    if (!a) return;
    fn(a);
    await db.active.put(a);
  });
}

export const activeActions = {
  /** Edit a set. Later unlogged sets that matched the old value (or have no weight yet) follow along, so you type it once. */
  updateSet: (itemKey: string, i: number, patch: Partial<{ reps: number; weightKg: number }>) =>
    mutateActive((a) => {
      const it = a.items.find((x) => x.key === itemKey);
      const s = it?.sets[i];
      if (!it || !s) return;
      for (const k of ['reps', 'weightKg'] as const) {
        const v = patch[k];
        if (v === undefined) continue;
        const old = s[k];
        s[k] = v;
        if (it.maxEffort) continue; // ramp sets differ on purpose
        for (const later of it.sets.slice(i + 1)) if (!later.done && (later[k] === old || (k === 'weightKg' && later[k] === 0))) later[k] = v;
      }
    }),
  /** Log a set (or un-log it if already done) and start the rest timer. */
  toggleSet: (itemKey: string, i: number) =>
    mutateActive((a) => {
      const it = a.items.find((x) => x.key === itemKey);
      const s = it?.sets[i];
      if (!it || !s) return;
      s.done = !s.done;
      s.completedAt = s.done ? Date.now() : undefined;
      if (s.done) startRest(a, it);
    }),
  logNext: (itemKey: string) =>
    mutateActive((a) => {
      const it = a.items.find((x) => x.key === itemKey);
      const s = it?.sets.find((x) => !x.done);
      if (!it || !s) return;
      s.done = true;
      s.completedAt = Date.now();
      startRest(a, it);
    }),
  logAll: (itemKey: string) =>
    mutateActive((a) => {
      const it = a.items.find((x) => x.key === itemKey);
      if (!it) return;
      const now = Date.now();
      it.sets.forEach((s) => { if (!s.done) { s.done = true; s.completedAt = now; } });
      a.rest = null;
    }),
  addSet: (itemKey: string) =>
    mutateActive((a) => {
      const it = a.items.find((x) => x.key === itemKey);
      if (!it) return;
      const last = it.sets[it.sets.length - 1];
      it.sets.push({ reps: last?.reps ?? 10, weightKg: last?.weightKg ?? 0, done: false, isWarmup: false });
    }),
  removeSet: (itemKey: string, i: number) =>
    mutateActive((a) => {
      const it = a.items.find((x) => x.key === itemKey);
      if (it && it.sets.length > 1) it.sets.splice(i, 1);
    }),
  setRest: (itemKey: string, restSec: number) =>
    mutateActive((a) => {
      const it = a.items.find((x) => x.key === itemKey);
      if (it) it.restSec = restSec;
    }),
  addItem: async (item: ActiveItem) => mutateActive((a) => { a.items.push(item); }),
  replaceItem: async (itemKey: string, ex: Exercise) => {
    const fresh = await itemForExercise(ex);
    await mutateActive((a) => {
      const idx = a.items.findIndex((x) => x.key === itemKey);
      if (idx < 0) return;
      const old = a.items[idx];
      // Keep the planned set count and reps; weights come from the new exercise's history.
      fresh.sets = old.sets.map((s, i) => ({ reps: s.reps, weightKg: fresh.sets[Math.min(i, fresh.sets.length - 1)].weightKg, done: false, isWarmup: false }));
      fresh.key = old.key;
      a.items[idx] = fresh;
    });
  },
  removeItem: (itemKey: string) => mutateActive((a) => { a.items = a.items.filter((x) => x.key !== itemKey); }),
  moveItem: (itemKey: string, dir: -1 | 1) =>
    mutateActive((a) => {
      const i = a.items.findIndex((x) => x.key === itemKey);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= a.items.length) return;
      [a.items[i], a.items[j]] = [a.items[j], a.items[i]];
    }),
  // Rest timer (timestamp based so it stays right while the screen is locked)
  restAdjust: (deltaSec: number) =>
    mutateActive((a) => {
      if (!a.rest) return;
      const d = deltaSec * 1000;
      if (a.rest.endsAt !== null) a.rest.endsAt = Math.max(Date.now(), a.rest.endsAt + d);
      if (a.rest.pausedRemainingMs !== null) a.rest.pausedRemainingMs = Math.max(0, a.rest.pausedRemainingMs + d);
      a.rest.durationMs = Math.max(1000, a.rest.durationMs + d);
    }),
  restPauseToggle: () =>
    mutateActive((a) => {
      if (!a.rest) return;
      if (a.rest.endsAt !== null) {
        a.rest.pausedRemainingMs = Math.max(0, a.rest.endsAt - Date.now());
        a.rest.endsAt = null;
      } else if (a.rest.pausedRemainingMs !== null) {
        a.rest.endsAt = Date.now() + a.rest.pausedRemainingMs;
        a.rest.pausedRemainingMs = null;
      }
    }),
  restStop: () => mutateActive((a) => { a.rest = null; }),
  rename: (name: string) => mutateActive((a) => { a.name = name; }),
};

function startRest(a: ActiveWorkout, it: ActiveItem) {
  const ms = it.restSec * 1000;
  const now = Date.now();
  a.rest = { startedAt: now, durationMs: ms, endsAt: now + ms, pausedRemainingMs: null, itemKey: it.key };
}

export async function discardWorkout() {
  await db.active.delete('current');
}

// ---------- Finishing ----------
async function priorBests(exerciseId: string): Promise<PriorBest> {
  const recs = await db.records.where('exerciseId').equals(exerciseId).toArray();
  const max = (t: string) => {
    const v = recs.filter((r) => r.type === t).map((r) => r.value);
    return v.length ? Math.max(...v) : undefined;
  };
  const repsAtWeight = new Map<number, number>();
  for (const r of recs) if (r.type === 'reps' && r.weightKg !== undefined) repsAtWeight.set(r.weightKg, Math.max(repsAtWeight.get(r.weightKg) ?? 0, r.value));
  return { weight: max('weight'), e1rm: max('e1rm'), volume: max('volume'), repsAtWeight };
}

/** Saves the active workout as a session. Returns the new session id, or null if nothing was logged. */
export async function finishWorkout(): Promise<string | null> {
  const a = await db.active.get('current');
  if (!a) return null;
  const settings = await getSettings();
  const sessionId = uid();
  const endedAt = Date.now();
  const durationSec = Math.round((endedAt - a.startedAt) / 1000);

  const setLogs: SetLog[] = [];
  for (const it of a.items) {
    let idx = 0;
    for (const s of it.sets) {
      if (!s.done) continue;
      setLogs.push({
        id: uid(), sessionId, exerciseId: it.exerciseId, setIndex: idx++, reps: s.reps, weightKg: s.weightKg,
        isWarmup: s.isWarmup, completedAt: s.completedAt ?? endedAt, e1rm: s.isWarmup ? 0 : round1(e1rm(s.weightKg, s.reps)),
      });
    }
  }
  if (!setLogs.length) return null;

  const exerciseOrder = [...new Set(setLogs.map((s) => s.exerciseId))];
  await db.transaction('rw', [db.sessions, db.sets, db.records, db.exercises, db.active, db.settings], async () => {
    let recordsCount = 0;
    const newRecords: PersonalRecord[] = [];
    for (const exId of exerciseOrder) {
      const recs = detectRecords(exId, setLogs.filter((s) => s.exerciseId === exId), await priorBests(exId));
      recordsCount += recs.filter(isCelebrated).length;
      newRecords.push(...recs.map((r) => toRecord(r, sessionId, endedAt)));
      const ex = await db.exercises.get(exId);
      if (ex) await db.exercises.update(exId, { useCount: ex.useCount + 1 });
    }
    const session: WorkoutSession = {
      id: sessionId, name: a.name, templateId: a.templateId, splitDay: a.splitDay,
      startedAt: a.startedAt, endedAt, durationSec, gymProfileId: settings.activeGymProfileId,
      caloriesEst: caloriesEst(settings.bodyweightKg, durationSec), volumeKg: Math.round(volumeKg(setLogs)),
      recordsCount, exerciseOrder,
    };
    await db.sessions.add(session);
    await db.sets.bulkAdd(setLogs);
    await db.records.bulkAdd(newRecords);
    await db.active.delete('current');
    const cur = await db.settings.get('settings');
    if (cur) await db.settings.put({ ...cur, selectedTemplateId: undefined });
  });
  return sessionId;
}

function toRecord(r: NewRecord, sessionId: string, date: number): PersonalRecord {
  return {
    id: uid(), exerciseId: r.exerciseId, type: r.type, value: r.value, sessionId, date,
    ...(r.weightKg !== undefined ? { weightKg: r.weightKg } : {}),
    ...(r.previous !== undefined ? { previous: r.previous } : {}),
  };
}

/** Celebrated PRs set in a session (beat a previous best). */
export async function sessionRecords(sessionId: string): Promise<PersonalRecord[]> {
  const recs = await db.records.toArray();
  return recs.filter((r) => r.sessionId === sessionId && r.previous !== undefined);
}

export async function deleteSession(sessionId: string) {
  await db.transaction('rw', [db.sessions, db.sets, db.records, db.exercises], async () => {
    const sets = await db.sets.where('sessionId').equals(sessionId).toArray();
    const exIds = [...new Set(sets.map((s) => s.exerciseId))];
    await db.sets.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
    for (const id of exIds) {
      const ex = await db.exercises.get(id);
      if (ex) await db.exercises.update(id, { useCount: Math.max(0, ex.useCount - 1) });
    }
    await rebuildRecords(exIds);
  });
}

/** Rebuild PR history for some exercises from all remaining sessions (seeded records are kept). */
export async function rebuildRecords(exerciseIds: string[]) {
  const sessions = await db.sessions.orderBy('startedAt').toArray();
  for (const exId of exerciseIds) {
    const all = await db.records.where('exerciseId').equals(exId).toArray();
    await db.records.bulkDelete(all.filter((r) => r.sessionId).map((r) => r.id));
    const seeded = all.filter((r) => !r.sessionId);
    const prior: PriorBest = { repsAtWeight: new Map() };
    for (const r of seeded) {
      if (r.type === 'weight') prior.weight = Math.max(prior.weight ?? 0, r.value);
      if (r.type === 'e1rm') prior.e1rm = Math.max(prior.e1rm ?? 0, r.value);
      if (r.type === 'volume') prior.volume = Math.max(prior.volume ?? 0, r.value);
    }
    const sets = await db.sets.where('exerciseId').equals(exId).toArray();
    for (const sess of sessions) {
      const ss = sets.filter((s) => s.sessionId === sess.id);
      if (!ss.length) continue;
      const recs = detectRecords(exId, ss, prior);
      for (const r of recs) {
        if (r.type === 'weight') prior.weight = r.value;
        if (r.type === 'e1rm') prior.e1rm = r.value;
        if (r.type === 'volume') prior.volume = r.value;
        if (r.type === 'reps' && r.weightKg !== undefined) prior.repsAtWeight.set(r.weightKg, r.value);
      }
      await db.records.bulkAdd(recs.map((r) => toRecord(r, sess.id, sess.endedAt)));
    }
  }
  // Keep each session's record count in step
  for (const sess of sessions) {
    const n = (await sessionRecords(sess.id)).length;
    if (n !== sess.recordsCount) await db.sessions.update(sess.id, { recordsCount: n });
  }
}

// ---------- Templates ----------
export async function saveTemplate(t: WorkoutTemplate) {
  t.items = t.items.map((it, i) => ({ ...it, order: i }));
  await db.templates.put(t);
}

export async function createTemplate(name: string): Promise<WorkoutTemplate> {
  const t: WorkoutTemplate = { id: uid(), name: name.trim() || 'My Workout', splitDay: 'custom', items: [] };
  await db.templates.add(t);
  return t;
}

export async function setPreference(exerciseId: string, preference: -1 | 0 | 1) {
  await db.exercises.update(exerciseId, { preference });
}

/**
 * Import a workout from JSON. Accepted shape:
 * { "name": "Arms", "exercises": [ { "name": "Barbell Curl", "sets": 3, "reps": 12, "weightKg": 22.5, "restSec": 75 } ] }
 * Unknown exercise names become custom exercises.
 */
export async function importWorkoutJson(text: string): Promise<WorkoutTemplate> {
  const data = JSON.parse(text);
  const list = Array.isArray(data?.exercises) ? data.exercises : Array.isArray(data?.items) ? data.items : null;
  if (!list) throw new Error('Expected an "exercises" list.');
  const all = await db.exercises.toArray();
  const { restDefaultSec } = await getSettings();
  const items: TemplateItem[] = [];
  for (const [i, raw] of list.entries()) {
    const name = String(raw.name ?? raw.exercise ?? '').trim();
    if (!name) throw new Error(`Exercise ${i + 1} has no name.`);
    let ex = all.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (!ex) {
      ex = {
        id: uid(), name, category: 'other', primaryMuscles: [], secondaryMuscles: [], equipment: [],
        isBodyweight: false, defaultRestSec: restDefaultSec, preference: 0, isCustom: true, archived: false, useCount: 0,
      };
      await db.exercises.add(ex);
      all.push(ex);
    }
    items.push({
      exerciseId: ex.id, sets: Number(raw.sets) || 3, targetReps: Number(raw.reps) || 10,
      targetWeightKg: raw.weightKg !== undefined ? Number(raw.weightKg) : null,
      restSec: Number(raw.restSec) || ex.defaultRestSec, order: i, ...(raw.maxEffort ? { maxEffort: true } : {}),
    });
  }
  const t: WorkoutTemplate = { id: uid(), name: String(data.name ?? 'Imported Workout'), splitDay: 'custom', items };
  await db.templates.add(t);
  return t;
}

// ---------- Editing finished workouts & logging past ones ----------
export interface EditGroup { exerciseId: string; sets: { reps: number; weightKg: number }[] }
export interface SessionMeta { name: string; startedAt: number; durationSec: number }

/** Rewrite a finished workout's details and sets, then recompute its totals and the affected PRs. */
export async function saveSessionEdits(sessionId: string, meta: SessionMeta, groups: EditGroup[]) {
  const settings = await getSettings();
  await db.transaction('rw', [db.sessions, db.sets, db.records, db.exercises], async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new Error('Workout not found');
    const oldSets = await db.sets.where('sessionId').equals(sessionId).toArray();
    const oldEx = new Set(oldSets.map((s) => s.exerciseId));

    const kept = groups.map((g) => ({ ...g, sets: g.sets.filter((s) => s.reps > 0) })).filter((g) => g.sets.length);
    const total = kept.reduce((t, g) => t + g.sets.length, 0);
    const step = total > 1 ? (meta.durationSec * 1000) / total : 0;
    let n = 0;
    const setLogs: SetLog[] = kept.flatMap((g) =>
      g.sets.map((s, i) => ({
        id: uid(), sessionId, exerciseId: g.exerciseId, setIndex: i, reps: s.reps, weightKg: s.weightKg,
        isWarmup: false, completedAt: meta.startedAt + Math.round(step * n++), e1rm: round1(e1rm(s.weightKg, s.reps)),
      })),
    );
    const newEx = new Set(setLogs.map((s) => s.exerciseId));

    await db.sets.where('sessionId').equals(sessionId).delete();
    await db.sets.bulkAdd(setLogs);
    await db.sessions.put({
      ...session,
      name: meta.name.trim() || session.name,
      startedAt: meta.startedAt,
      durationSec: meta.durationSec,
      endedAt: meta.startedAt + meta.durationSec * 1000,
      caloriesEst: caloriesEst(settings.bodyweightKg, meta.durationSec),
      volumeKg: Math.round(volumeKg(setLogs)),
      exerciseOrder: [...newEx],
    });
    for (const id of oldEx) if (!newEx.has(id)) await bumpUse(id, -1);
    for (const id of newEx) if (!oldEx.has(id)) await bumpUse(id, 1);
    await rebuildRecords([...new Set([...oldEx, ...newEx])]);
  });
}

async function bumpUse(exerciseId: string, by: number) {
  const ex = await db.exercises.get(exerciseId);
  if (ex) await db.exercises.update(exerciseId, { useCount: Math.max(0, ex.useCount + by) });
}

/** Log a workout after the fact. With a template, its exercises and planned sets are filled in to edit. */
export async function createManualSession(meta: SessionMeta, template?: WorkoutTemplate): Promise<string> {
  const settings = await getSettings();
  const id = uid();
  await db.sessions.add({
    id, name: meta.name.trim() || template?.name || 'Workout', templateId: template?.id, splitDay: template?.splitDay,
    startedAt: meta.startedAt, endedAt: meta.startedAt + meta.durationSec * 1000, durationSec: meta.durationSec,
    gymProfileId: settings.activeGymProfileId, caloriesEst: 0, volumeKg: 0, recordsCount: 0, exerciseOrder: [],
  });
  const groups: EditGroup[] = [];
  if (template) {
    for (const t of [...template.items].sort((a, b) => a.order - b.order)) {
      const it = await buildItem(t);
      groups.push({ exerciseId: it.exerciseId, sets: it.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg })) });
    }
  }
  const s = await db.sessions.get(id);
  await saveSessionEdits(id, { ...meta, name: s!.name }, groups);
  return id;
}
