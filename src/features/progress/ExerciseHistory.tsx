import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Units } from '../../db/types';
import { useExercises, useSettings } from '../../lib/hooks';
import { fmtBigWeight, fmtShortDate, fmtWeight, MUSCLE_LABEL, toDisplay } from '../../lib/format';
import { allTimeBests, chartPoints, isMonthly, RANGES, rangeStart, summarise, type Range, type SessionPoint } from '../../lib/progress';
import { ExerciseThumb, PageHeader } from '../../components/ui';
import { IconChevronLeft, IconChevronRight, IconTrophy } from '../../components/icons';
import { E1rmChart } from './E1rmChart';
import { useProgress } from './data';

const fmtDay = (ts: number, withYear = false) =>
  new Date(ts).toLocaleDateString('en-AU', withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });

/** Shortest range that has at least two points, so the first view shows a line rather than a dot. */
function autoRange(points: SessionPoint[], now: number): Range {
  for (const r of RANGES) if (chartPoints(points, r.id, now).length >= 2) return r.id;
  return 'year';
}

export function ExerciseHistoryPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const settings = useSettings();
  const { map } = useExercises();
  const progress = useProgress(id);
  const [picked, setPicked] = useState<Range | null>(null);
  // Opening another exercise starts again on its own best range.
  const [pickedFor, setPickedFor] = useState(id);
  if (pickedFor !== id) { setPickedFor(id); setPicked(null); }
  const [showAll, setShowAll] = useState(false);
  const [now] = useState(() => Date.now());

  const ex = map.get(id);
  const u = settings.units;
  const header = (
    <PageHeader
      left={<button aria-label="Back" onClick={() => nav(-1)} className="tap -ml-3 rounded-full p-2 active:bg-surface-2"><IconChevronLeft /></button>}
      title="History"
    />
  );
  if (!progress) return header;

  const { points, seededE1rm } = progress;
  const range = picked ?? autoRange(points, now);
  const from = rangeStart(range, now);
  const chart = chartPoints(points, range, now);
  const sum = summarise(chart);
  const bests = allTimeBests(points, seededE1rm);
  const sessions = [...points].reverse();
  const shown = showAll ? sessions : sessions.slice(0, 10);

  return (
    <div className="pb-16">
      {header}
      <div className="px-4">
        <div className="flex items-center gap-3">
          <ExerciseThumb ex={ex} size={44} />
          <div className="min-w-0">
            <h1 className="truncate text-2xl leading-tight font-bold">{ex?.name ?? 'Exercise'}</h1>
            {ex && <p className="truncate text-sm text-muted">{ex.primaryMuscles.map((m) => MUSCLE_LABEL[m]).join(', ')}</p>}
          </div>
        </div>

        <div role="tablist" aria-label="Range" className="mt-5 grid grid-cols-4 gap-1 rounded-xl bg-surface p-1">
          {RANGES.map((r) => (
            <button key={r.id} role="tab" aria-selected={r.id === range} onClick={() => setPicked(r.id)}
              className={`min-h-10 rounded-lg text-sm font-semibold ${r.id === range ? 'bg-surface-2 text-ink' : 'text-muted'}`}>{r.label}</button>
          ))}
        </div>

        <div className="mt-5">
          <p className="text-sm text-muted">Estimated 1RM, latest</p>
          {sum ? (
            <p className="tabular mt-0.5 text-4xl leading-tight font-bold">
              {toDisplay(chart[chart.length - 1].e1rm, u)}<span className="text-xl font-semibold text-muted"> {u}</span>
            </p>
          ) : <p className="mt-0.5 text-4xl leading-tight font-bold text-muted">–</p>}
          <p className="tabular text-sm text-muted">
            {sum && sum.min !== sum.max && <>Range {toDisplay(sum.min, u)}–{toDisplay(sum.max, u)} {u} · </>}
            {fmtDay(from, new Date(from).getFullYear() !== new Date(now).getFullYear())} – {fmtDay(now, true)}{isMonthly(range) && ' · best per month'}
          </p>
        </div>

        <div className="mt-3 rounded-2xl bg-surface pt-2 pb-1">
          {chart.length ? (
            <E1rmChart points={chart} from={from} to={now} units={u} monthly={isMonthly(range)} />
          ) : (
            <p className="flex h-56 items-center justify-center px-6 text-center text-sm text-muted">
              {points.length ? 'No sessions in this range. Try a longer one.' : 'No sessions logged yet. Your chart starts after your first workout with this exercise.'}
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-surface p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-accent"><IconTrophy size={14} />Personal record</p>
            <p className="tabular mt-1 text-xl font-bold">{bests.e1rm ? fmtWeight(bests.e1rm.value, u) : '–'}</p>
            <p className="text-xs text-muted">{bests.e1rm ? (bests.e1rm.fromFitbod ? 'Est. 1RM · from Fitbod' : `Est. 1RM · ${fmtShortDate(bests.e1rm.date)}`) : 'Est. 1RM'}</p>
          </div>
          <div className="rounded-2xl bg-surface p-3">
            <p className="text-xs font-semibold text-muted">Average</p>
            <p className="tabular mt-1 text-xl font-bold">{sum ? fmtWeight(sum.avg, u) : '–'}</p>
            <p className="text-xs text-muted">Est. 1RM · this range</p>
          </div>
        </div>

        {points.length > 0 && <Records bests={bests} units={u} />}

        {sessions.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold">Past sessions</h2>
            <ul className="mt-2 divide-y divide-line rounded-2xl bg-surface">
              {shown.map((p) => (
                <li key={p.sessionId}>
                  <Link to={`/session/${p.sessionId}`} className="flex items-center gap-3 px-4 py-3 active:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted">{fmtShortDate(p.date)} · 1RM {fmtWeight(p.e1rm, u)}</p>
                      <p className="tabular mt-0.5 text-sm">{setsLine(p, u)}</p>
                    </div>
                    <IconChevronRight size={18} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
            {sessions.length > shown.length && (
              <button onClick={() => setShowAll(true)} className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-ink active:bg-surface">
                Show all {sessions.length} sessions
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/** "10, 10, 9 × 60 kg · 8 × 65 kg": consecutive sets at the same weight share one weight label. */
function setsLine(p: SessionPoint, u: Units): string {
  const out: { reps: number[]; w: number }[] = [];
  for (const s of p.sets) {
    const last = out[out.length - 1];
    if (last && last.w === s.weightKg) last.reps.push(s.reps);
    else out.push({ reps: [s.reps], w: s.weightKg });
  }
  return out.map((g) => `${g.reps.join(', ')} × ${fmtWeight(g.w, u)}`).join(' · ');
}

function Records({ bests, units: u }: { bests: ReturnType<typeof allTimeBests>; units: Units }) {
  const rows = bests.repsAtWeight.slice(0, 6);
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Records</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {bests.weight && <RecordBox label="Heaviest weight" value={fmtWeight(bests.weight.value, u)} date={bests.weight.date} />}
        {bests.volume && <RecordBox label="Best session volume" value={fmtBigWeight(bests.volume.value, u)} date={bests.volume.date} />}
      </div>
      {rows.length > 0 && (
        <div className="mt-2 rounded-2xl bg-surface p-4">
          <p className="text-xs font-semibold text-muted">Most reps at each weight</p>
          <ul className="tabular mt-2 space-y-1.5 text-sm">
            {rows.map((r) => (
              <li key={r.weightKg} className="flex justify-between">
                <span>{fmtWeight(r.weightKg, u)}</span>
                <span><span className="font-semibold">{r.reps} reps</span><span className="text-muted"> · {fmtShortDate(r.date)}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function RecordBox({ label, value, date }: { label: string; value: string; date: number }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="tabular mt-1 text-lg font-bold">{value}</p>
      <p className="text-xs text-muted">{fmtShortDate(date)}</p>
    </div>
  );
}
