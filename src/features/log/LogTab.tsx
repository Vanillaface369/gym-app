import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Category, Exercise, WorkoutSession } from '../../db/types';
import { useExercises, useSettings } from '../../lib/hooks';
import { fmtBigWeight, fmtDuration } from '../../lib/format';
import {
  addDays, dayKey, lifetimeTotals, longestStreak, MILESTONE_TIERS, milestoneLevel, monthGrid, startOfDay, startOfWeek, trainingDays, weekStreak, weekdayLabels,
} from '../../lib/stats';
import { ExerciseThumb, Sheet } from '../../components/ui';
import { IconChevronLeft, IconChevronRight, IconDown, IconFlame, IconPlus, IconTrophy, IconUp, IconWeight, IconX } from '../../components/icons';
import { ManualLogSheet } from './ManualLogSheet';

const COLLAPSE_KEY = 'log.calendarCollapsed';
const readCollapsed = () => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } };

export function LogTab() {
  const s = useSettings();
  const { map } = useExercises();
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), []);
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const nav = useNavigate();

  const list = sessions ?? [];
  const now = Date.now();
  const starts = list.map((w) => w.startedAt);
  const wk = startOfWeek(now, s.weekStart);
  const weekDays = trainingDays(starts, wk, addDays(wk, 7));
  const streak = weekStreak(starts, s.workoutsPerWeek, s.weekStart, now);
  const totals = lifetimeTotals(list, s.lifetimeOffset);
  const totalWorkouts = totals.workouts;
  const levels = milestoneLevel(totals.workouts, MILESTONE_TIERS.workouts).level
    + milestoneLevel(totals.volumeKg, MILESTONE_TIERS.volumeKg).level
    + milestoneLevel(totals.calories, MILESTONE_TIERS.calories).level;
  const best = longestStreak(starts, s.workoutsPerWeek, s.weekStart, now);

  const minutesByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of list) m.set(dayKey(w.startedAt), (m.get(dayKey(w.startedAt)) ?? 0) + Math.round(w.durationSec / 60));
    return m;
  }, [list]);

  const toggleCollapsed = () => {
    const v = !collapsed;
    setCollapsed(v);
    try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch { /* storage blocked */ }
  };

  const weeks = collapsed
    ? [Array.from({ length: 7 }, (_, i) => addDays(wk, i))]
    : monthGrid(month.y, month.m, s.weekStart);
  const monthLabel = new Date(month.y, month.m, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  const shift = (n: number) => setMonth(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const today = startOfDay(now);

  const shown = selectedDay ? list.filter((w) => dayKey(w.startedAt) === selectedDay) : list;

  return (
    <div className="pt-safe px-4">
      <header className="flex h-14 items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Log</h1>
        <button aria-label="Log a past workout" onClick={() => setManualOpen(true)} className="tap -mr-3 rounded-full p-2 text-accent active:bg-surface-2"><IconPlus size={26} /></button>
      </header>

      <div className="grid grid-cols-4 gap-2">
        <Stat label="Workouts" value={totalWorkouts.toLocaleString('en-AU')} />
        <Stat label="Milestones" value={`${levels}`} sub="levels" onClick={() => nav('/milestones')} />
        <Stat label="This week" value={`${weekDays}/${s.workoutsPerWeek}`} sub="days" accent={weekDays >= s.workoutsPerWeek} />
        <Stat label="Streak" value={`${streak}`} sub={streak === 1 ? 'week' : 'weeks'} accent={streak > 0} onClick={() => setStreakOpen(true)} />
      </div>

      <Sheet open={streakOpen} onClose={() => setStreakOpen(false)} title="Weekly streak">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-surface-2 p-3"><p className="text-xs text-muted">Current</p><p className={`tabular text-3xl font-bold ${streak > 0 ? 'text-accent' : ''}`}>{streak}</p><p className="text-xs text-muted">{streak === 1 ? 'week' : 'weeks'}</p></div>
          <div className="rounded-2xl bg-surface-2 p-3"><p className="text-xs text-muted">Longest</p><p className="tabular text-3xl font-bold">{best}</p><p className="text-xs text-muted">{best === 1 ? 'week' : 'weeks'}</p></div>
        </div>
        <p className="mt-4 text-sm font-semibold">This week: {weekDays} of {s.workoutsPerWeek} days</p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {Array.from({ length: s.workoutsPerWeek }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i < weekDays ? 'bg-accent' : 'bg-surface-2'}`} />)}
        </div>
        <p className="mt-2 text-sm text-muted">
          {weekDays >= s.workoutsPerWeek ? 'Goal met. This week counts toward your streak.'
            : `${s.workoutsPerWeek - weekDays} more training day${s.workoutsPerWeek - weekDays > 1 ? 's' : ''} ${streak > 0 ? 'to keep the streak going' : 'to start a streak'}.`}
        </p>
        <h3 className="mt-5 text-sm font-semibold">Last 8 weeks</h3>
        <ol className="mt-2 grid grid-cols-8 gap-1.5">
          {Array.from({ length: 8 }, (_, i) => {
            const w = addDays(wk, -7 * (7 - i));
            const days = trainingDays(starts, w, addDays(w, 7));
            const met = days >= s.workoutsPerWeek;
            return (
              <li key={w} className="text-center" aria-label={`Week of ${new Date(w).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}: ${days} days`}>
                <span className={`tabular flex h-9 items-center justify-center rounded-lg text-sm font-semibold ${met ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}>{days}</span>
                <span className="mt-0.5 block text-xs text-muted">{new Date(w).getDate()}/{new Date(w).getMonth() + 1}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm text-muted">A week counts when you train on {s.workoutsPerWeek} different days. <Link to="/plan" className="font-semibold text-ink underline decoration-line underline-offset-4">Change the goal in My Plan</Link></p>
      </Sheet>

      <section className="mt-5 rounded-2xl bg-surface p-3">
        <div className="flex items-center justify-between px-1 pb-2">
          {collapsed ? (
            <p className="font-semibold">This week</p>
          ) : (
            <div className="flex items-center gap-1">
              <button aria-label="Previous month" onClick={() => shift(-1)} className="tap rounded-full p-1.5 text-muted active:bg-surface-2"><IconChevronLeft size={18} /></button>
              <p className="w-36 text-center font-semibold">{monthLabel}</p>
              <button aria-label="Next month" onClick={() => shift(1)} className="tap rounded-full p-1.5 text-muted active:bg-surface-2"><IconChevronRight size={18} /></button>
            </div>
          )}
          <button onClick={toggleCollapsed} className="-mr-1 flex min-h-11 items-center gap-1 rounded-full px-3 text-sm text-muted active:bg-surface-2">
            {collapsed ? <>Month <IconDown size={16} /></> : <>Week <IconUp size={16} /></>}
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-muted">
          {weekdayLabels(s.weekStart).map((d, i) => <span key={i} className="py-1">{d}</span>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day) => {
              const key = dayKey(day);
              const mins = minutesByDay.get(key);
              const inMonth = collapsed || new Date(day).getMonth() === month.m;
              const isToday = day === today;
              const selected = selectedDay === key;
              return (
                <button key={key} disabled={!mins} onClick={() => setSelectedDay(selected ? null : key)}
                  className="flex h-14 flex-col items-center justify-start pt-1" aria-label={`${new Date(day).toLocaleDateString('en-AU')}${mins ? `, ${mins} minutes trained` : ''}`}>
                  <span className={`tabular flex h-8 w-8 items-center justify-center rounded-full text-sm
                    ${mins ? (selected ? 'bg-ink font-bold text-bg' : 'bg-accent font-bold text-accent-ink') : isToday ? 'ring-1 ring-accent' : ''}
                    ${!inMonth ? 'opacity-30' : ''}`}>{new Date(day).getDate()}</span>
                  {mins !== undefined && <span className={`tabular mt-0.5 text-xs text-muted ${inMonth ? '' : 'opacity-50'}`}>{mins}m</span>}
                </button>
              );
            })}
          </div>
        ))}
      </section>

      <div className="mt-6 mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {selectedDay ? new Date(shown[0]?.startedAt ?? now).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Past workouts'}
        </h2>
        {selectedDay && <button onClick={() => setSelectedDay(null)} className="-mr-2 flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink active:bg-surface-2"><IconX size={14} />Show all</button>}
      </div>

      {sessions !== undefined && !list.length && (
        <p className="rounded-2xl bg-surface p-5 text-sm text-muted">No workouts logged in this app yet. Finish one, or tap + to add a past workout.</p>
      )}
      <ul className="space-y-3">
        {shown.map((w) => <TimelineCard key={w.id} w={w} map={map} units={s.units} />)}
      </ul>

      <ManualLogSheet open={manualOpen} onClose={() => setManualOpen(false)} />
    </div>
  );
}

function Stat({ label, value, sub, accent, onClick }: { label: string; value: string; sub?: string; accent?: boolean; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`rounded-2xl bg-surface px-1.5 py-3 text-center ${onClick ? 'active:bg-surface-2' : ''}`}>
      <p className={`tabular text-xl leading-tight font-bold ${accent ? 'text-accent' : ''}`}>{value}</p>
      <p className="text-xs leading-tight text-muted">{sub ?? '\u00a0'}</p>
      <p className="mt-1 flex items-center justify-center text-xs leading-tight font-medium">{label}{onClick && <IconChevronRight size={12} className="text-muted" />}</p>
    </Tag>
  );
}

/** Dominant category of a workout, for its icon colour. */
function dominantCategory(w: WorkoutSession, map: Map<string, Exercise>): Category {
  if (w.splitDay === 'push' || w.splitDay === 'pull' || w.splitDay === 'legs') return w.splitDay;
  const counts = new Map<Category, number>();
  for (const id of w.exerciseOrder) { const c = map.get(id)?.category ?? 'other'; counts.set(c, (counts.get(c) ?? 0) + 1); }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other';
}

function TimelineCard({ w, map, units }: { w: WorkoutSession; map: Map<string, Exercise>; units: 'kg' | 'lb' }) {
  const cat = dominantCategory(w, map);
  const names = w.exerciseOrder.map((id) => map.get(id)?.name).filter(Boolean);
  return (
    <li>
      <Link to={`/session/${w.id}`} className="block rounded-2xl bg-surface p-4 active:opacity-80">
        <p className="text-xs text-muted">
          {new Date(w.startedAt).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtDuration(w.durationSec)}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <WorkoutThumb w={w} cat={cat} map={map} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{w.name}</p>
            <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
              <span>{w.exerciseOrder.length} exercises</span>
              <span className="flex items-center gap-1"><IconFlame size={14} />{w.caloriesEst}</span>
              <span className="flex items-center gap-1"><IconWeight size={14} />{fmtBigWeight(w.volumeKg, units)}</span>
              {w.recordsCount > 0 && <span className="flex items-center gap-1 text-accent"><IconTrophy size={14} />{w.recordsCount}</span>}
            </p>
          </div>
        </div>
        {names.length > 0 && <p className="mt-2 line-clamp-2 text-sm text-muted">{names.join(' · ')}</p>}
      </Link>
    </li>
  );
}

/** The same body-map thumbnail as exercises, lit with every main muscle the workout's dominant group trained. */
function WorkoutThumb({ w, cat, map }: { w: WorkoutSession; cat: Category; map: Map<string, Exercise> }) {
  const exs = w.exerciseOrder.map((id) => map.get(id)).filter((e): e is Exercise => !!e);
  const inCat = exs.filter((e) => e.category === cat);
  const primaryMuscles = [...new Set((inCat.length ? inCat : exs).flatMap((e) => e.primaryMuscles))];
  const stub: Exercise = {
    id: w.id, name: w.name, category: cat, primaryMuscles, secondaryMuscles: [], equipment: [], isBodyweight: false,
    defaultRestSec: 0, preference: 0, isCustom: false, archived: false, useCount: 0,
  };
  return <ExerciseThumb ex={stub} size={44} />;
}
