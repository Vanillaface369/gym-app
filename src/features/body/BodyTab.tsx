import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Exercise } from '../../db/types';
import { useExercises, useSettings } from '../../lib/hooks';
import { fmtWeight } from '../../lib/format';
import { allTimeBests, pickBenchmarks } from '../../lib/progress';
import { ExerciseThumb, Sheet } from '../../components/ui';
import { IconCheck, IconChevronRight, IconEdit } from '../../components/icons';
import { Sparkline } from '../progress/E1rmChart';
import { Recovery } from './Recovery';
import { StrengthSummary } from '../strength/StrengthSummary';
import { loadProgress, type ExerciseProgress } from '../progress/data';

export function BodyTab() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'recovery' ? 'recovery' : 'results';
  return (
    <div className="pt-safe px-4">
      <h1 className="pt-6 text-3xl font-bold tracking-tight">Body</h1>
      <div role="tablist" aria-label="Body" className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
        {(['results', 'recovery'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setParams(t === 'results' ? {} : { tab: t }, { replace: true })}
            className={`min-h-10 rounded-lg text-sm font-semibold capitalize ${tab === t ? 'bg-surface-2 text-ink' : 'text-muted'}`}>{t}</button>
        ))}
      </div>
      {tab === 'results' ? <Results /> : <Recovery />}
    </div>
  );
}

function Results() {
  const settings = useSettings();
  const { list, map } = useExercises();
  const [editing, setEditing] = useState(false);
  const benchmarks = pickBenchmarks(list, settings.benchmarkIds);
  const ids = benchmarks.map((b) => b.id);
  const progress = useLiveQuery(async () => {
    const all = await Promise.all(ids.map(loadProgress));
    return new Map(ids.map((id, i) => [id, all[i]]));
  }, [ids.join(',')]);

  return (
    <>
      <StrengthSummary />

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Benchmark lifts</h2>
          <button onClick={() => setEditing(true)} className="-mr-3 flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink active:bg-surface">
            <IconEdit size={16} />Edit
          </button>
        </div>
        {!benchmarks.length && <p className="mt-2 rounded-2xl bg-surface p-4 text-sm text-muted">No benchmark lifts. Tap Edit to pick some.</p>}
        <ul className="mt-2 space-y-2">
          {benchmarks.map((ex) => <BenchmarkCard key={ex.id} ex={ex} progress={progress?.get(ex.id)} units={settings.units} />)}
        </ul>
        <p className="mt-2 text-xs text-muted">
          {settings.benchmarkIds ? 'Your pinned lifts.' : 'Showing your most-used exercises.'} Estimated 1RM, all-time best.
        </p>
      </section>

      <BenchmarkEditor open={editing} onClose={() => setEditing(false)} exercises={list} current={ids} pinned={!!settings.benchmarkIds} names={map} />
    </>
  );
}

function BenchmarkCard({ ex, progress, units }: { ex: Exercise; progress?: ExerciseProgress; units: 'kg' | 'lb' }) {
  const pts = progress?.points ?? [];
  const best = progress && allTimeBests(pts, progress.seededE1rm).e1rm;
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const delta = last && prev ? last.e1rm - prev.e1rm : 0;
  return (
    <li>
      <Link to={`/exercise/${ex.id}`} className="flex items-center gap-3 rounded-2xl bg-surface p-3 active:bg-surface-2">
        <ExerciseThumb ex={ex} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{ex.name}</p>
          {/* Name gets the full width above; value and sparkline share the row below. */}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="tabular text-xl font-bold">{best ? fmtWeight(best.value, units) : '–'}</p>
              <p className="truncate text-xs text-muted">
                {best?.fromFitbod && 'From Fitbod'}
                {!best?.fromFitbod && last && best && Math.abs(last.e1rm - best.value) < 0.05 && 'New best last session'}
                {!best?.fromFitbod && last && !(best && Math.abs(last.e1rm - best.value) < 0.05) && <>Last {fmtWeight(last.e1rm, units)}{prev && Math.abs(delta) > 0.05 && <span className={delta > 0 ? 'text-accent' : ''}> ({delta > 0 ? '▲' : '▼'} {fmtWeight(Math.abs(delta), units)})</span>}</>}
                {!best && 'No sessions yet'}
              </p>
            </div>
            <Sparkline values={pts.slice(-8).map((p) => p.e1rm)} />
          </div>
        </div>
        <IconChevronRight size={18} className="shrink-0 text-muted" />
      </Link>
    </li>
  );
}

function BenchmarkEditor({ open, onClose, exercises, current, pinned, names }: {
  open: boolean; onClose: () => void; exercises: Exercise[]; current: string[]; pinned: boolean; names: Map<string, Exercise>;
}) {
  const [sel, setSel] = useState<string[]>(current);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) { setWasOpen(open); if (open) setSel(current); }
  const options = exercises.filter((e) => !e.archived).sort((a, b) => b.useCount - a.useCount || a.name.localeCompare(b.name));
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const save = async (ids: string[] | undefined) => {
    await db.settings.update('settings', { benchmarkIds: ids });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Benchmark lifts" tall>
      <p className="text-sm text-muted">{sel.length} selected: {sel.map((id) => names.get(id)?.name).filter(Boolean).join(', ') || 'none'}</p>
      <ul className="mt-3 divide-y divide-line">
        {options.map((ex) => {
          const on = sel.includes(ex.id);
          return (
            <li key={ex.id}>
              <button role="checkbox" aria-checked={on} onClick={() => toggle(ex.id)} className="flex w-full items-center gap-3 py-2.5 text-left">
                <ExerciseThumb ex={ex} size={36} />
                <span className="flex-1 truncate">{ex.name}</span>
                <span className={`flex h-6 w-6 items-center justify-center rounded-md ${on ? 'bg-accent text-accent-ink' : 'ring-1 ring-line'}`}>{on && <IconCheck size={16} />}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 -mx-5 mt-3 flex gap-2 bg-surface px-5 pt-3">
        {pinned && <button onClick={() => save(undefined)} className="rounded-2xl bg-surface-2 px-4 py-3.5 text-sm font-semibold">Use most used</button>}
        <button onClick={() => save(sel)} className="flex-1 rounded-2xl bg-accent py-3.5 font-bold text-accent-ink">Save</button>
      </div>
    </Sheet>
  );
}
