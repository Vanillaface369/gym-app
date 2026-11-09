import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { deleteSession } from '../../db/actions';
import type { PersonalRecord, SetLog } from '../../db/types';
import { useExercises, useSettings } from '../../lib/hooks';
import { fmtBigWeight, fmtDate, fmtDuration, fmtTime, fmtWeight } from '../../lib/format';
import { Confirm, ExerciseThumb, PageHeader } from '../../components/ui';
import { IconChevronLeft, IconFlame, IconTrash, IconTrophy, IconWeight } from '../../components/icons';

export function SummaryPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const isNew = params.get('new') === '1';
  const nav = useNavigate();
  const settings = useSettings();
  const { map } = useExercises();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const data = useLiveQuery(async () => {
    const session = await db.sessions.get(id);
    if (!session) return null;
    const sets = await db.sets.where('sessionId').equals(id).toArray();
    const records = (await db.records.where('exerciseId').anyOf(session.exerciseOrder).toArray())
      .filter((r) => r.sessionId === id && r.previous !== undefined);
    return { session, sets, records };
  }, [id]);

  if (data === undefined) return null;
  if (data === null) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted">That workout doesn't exist any more.</p>
        <Link to="/" className="mt-4 inline-block text-accent">Back to Workout</Link>
      </div>
    );
  }
  const { session, sets, records } = data;
  const u = settings.units;
  const byExercise = new Map<string, SetLog[]>();
  for (const s of [...sets].sort((a, b) => a.setIndex - b.setIndex)) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);
  const recsByExercise = new Map<string, PersonalRecord[]>();
  for (const r of records) recsByExercise.set(r.exerciseId, [...(recsByExercise.get(r.exerciseId) ?? []), r]);

  return (
    <div className="pb-32">
      <PageHeader
        left={isNew ? undefined : <button aria-label="Back" onClick={() => nav(-1)} className="-ml-2 rounded-full p-2 active:bg-surface-2"><IconChevronLeft /></button>}
        title={isNew ? 'Workout complete' : 'Workout'}
        right={<button aria-label="Delete workout" onClick={() => setConfirmDelete(true)} className="-mr-2 rounded-full p-2 text-muted active:bg-surface-2"><IconTrash size={20} /></button>}
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

        <ul className="mt-6 space-y-3">
          {session.exerciseOrder.map((exId) => {
            const ex = map.get(exId);
            const ss = byExercise.get(exId) ?? [];
            const recs = recsByExercise.get(exId) ?? [];
            const weightPr = recs.find((r) => r.type === 'weight');
            const e1rmPr = recs.find((r) => r.type === 'e1rm');
            return (
              <li key={exId} className="rounded-2xl bg-surface p-4">
                <div className="flex items-center gap-3">
                  <ExerciseThumb ex={ex} size={40} />
                  <p className="flex-1 font-semibold">{ex?.name ?? 'Unknown exercise'}</p>
                  {recs.length > 0 && <IconTrophy size={18} className="text-accent" aria-label="New record" />}
                </div>
                <ol className="tabular mt-3 space-y-1 text-sm">
                  {ss.map((s, i) => (
                    <li key={s.id} className="flex justify-between text-muted">
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
        <p className="mt-4 text-center text-xs text-muted">Editing a finished workout comes with the Log tab stage.</p>
      </div>

      {isNew && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6 pb-4">
          <button onClick={() => nav('/', { replace: true })} className="w-full rounded-2xl bg-accent py-4 text-lg font-bold text-accent-ink">Done</button>
        </div>
      )}

      <Confirm open={confirmDelete} title="Delete this workout?" body="Its sets and any records it set will be removed. This can't be undone." confirmLabel="Delete" danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => { await deleteSession(session.id); nav('/', { replace: true }); }} />
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

function PrBox({ label, value, prev, units }: { label: string; value: string; prev?: number; units: 'kg' | 'lb' }) {
  return (
    <div className="rounded-xl bg-accent/10 p-2.5 ring-1 ring-accent/40">
      <p className="text-xs font-semibold text-accent">{label}</p>
      <p className="tabular font-bold">{value}</p>
      {prev !== undefined && <p className="text-xs text-muted">was {fmtWeight(prev, units)}</p>}
    </div>
  );
}
