import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/db';
import { setPreference } from '../../db/actions';
import { EQUIPMENT, MUSCLES, type Category, type Equipment, type Exercise, type Muscle } from '../../db/types';
import { useExercises, useSettings } from '../../lib/hooks';
import { EQUIPMENT_LABEL, fmtClock, MUSCLE_LABEL, uid } from '../../lib/format';
import { goalRange } from '../../lib/progression';
import { ExerciseThumb, PageHeader, Sheet } from '../../components/ui';
import { Segmented, Stepper, Toggle, ToggleChip } from '../../components/form';
import { IconChevronLeft, IconDown, IconPlus, IconUp } from '../../components/icons';

const CATEGORIES: [Category, string][] = [['push', 'Push'], ['pull', 'Pull'], ['legs', 'Legs'], ['core', 'Core'], ['other', 'Other']];

export function ExercisesPage() {
  const nav = useNavigate();
  const settings = useSettings();
  const { list } = useExercises();
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const range = goalRange(settings.goal);

  const shown = list
    .filter((e) => showArchived || !e.archived)
    .filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.useCount - a.useCount || a.name.localeCompare(b.name));
  const archivedCount = list.filter((e) => e.archived).length;

  const blank = (): Exercise => ({
    id: '', name: q.trim(), category: 'push', primaryMuscles: [], secondaryMuscles: [], equipment: [], isBodyweight: false,
    defaultRestSec: settings.restDefaultSec, preference: 0, isCustom: true, archived: false, useCount: 0,
  });

  return (
    <div className="pb-24">
      <PageHeader
        left={<button aria-label="Back" onClick={() => nav(-1)} className="-ml-2 rounded-full p-2 active:bg-surface-2"><IconChevronLeft /></button>}
        title="Manage exercises"
        right={<button aria-label="Add exercise" onClick={() => setEditing(blank())} className="-mr-2 rounded-full p-2 text-accent active:bg-surface-2"><IconPlus /></button>}
      />
      <div className="px-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${list.length} exercises`} aria-label="Search exercises"
          className="w-full rounded-xl bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-accent" />
        <p className="mt-2 text-xs text-muted">↑ more often · ↓ less often in generated workouts. Tap an exercise to edit it.</p>
        <ul className="mt-2 divide-y divide-line">
          {shown.map((ex) => (
            <li key={ex.id} className="flex items-center gap-3 py-2.5">
              <button onClick={() => setEditing(ex)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <ExerciseThumb ex={ex} size={40} />
                <span className="min-w-0">
                  <span className={`block truncate font-medium ${ex.archived ? 'text-muted line-through' : ''}`}>{ex.name}</span>
                  <span className="block text-xs text-muted">{ex.useCount} uses · {ex.repMin ?? range.min}–{ex.repMax ?? range.max} reps{ex.isCustom ? ' · custom' : ''}</span>
                </span>
              </button>
              <button aria-label={`More often: ${ex.name}`} aria-pressed={ex.preference === 1} onClick={() => setPreference(ex.id, ex.preference === 1 ? 0 : 1)}
                className={`rounded-full p-2 ${ex.preference === 1 ? 'bg-accent/15 text-accent' : 'text-muted'}`}><IconUp size={18} /></button>
              <button aria-label={`Less often: ${ex.name}`} aria-pressed={ex.preference === -1} onClick={() => setPreference(ex.id, ex.preference === -1 ? 0 : -1)}
                className={`rounded-full p-2 ${ex.preference === -1 ? 'bg-danger/15 text-danger' : 'text-muted'}`}><IconDown size={18} /></button>
            </li>
          ))}
        </ul>
        {!shown.length && (
          <button onClick={() => setEditing(blank())} className="mt-4 w-full rounded-2xl border border-dashed border-line p-4 text-muted">
            No match. Add “{q.trim()}” as a new exercise
          </button>
        )}
        {archivedCount > 0 && (
          <button onClick={() => setShowArchived(!showArchived)} className="mt-4 w-full py-2 text-sm text-muted">
            {showArchived ? 'Hide' : 'Show'} {archivedCount} hidden exercise{archivedCount > 1 ? 's' : ''}
          </button>
        )}
      </div>
      <ExerciseEditor ex={editing} onClose={() => setEditing(null)} defaultRange={range} />
    </div>
  );
}

function ExerciseEditor({ ex, onClose, defaultRange }: { ex: Exercise | null; onClose: () => void; defaultRange: { min: number; max: number } }) {
  const [d, setD] = useState<Exercise | null>(null);
  const [shownFor, setShownFor] = useState<Exercise | null>(null);
  const [error, setError] = useState('');
  if (ex !== shownFor) { setShownFor(ex); setD(ex ? structuredClone(ex) : null); setError(''); }
  if (!ex || !d) return null;
  const isNew = !ex.id;
  const ownRange = d.repMin !== undefined;
  const toggleMuscle = (key: 'primaryMuscles' | 'secondaryMuscles', m: Muscle) => {
    const other = key === 'primaryMuscles' ? 'secondaryMuscles' : 'primaryMuscles';
    const on = d[key].includes(m);
    setD({ ...d, [key]: on ? d[key].filter((x) => x !== m) : [...d[key], m], [other]: d[other].filter((x) => x !== m) });
  };
  const toggleEq = (e: Equipment) => setD({ ...d, equipment: d.equipment.includes(e) ? d.equipment.filter((x) => x !== e) : [...d.equipment, e] });
  const save = async () => {
    const name = d.name.trim();
    if (!name) return setError('Give it a name.');
    if (!d.primaryMuscles.length) return setError('Pick at least one main muscle.');
    const clash = await db.exercises.filter((x) => x.id !== d.id && x.name.toLowerCase() === name.toLowerCase()).count();
    if (clash) return setError('You already have an exercise with that name.');
    const isBodyweight = d.equipment.length > 0 && d.equipment.every((e) => e === 'bodyweight' || e === 'pull_up_bar');
    await db.exercises.put({ ...d, name, id: d.id || uid(), isBodyweight });
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={isNew ? 'New exercise' : 'Edit exercise'} tall>
      <label className="text-sm text-muted">Name
        <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Cable Crossover"
          className="mt-1 w-full rounded-xl bg-surface-2 px-4 py-3 text-ink outline-none focus:ring-2 focus:ring-accent" />
      </label>

      <p className="mt-4 text-sm text-muted">Group</p>
      <div className="mt-1.5"><Segmented value={d.category} options={CATEGORIES} onChange={(v) => setD({ ...d, category: v })} /></div>

      <p className="mt-4 text-sm text-muted">Main muscles</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {MUSCLES.map((m) => <ToggleChip key={m} on={d.primaryMuscles.includes(m)} onClick={() => toggleMuscle('primaryMuscles', m)}>{MUSCLE_LABEL[m]}</ToggleChip>)}
      </div>
      <p className="mt-4 text-sm text-muted">Helper muscles</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {MUSCLES.map((m) => <ToggleChip key={m} on={d.secondaryMuscles.includes(m)} onClick={() => toggleMuscle('secondaryMuscles', m)}>{MUSCLE_LABEL[m]}</ToggleChip>)}
      </div>
      <p className="mt-4 text-sm text-muted">Equipment</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {EQUIPMENT.map((e) => <ToggleChip key={e} on={d.equipment.includes(e)} onClick={() => toggleEq(e)}>{EQUIPMENT_LABEL[e]}</ToggleChip>)}
      </div>

      <div className="mt-4 divide-y divide-line rounded-2xl bg-surface-2/50 px-3">
        <div className="flex min-h-14 items-center justify-between gap-3">
          <span>Rest</span>
          <Stepper value={d.defaultRestSec} label={fmtClock(d.defaultRestSec)} min={15} max={600} step={15} onChange={(v) => setD({ ...d, defaultRestSec: v })} />
        </div>
        <div className="flex min-h-14 items-center justify-between gap-3">
          <span>Own rep range<span className="block text-xs text-muted">Off = goal default ({defaultRange.min}–{defaultRange.max})</span></span>
          <Toggle on={ownRange} onChange={(v) => setD(v ? { ...d, repMin: defaultRange.min, repMax: defaultRange.max } : { ...d, repMin: undefined, repMax: undefined })} />
        </div>
        {ownRange && (
          <>
            <div className="flex min-h-14 items-center justify-between"><span>Lowest reps</span>
              <Stepper value={d.repMin!} label={String(d.repMin)} min={1} max={d.repMax! - 1} onChange={(v) => setD({ ...d, repMin: v })} /></div>
            <div className="flex min-h-14 items-center justify-between"><span>Highest reps</span>
              <Stepper value={d.repMax!} label={String(d.repMax)} min={d.repMin! + 1} max={50} onChange={(v) => setD({ ...d, repMax: v })} /></div>
          </>
        )}
        {!isNew && (
          <div className="flex min-h-14 items-center justify-between gap-3">
            <span>Hide this exercise<span className="block text-xs text-muted">Keeps its history; leaves it out of pickers and generated workouts</span></span>
            <Toggle on={d.archived} onChange={(v) => setD({ ...d, archived: v })} />
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <button onClick={save} className="mt-5 w-full rounded-2xl bg-accent py-3.5 font-bold text-accent-ink">Save</button>
    </Sheet>
  );
}
