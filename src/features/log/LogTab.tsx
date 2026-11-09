import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Category, Exercise, WorkoutSession } from '../../db/types';
import { useExercises, useSettings } from '../../lib/hooks';
import { fmtBigWeight, fmtDuration } from '../../lib/format';
import {
  addDays, dayKey, MILESTONE_TIERS, milestoneLevel, monthGrid, startOfDay, startOfWeek, trainingDays, weekStreak, weekdayLabels,
} from '../../lib/stats';
import { CATEGORY_COLOUR } from '../../components/ui';
import { IconChevronLeft, IconChevronRight, IconDown, IconFlame, IconPlus, IconUp, IconWeight, IconX } from '../../components/icons';
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

  const list = sessions ?? [];
  const now = Date.now();
  const starts = list.map((w) => w.startedAt);
  const wk = startOfWeek(now, s.weekStart);
  const weekDays = trainingDays(starts, wk, addDays(wk, 7));
  const streak = weekStreak(starts, s.workoutsPerWeek, s.weekStart, now);
  const totalWorkouts = s.lifetimeOffset.workouts + list.length;
  const totalVolume = s.lifetimeOffset.volumeKg + list.reduce((t, w) => t + w.volumeKg, 0);
  const totalCalories = s.lifetimeOffset.calories + list.reduce((t, w) => t + w.caloriesEst, 0);
  const levels = milestoneLevel(totalWorkouts, MILESTONE_TIERS.workouts).level
    + milestoneLevel(totalVolume, MILESTONE_TIERS.volumeKg).level
    + milestoneLevel(totalCalories, MILESTONE_TIERS.calories).level;

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
        <button aria-label="Log a past workout" onClick={() => setManualOpen(true)} className="-mr-2 rounded-full p-2 text-accent active:bg-surface-2"><IconPlus size={26} /></button>
      </header>

      <div className="grid grid-cols-4 gap-2">
        <Stat label="Workouts" value={totalWorkouts.toLocaleString('en-AU')} />
        <Stat label="Milestones" value={`${levels}`} sub="levels" />
        <Stat label="This week" value={`${weekDays}/${s.workoutsPerWeek}`} sub="days" accent={weekDays >= s.workoutsPerWeek} />
        <Stat label="Streak" value={`${streak}`} sub={streak === 1 ? 'week' : 'weeks'} accent={streak > 0} />
      </div>

      <section className="mt-5 rounded-2xl bg-surface p-3">
        <div className="flex items-center justify-between px-1 pb-2">
          {collapsed ? (
            <p className="font-semibold">This week</p>
          ) : (
            <div className="flex items-center gap-1">
              <button aria-label="Previous month" onClick={() => shift(-1)} className="rounded-full p-1.5 text-muted active:bg-surface-2"><IconChevronLeft size={18} /></button>
              <p className="w-36 text-center font-semibold">{monthLabel}</p>
              <button aria-label="Next month" onClick={() => shift(1)} className="rounded-full p-1.5 text-muted active:bg-surface-2"><IconChevronRight size={18} /></button>
            </div>
          )}
          <button onClick={toggleCollapsed} className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted active:bg-surface-2">
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
                  {mins !== undefined && <span className={`tabular mt-0.5 text-[10px] ${inMonth ? 'text-accent' : 'text-muted opacity-50'}`}>{mins}m</span>}
                </button>
              );
            })}
          </div>
        ))}
      </section>

      <div className="mt-6 mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">
          {selectedDay ? new Date(shown[0]?.startedAt ?? now).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Past workouts'}
        </h2>
        {selectedDay && <button onClick={() => setSelectedDay(null)} className="flex items-center gap-1 text-sm text-accent"><IconX size={14} />Show all</button>}
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

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface px-2 py-3 text-center">
      <p className={`tabular text-xl font-bold ${accent ? 'text-accent' : ''}`}>{value}</p>
      <p className="text-[11px] leading-tight text-muted">{sub ? `${sub}` : ' '}</p>
      <p className="mt-1 text-[11px] font-medium leading-tight">{label}</p>
    </div>
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
  const colour = CATEGORY_COLOUR[cat];
  const names = w.exerciseOrder.map((id) => map.get(id)?.name).filter(Boolean);
  return (
    <li>
      <Link to={`/session/${w.id}`} className="block rounded-2xl bg-surface p-4 active:opacity-80">
        <p className="text-xs text-muted">
          {new Date(w.startedAt).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtDuration(w.durationSec)}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <MuscleBadge colour={colour} cat={cat} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{w.name}</p>
            <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
              <span>{w.exerciseOrder.length} exercises</span>
              <span className="flex items-center gap-1"><IconFlame size={14} />{w.caloriesEst}</span>
              <span className="flex items-center gap-1"><IconWeight size={14} />{fmtBigWeight(w.volumeKg, units)}</span>
              {w.recordsCount > 0 && <span className="text-accent">🏆 {w.recordsCount}</span>}
            </p>
          </div>
        </div>
        {names.length > 0 && <p className="mt-2 line-clamp-2 text-sm text-muted">{names.join(' · ')}</p>}
      </Link>
    </li>
  );
}

/** Original muscle-group glyph: a simple torso with the trained region filled. */
function MuscleBadge({ colour, cat }: { colour: string; cat: Category }) {
  const region = cat === 'legs' ? 'legs' : cat === 'pull' ? 'back' : cat === 'push' ? 'chest' : 'core';
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${colour} 16%, transparent)` }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={colour} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="3.6" r="1.8" />
        <path d="M8 7h8l1.5 6H6.5z" fill={region === 'chest' || region === 'back' ? colour : 'none'} fillOpacity={region === 'back' ? 0.55 : 0.9} />
        <path d="M7 13h10l-1 2H8z" fill={region === 'core' ? colour : 'none'} />
        <path d="M8.5 15l-1 7M15.5 15l1 7M12 15v6" stroke={colour} strokeWidth={region === 'legs' ? 2.6 : 1.6} />
      </svg>
    </div>
  );
}
