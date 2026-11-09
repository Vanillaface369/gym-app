import { useMemo, useState } from 'react';
import type { Exercise } from '../db/types';
import { useExercises } from '../lib/hooks';
import { MUSCLE_LABEL } from '../lib/format';
import { ExerciseThumb, Sheet } from './ui';

const FILTERS = ['all', 'push', 'pull', 'legs', 'core'] as const;

export function ExercisePicker({ open, onClose, onPick, title = 'Choose exercise', excludeIds = [] }: {
  open: boolean; onClose: () => void; onPick: (ex: Exercise) => void; title?: string; excludeIds?: string[];
}) {
  const { list } = useExercises();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<(typeof FILTERS)[number]>('all');
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list
      .filter((e) => !e.archived && !excludeIds.includes(e.id))
      .filter((e) => cat === 'all' || e.category === cat)
      .filter((e) => !needle || e.name.toLowerCase().includes(needle) || e.primaryMuscles.some((m) => MUSCLE_LABEL[m].toLowerCase().includes(needle)))
      .sort((a, b) => b.useCount - a.useCount || a.name.localeCompare(b.name));
  }, [list, q, cat, excludeIds]);

  return (
    <Sheet open={open} onClose={onClose} title={title} tall>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search exercises or muscles"
        className="w-full rounded-xl bg-surface-2 px-4 py-3 outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setCat(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm capitalize ${cat === f ? 'bg-accent text-accent-ink font-semibold' : 'bg-surface-2'}`}>{f}</button>
        ))}
      </div>
      <ul className="mt-2">
        {shown.map((e) => (
          <li key={e.id}>
            <button onClick={() => { onPick(e); setQ(''); }} className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left active:bg-surface-2">
              <ExerciseThumb ex={e} size={40} />
              <span className="flex-1">
                <span className="block font-medium">{e.name}</span>
                <span className="block text-sm text-muted">{e.primaryMuscles.map((m) => MUSCLE_LABEL[m]).join(', ') || 'Custom'}</span>
              </span>
              <span className="text-xs text-muted tabular">{e.useCount}×</span>
            </button>
          </li>
        ))}
        {!shown.length && <li className="py-8 text-center text-muted">No matches</li>}
      </ul>
    </Sheet>
  );
}

export function RestPicker({ open, onClose, value, onChange }: { open: boolean; onClose: () => void; value: number; onChange: (sec: number) => void }) {
  const presets = [45, 60, 75, 90, 120, 150, 180, 240];
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <Sheet open={open} onClose={onClose} title="Rest time">
      <div className="flex items-center justify-center gap-6 py-4">
        <button className="h-12 w-16 rounded-xl bg-surface-2 font-semibold" onClick={() => onChange(Math.max(0, value - 15))}>−15s</button>
        <div className="tabular w-24 text-center text-4xl font-bold">{fmt(value)}</div>
        <button className="h-12 w-16 rounded-xl bg-surface-2 font-semibold" onClick={() => onChange(value + 15)}>+15s</button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {presets.map((p) => (
          <button key={p} onClick={() => onChange(p)}
            className={`rounded-xl py-2.5 tabular ${p === value ? 'bg-accent text-accent-ink font-semibold' : 'bg-surface-2'}`}>{fmt(p)}</button>
        ))}
      </div>
      <button className="mt-4 w-full rounded-xl bg-surface-2 py-3 font-medium" onClick={onClose}>Done</button>
    </Sheet>
  );
}
