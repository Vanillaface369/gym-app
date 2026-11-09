import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { deleteSession, saveSessionEdits, type EditGroup } from '../../db/actions';
import type { PersonalRecord, SetLog, Units, WorkoutSession } from '../../db/types';
import { useExercises, useSettings } from '../../lib/hooks';
import { fmtBigWeight, fmtDate, fmtDuration, fmtTime, fmtWeight, fromDisplay, toDisplay } from '../../lib/format';
import { Confirm, ExerciseThumb, NumberField, PageHeader } from '../../components/ui';
import { ExercisePicker } from '../../components/ExercisePicker';
import { IconChevronLeft, IconChevronRight, IconDown, IconEdit, IconFlame, IconPlus, IconTrash, IconTrophy, IconUp, IconWeight, IconX } from '../../components/icons';

export function SummaryPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const isNew = params.get('new') === '1';
  const editing = params.get('edit') === '1';
  const nav = useNavigate();
  const settings = useSettings();
  const { map } = useExercises();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const data = useLiveQuery(async () => {
    const session = await db.sessions.get(id);
    if (!session) return null;
    const sets = await db.sets.where('sessionId').equals(id).toArray();
    const records = session.exerciseOrder.length
      ? (await db.records.where('exerciseId').anyOf(session.exerciseOrder).toArray()).filter((r) => r.sessionId === id && r.previous !== undefined)
      : [];
    return { session, sets, records };
  }, [id]);

  if (data === undefined) return null;
  if (data === null) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted">That workout doesn't exist any more.</p>
        <Link to="/log" className="mt-4 inline-block text-accent">Back to Log</Link>
      </div>
    );
  }
  const { session, sets, records } = data;
  const u = settings.units;
  const byExercise = groupSets(session, sets);
  const setEditing = (on: boolean) => setParams(on ? { edit: '1' } : {}, { replace: true });

  if (editing) {
    // Cancelling an empty workout (e.g. a blank past workout just created with +) removes it rather than leaving an empty entry.
    const onCancel = async () => {
      if (!byExercise.length) { await deleteSession(session.id); nav('/log', { replace: true }); }
      else setEditing(false);
    };
    return <EditSession key={session.id} session={session} groups={byExercise} units={u} onDone={() => setEditing(false)} onCancel={onCancel} />;
  }

  const recsByExercise = new Map<string, PersonalRecord[]>();
  for (const r of records) recsByExercise.set(r.exerciseId, [...(recsByExercise.get(r.exerciseId) ?? []), r]);

  return (
    <div className="pb-32">
      <PageHeader
        left={isNew ? undefined : <button aria-label="Back" onClick={() => nav(-1)} className="-ml-2 rounded-full p-2 active:bg-surface-2"><IconChevronLeft /></button>}
        title={isNew ? 'Workout complete' : 'Workout'}
        right={
          <div className="-mr-2 flex">
            <button aria-label="Edit workout" onClick={() => setEditing(true)} className="rounded-full p-2 text-muted active:bg-surface-2"><IconEdit size={20} /></button>
            <button aria-label="Delete workout" onClick={() => setConfirmDelete(true)} className="rounded-full p-2 text-muted active:bg-surface-2"><IconTrash size={20} /></button>
          </div>
        }
      />
      <div className="px-4">
        {isNew && <p className="text-sm font-semibold text-accent">Nice work 💪</p>}
        <h1 className="text-3xl font-bold tracking-tight">{session.name}</h1>
        <p className="mt-1 text-sm text-muted">{fmtDate(session.startedAt)} · {fmtTime(session.startedAt)} · {fmtDuration(session.durationSec)}</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat icon={<IconFlame size={18} />} label="Calories" value={`${session.caloriesEst}`} />
          <Stat icon={<IconWeight size={18} />} label="Volume" value={fmtBigWeight(session.volumeKg, u)} />
          <Stat icon={<IconTrophy size={18} />} label="Records" value={`${session.recordsCount}`} highlight={session.recordsCount > 0} />
        </div>

        {!byExercise.length && (
          <button onClick={() => setEditing(true)} className="mt-6 w-full rounded-2xl border border-dashed border-line p-5 text-muted">No exercises yet. Tap to add some.</button>
        )}
        <ul className="mt-6 space-y-3">
          {byExercise.map(({ exerciseId, sets: ss }) => {
            const ex = map.get(exerciseId);
            const recs = recsByExercise.get(exerciseId) ?? [];
            const weightPr = recs.find((r) => r.type === 'weight');
            const e1rmPr = recs.find((r) => r.type === 'e1rm');
            return (
              <li key={exerciseId} className="rounded-2xl bg-surface p-4">
                <div className="flex items-center gap-3">
                  <Link to={`/exercise/${exerciseId}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <ExerciseThumb ex={ex} size={40} />
                    <p className="flex-1 truncate font-semibold">{ex?.name ?? 'Unknown exercise'}</p>
                    <IconChevronRight size={18} className="shrink-0 text-muted" />
                  </Link>
                  {recs.length > 0 && <IconTrophy size={18} className="text-accent" aria-label="New record" />}
                </div>
                <ol className="tabular mt-3 space-y-1 text-sm">
                  {ss.map((s, i) => (
                    <li key={i} className="flex justify-between text-muted">
                      <span>Set {i + 1}</span>
                      <span className="text-ink">{s.reps} reps × {fmtWeight(s.weightKg, u)}</span>
                    </li>
                  ))}
                </ol>
                {(weightPr || e1rmPr) && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {weightPr && <PrBox label="Weight PR" value={fmtWeight(weightPr.value, u)} prev={weightPr.previous} units={u} />}
                    {e1rmPr && <PrBox label="Est. 1RM PR" value={fmtWeight(e1rmPr.value, u)} prev={e1rmPr.previous} units={u} />}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {isNew && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6 pb-4">
          <button onClick={() => nav('/', { replace: true })} className="w-full rounded-2xl bg-accent py-4 text-lg font-bold text-accent-ink">Done</button>
        </div>
      )}

      <Confirm open={confirmDelete} title="Delete this workout?" body="Its sets and any records it set will be removed. This can't be undone." confirmLabel="Delete" danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => { await deleteSession(session.id); nav('/log', { replace: true }); }} />
    </div>
  );
}

function groupSets(session: WorkoutSession, sets: SetLog[]): EditGroup[] {
  const by = new Map<string, SetLog[]>();
  for (const s of [...sets].sort((a, b) => a.setIndex - b.setIndex)) by.set(s.exerciseId, [...(by.get(s.exerciseId) ?? []), s]);
  const order = [...session.exerciseOrder, ...[...by.keys()].filter((k) => !session.exerciseOrder.includes(k))];
  return order.filter((id) => by.has(id)).map((exerciseId) => ({
    exerciseId, sets: by.get(exerciseId)!.map((s) => ({ reps: s.reps, weightKg: s.weightKg })),
  }));
}

const pad = (n: number) => String(n).padStart(2, '0');

function EditSession({ session, groups: initial, units, onDone, onCancel }: { session: WorkoutSession; groups: EditGroup[]; units: Units; onDone: () => void; onCancel: () => void }) {
  const { map } = useExercises();
  const start = new Date(session.startedAt);
  const [name, setName] = useState(session.name);
  const [date, setDate] = useState(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
  const [time, setTime] = useState(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
  const [minutes, setMinutes] = useState(String(Math.max(1, Math.round(session.durationSec / 60))));
  const [groups, setGroups] = useState<EditGroup[]>(structuredClone(initial));
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const mutate = (fn: (g: EditGroup[]) => void) => setGroups((prev) => { const next = structuredClone(prev); fn(next); return next; });

  const save = async () => {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const startedAt = new Date(y, m - 1, d, hh || 0, mm || 0).getTime();
    const mins = parseInt(minutes, 10);
    if (!y || !Number.isFinite(startedAt)) return setError('Pick a date.');
    if (!(mins > 0 && mins < 600)) return setError('Duration should be between 1 and 600 minutes.');
    setSaving(true);
    await saveSessionEdits(session.id, { name, startedAt, durationSec: mins * 60 }, groups);
    setSaving(false);
    onDone();
  };

  const field = 'mt-1 w-full rounded-xl bg-surface-2 px-3 py-2.5 text-ink outline-none focus:ring-2 focus:ring-accent';
  return (
    <div className="pb-32">
      <PageHeader
        left={<button aria-label="Cancel editing" onClick={onCancel} className="-ml-2 rounded-full p-2 text-muted active:bg-surface-2"><IconX /></button>}
        title="Edit workout"
      />
      <div className="space-y-3 px-4">
        <label className="block text-sm text-muted">Name<input value={name} onChange={(e) => setName(e.target.value)} className={field} /></label>
        <div className="grid grid-cols-[1.5fr_1.1fr_0.8fr] gap-2">
          <label className="text-sm text-muted">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} px-2 text-sm`} /></label>
          <label className="text-sm text-muted">Start<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${field} px-2 text-sm`} /></label>
          <label className="text-sm text-muted">Minutes<input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} className={field} /></label>
        </div>

        <ul className="space-y-3 pt-2">
          {groups.map((g, gi) => {
            const ex = map.get(g.exerciseId);
            return (
              <li key={`${g.exerciseId}-${gi}`} className="rounded-2xl bg-surface p-3">
                <div className="flex items-center gap-2">
                  <ExerciseThumb ex={ex} size={36} />
                  <p className="flex-1 truncate font-semibold">{ex?.name ?? 'Unknown exercise'}</p>
                  <button aria-label="Move up" disabled={gi === 0} onClick={() => mutate((n) => { [n[gi - 1], n[gi]] = [n[gi], n[gi - 1]]; })} className="rounded-full p-1.5 text-muted disabled:opacity-30"><IconUp size={18} /></button>
                  <button aria-label="Move down" disabled={gi === groups.length - 1} onClick={() => mutate((n) => { [n[gi + 1], n[gi]] = [n[gi], n[gi + 1]]; })} className="rounded-full p-1.5 text-muted disabled:opacity-30"><IconDown size={18} /></button>
                  <button aria-label={`Remove ${ex?.name}`} onClick={() => mutate((n) => { n.splice(gi, 1); })} className="rounded-full p-1.5 text-danger"><IconTrash size={18} /></button>
                </div>
                <div className="mt-2 grid grid-cols-[2rem_1fr_1fr_2.25rem] items-center gap-2">
                  <span />
                  <span className="text-center text-[11px] font-semibold tracking-wider text-muted uppercase">Reps</span>
                  <span className="text-center text-[11px] font-semibold tracking-wider text-muted uppercase">{units}</span>
                  <span />
                  {g.sets.map((s, si) => (
                    <div key={si} className="contents">
                      <span className="text-center text-sm font-semibold text-muted">{si + 1}</span>
                      <NumberField ariaLabel={`${ex?.name} set ${si + 1} reps`} value={s.reps} onChange={(v) => mutate((n) => { n[gi].sets[si].reps = Math.round(v); })} />
                      <NumberField ariaLabel={`${ex?.name} set ${si + 1} weight`} step={0.5} value={toDisplay(s.weightKg, units)} onChange={(v) => mutate((n) => { n[gi].sets[si].weightKg = fromDisplay(v, units); })} />
                      <button aria-label={`Remove set ${si + 1}`} onClick={() => mutate((n) => { n[gi].sets.splice(si, 1); if (!n[gi].sets.length) n.splice(gi, 1); })} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted active:bg-surface-2"><IconX size={18} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => mutate((n) => { const last = n[gi].sets.at(-1); n[gi].sets.push({ reps: last?.reps ?? 10, weightKg: last?.weightKg ?? 0 }); })}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm text-muted active:bg-surface-2"><IconPlus size={16} />Add set</button>
              </li>
            );
          })}
        </ul>
        <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm font-medium text-muted active:bg-surface-2">
          <IconPlus size={18} />Add exercise
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
        <p className="text-xs text-muted">Sets with 0 reps are dropped. Records, volume and calories are recalculated when you save.</p>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-lg gap-3 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6 pb-4">
        <button onClick={onCancel} className="rounded-2xl bg-surface-2 px-6 py-4 font-semibold">Cancel</button>
        <button disabled={saving} onClick={save} className="flex-1 rounded-2xl bg-accent py-4 text-lg font-bold text-accent-ink disabled:opacity-50">Save</button>
      </div>

      <ExercisePicker open={adding} title="Add exercise" onClose={() => setAdding(false)} excludeIds={groups.map((g) => g.exerciseId)}
        onPick={(ex) => { mutate((n) => { n.push({ exerciseId: ex.id, sets: [{ reps: 10, weightKg: 0 }, { reps: 10, weightKg: 0 }, { reps: 10, weightKg: 0 }] }); }); setAdding(false); }} />
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <div className={`flex items-center gap-1.5 text-xs ${highlight ? 'text-accent' : 'text-muted'}`}>{icon}{label}</div>
      <p className={`tabular mt-1 truncate text-lg font-bold ${highlight ? 'text-accent' : ''}`}>{value}</p>
    </div>
  );
}

function PrBox({ label, value, prev, units }: { label: string; value: string; prev?: number; units: Units }) {
  return (
    <div className="rounded-xl bg-accent/10 p-2.5 ring-1 ring-accent/40">
      <p className="text-xs font-semibold text-accent">{label}</p>
      <p className="tabular font-bold">{value}</p>
      {prev !== undefined && <p className="text-xs text-muted">was {fmtWeight(prev, units)}</p>}
    </div>
  );
}
