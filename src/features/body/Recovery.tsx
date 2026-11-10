import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { MUSCLES, type Muscle } from '../../db/types';
import { useExercises, useNow } from '../../lib/hooks';
import { fmtShortDate, MUSCLE_LABEL, timeAgo } from '../../lib/format';

const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
import { FRESH, muscleRecovery, sessionDoses, type MuscleRecovery, type TrainedSession } from '../../lib/recovery';
import { fmtSets } from '../../lib/targets';
import { Sheet } from '../../components/ui';
import { IconChevronRight, IconRotate } from '../../components/icons';
import { BodyMap } from './BodyMap';

/**
 * Recovery colour fades red (0%) -> amber (50%) -> lime (fresh, 90%+), mixed in OKLab so the in-between shades stay bright.
 */
function recoveryColour(pct: number): string {
  if (pct >= FRESH) return 'var(--color-accent)';
  if (pct <= 50) return `color-mix(in oklab, var(--color-warn) ${Math.round((Math.max(0, pct) / 50) * 100)}%, var(--color-danger))`;
  return `color-mix(in oklab, var(--color-accent) ${Math.round(((pct - 50) / (FRESH - 50)) * 100)}%, var(--color-warn))`;
}
const GRADIENT = `linear-gradient(in oklab to right, var(--color-danger), var(--color-warn) ${50}%, var(--color-accent) ${FRESH}%)`;
const LOOKBACK_DAYS = 14;

function fmtHours(h: number): string {
  if (h < 1) return 'under an hour';
  if (h < 24) return `${Math.round(h)} h`;
  const d = Math.floor(h / 24), r = Math.round(h - d * 24);
  return `${d} day${d > 1 ? 's' : ''}${r ? ` ${r} h` : ''}`;
}

export function Recovery() {
  const { map, loading } = useExercises();
  const now = useNow(60_000);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [selected, setSelected] = useState<Muscle | null>(null);

  const data = useLiveQuery(async () => {
    const since = Date.now() - LOOKBACK_DAYS * 86_400_000;
    const [sessions, last, overrides] = await Promise.all([
      db.sessions.where('startedAt').aboveOrEqual(since).toArray(),
      db.sessions.orderBy('startedAt').last(),
      db.recoveryOverrides.toArray(),
    ]);
    const sets = sessions.length ? await db.sets.where('sessionId').anyOf(sessions.map((s) => s.id)).toArray() : [];
    return { sessions, sets, last, overrides };
  }, []);

  if (!data || loading) return null;

  const setsBy = new Map<string, typeof data.sets>();
  for (const s of data.sets) setsBy.set(s.sessionId, [...(setsBy.get(s.sessionId) ?? []), s]);
  const trained: TrainedSession[] = data.sessions
    .map((s) => ({ id: s.id, name: s.name, endedAt: s.endedAt, doses: sessionDoses(setsBy.get(s.id) ?? [], map) }))
    .sort((a, b) => b.endedAt - a.endedAt);
  const overrides = new Map(data.overrides.map((o) => [o.muscle, o]));
  const recs = new Map<Muscle, MuscleRecovery>(MUSCLES.map((m) => [m, muscleRecovery(m, trained, overrides.get(m), now)]));
  const fresh = [...recs.values()].filter((r) => r.percent >= FRESH).length;
  const colour = (m: Muscle) => recoveryColour(recs.get(m)!.percent);
  const pick = (ms: Muscle[]) => ms.reduce((a, b) => (recs.get(b)!.percent < recs.get(a)!.percent ? b : a));
  const list = [...recs.values()].sort((a, b) => a.percent - b.percent || MUSCLE_LABEL[a.muscle].localeCompare(MUSCLE_LABEL[b.muscle]));

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-surface p-3">
          <p className="text-xs text-muted">Last workout</p>
          <p className="mt-1 text-lg font-bold">{data.last ? capitalise(timeAgo(data.last.endedAt, now)) : 'None yet'}</p>
        </div>
        <div className="rounded-2xl bg-surface p-3">
          <p className="text-xs text-muted">Fresh muscles</p>
          <p className="tabular mt-1 text-lg font-bold">{fresh}<span className="text-muted"> / {MUSCLES.length}</span></p>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="mx-auto h-[min(28rem,54vh)] aspect-[558/1161]">
          <BodyMap side={side} colour={colour} pick={pick} selected={selected} onSelect={setSelected} />
        </div>
        <button onClick={() => setSide(side === 'front' ? 'back' : 'front')} aria-label={`Show ${side === 'front' ? 'back' : 'front'}`}
          className="absolute bottom-1 left-0 flex h-12 w-12 items-center justify-center rounded-full bg-surface active:scale-95">
          <IconRotate size={22} />
        </button>
        <p className="absolute right-0 bottom-3 text-xs font-semibold tracking-wider text-muted uppercase">{side}</p>
      </div>
      <div>
        <div className="mx-auto mt-3 max-w-60">
          <div className="h-2 rounded-full" style={{ background: GRADIENT }} />
          <div className="mt-1 flex justify-between text-xs text-muted"><span>0%</span><span>50%</span><span>Fresh 90%+</span></div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Muscles</h2>
        <ul className="mt-2 divide-y divide-line rounded-2xl bg-surface">
          {list.map((r) => (
            <li key={r.muscle}>
              <button onClick={() => setSelected(r.muscle)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2">
                <span className="w-28 shrink-0 truncate">{MUSCLE_LABEL[r.muscle]}{r.overridden && <span className="text-muted"> *</span>}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full" style={{ width: `${r.percent}%`, background: recoveryColour(r.percent) }} />
                </span>
                <span className="tabular w-11 text-right text-sm font-semibold">{r.percent}%</span>
              </button>
            </li>
          ))}
        </ul>
        {list.some((r) => r.overridden) && <p className="mt-2 text-xs text-muted">* Set by hand.</p>}
      </section>

      <MuscleSheet rec={selected ? recs.get(selected)! : null} sessions={trained} onClose={() => setSelected(null)} now={now} />
    </>
  );
}

function MuscleSheet({ rec, sessions, onClose, now }: { rec: MuscleRecovery | null; sessions: TrainedSession[]; onClose: () => void; now: number }) {
  const [value, setValue] = useState(100);
  const [shownFor, setShownFor] = useState<Muscle | null>(null);
  // The set button only takes over once the slider has been moved: most visits are just to look.
  const [touched, setTouched] = useState(false);
  const m = rec?.muscle ?? null;
  if (m !== shownFor) { setShownFor(m); setTouched(false); if (rec) setValue(Math.round(rec.percent / 5) * 5); }
  if (!rec) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const hits = sessions.filter((s) => s.doses[rec.muscle]).slice(0, 5);
  const save = async () => {
    await db.recoveryOverrides.put({ muscle: rec.muscle, percent: value, setAt: Date.now() });
    onClose();
  };
  const reset = async () => {
    await db.recoveryOverrides.delete(rec.muscle);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={MUSCLE_LABEL[rec.muscle]}>
      <div className="flex items-baseline gap-3">
        <span className="tabular text-5xl font-bold" style={{ color: recoveryColour(rec.percent) }}>{rec.percent}%</span>
        <span className="text-sm text-muted">recovered</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {rec.percent >= 100 ? 'Fully recovered.' : `Fully recovered in about ${fmtHours(rec.hoursToFull)}.`}
        {rec.overridden && ' Set by hand; it keeps recovering from there until you next train it.'}
      </p>

      <h3 className="mt-5 text-sm font-semibold">Recent workouts</h3>
      {!hits.length && <p className="mt-1 text-sm text-muted">Not trained in the last {LOOKBACK_DAYS} days.</p>}
      <ul className="mt-1 divide-y divide-line">
        {hits.map((s) => (
          <li key={s.id}>
            <Link to={`/session/${s.id}`} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate">{s.name}</p>
                <p className="text-xs text-muted">{fmtShortDate(s.endedAt)} · {timeAgo(s.endedAt, now)}</p>
              </div>
              <span className="tabular text-sm text-muted">{fmtSets(s.doses[rec.muscle]!)} sets</span>
              <IconChevronRight size={16} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <h3 className="mt-5 text-sm font-semibold">Set recovery by hand</h3>
      <div className="mt-2 flex items-center gap-3">
        <input type="range" min={0} max={100} step={5} value={value} onChange={(e) => { setValue(Number(e.target.value)); setTouched(true); }}
          aria-label={`${MUSCLE_LABEL[rec.muscle]} recovery percent`} className="flex-1 accent-[var(--color-accent)]" />
        <span className="tabular w-12 text-right font-semibold">{value}%</span>
      </div>
      <div className="mt-4 flex gap-2">
        {rec.overridden && <button onClick={reset} className="min-h-12 rounded-2xl bg-surface-2 px-4 text-sm font-semibold">Use calculated</button>}
        <button onClick={save} disabled={!touched}
          className={`min-h-12 flex-1 rounded-2xl font-bold ${touched ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}>{touched ? `Set to ${value}%` : 'Move the slider to change it'}</button>
      </div>
    </Sheet>
  );
}
