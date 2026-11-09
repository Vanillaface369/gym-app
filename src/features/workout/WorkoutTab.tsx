import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { progressionTrend, recentSessionsFor, saveTemplate, setPreference, suggestedTemplate } from '../../db/actions';
import type { TemplateItem, WorkoutTemplate } from '../../db/types';
import { useExercises, useSettings } from '../../lib/hooks';
import { fmtDuration, fmtWeight, fromDisplay, toDisplay } from '../../lib/format';
import { Chip, ExerciseThumb, Sheet, SheetRow, NumberField } from '../../components/ui';
import { ExercisePicker, RestPicker } from '../../components/ExercisePicker';
import {
  IconChevronRight, IconDown, IconMore, IconPlus, IconStar, IconSwap, IconTimer, IconTrash, IconUp, IconEdit,
} from '../../components/icons';
import { SwitchSheet } from './SwitchSheet';

export function WorkoutTab() {
  const settings = useSettings();
  const { map } = useExercises();
  const template = useLiveQuery(() => suggestedTemplate(), []);
  const gym = useLiveQuery(() => db.gymProfiles.get(settings.activeGymProfileId), [settings.activeGymProfileId]);
  const history = useLiveQuery(async () => {
    if (!template) return new Map<string, { lastTop: number | null; trend: -1 | 0 | 1 }>();
    const out = new Map<string, { lastTop: number | null; trend: -1 | 0 | 1 }>();
    for (const it of template.items) {
      const [last] = await recentSessionsFor(it.exerciseId, 1);
      out.set(it.exerciseId, { lastTop: last ? Math.max(...last.map((s) => s.weightKg)) : null, trend: await progressionTrend(it.exerciseId) });
    }
    return out;
  }, [template]);

  const [switchOpen, setSwitchOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<TemplateItem | null>(null);
  const [replaceFor, setReplaceFor] = useState<TemplateItem | null>(null);
  const [restFor, setRestFor] = useState<TemplateItem | null>(null);
  const [editFor, setEditFor] = useState<TemplateItem | null>(null);
  const [adding, setAdding] = useState(false);

  const items = template ? [...template.items].sort((a, b) => a.order - b.order) : [];
  const muscles = new Set(items.flatMap((it) => map.get(it.exerciseId)?.primaryMuscles ?? []));
  const initials = (settings.name || 'Me').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const update = async (fn: (t: WorkoutTemplate) => void) => {
    if (!template) return;
    const t: WorkoutTemplate = structuredClone(template);
    t.items.sort((a, b) => a.order - b.order);
    fn(t);
    await saveTemplate(t);
  };
  const idxOf = (t: WorkoutTemplate, it: TemplateItem) => t.items.findIndex((x) => x.exerciseId === it.exerciseId && x.order === it.order);

  return (
    <div className="pt-safe px-4">
      <header className="flex h-14 items-center justify-between">
        <Link to="/settings" aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">{initials}</Link>
        <Link to="/settings" className="text-sm font-medium text-accent">My Plan</Link>
      </header>

      {template === undefined ? null : !template ? (
        <p className="mt-10 text-center text-muted">No workouts yet. Use Switch to create one.</p>
      ) : (
        <>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted">Today's workout</p>
              <h1 className="truncate text-3xl font-bold tracking-tight">{template.name}</h1>
              <p className="mt-1 text-sm text-muted">{items.length} exercises • {muscles.size} muscles</p>
            </div>
            <button onClick={() => setSwitchOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2.5 text-sm font-semibold active:opacity-70">
              <IconSwap size={16} />Switch
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <Chip><IconTimer size={16} />{fmtDuration(settings.durationMin * 60)}</Chip>
            <Chip>{gym?.name ?? 'Your Gym'}</Chip>
          </div>

          <ul className="mt-5 divide-y divide-line">
            {items.map((it) => {
              const ex = map.get(it.exerciseId);
              const h = history?.get(it.exerciseId);
              const w = h?.lastTop ?? it.targetWeightKg;
              return (
                <li key={`${it.exerciseId}-${it.order}`} className="flex items-center gap-3 py-3">
                  <ExerciseThumb ex={ex} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{ex?.name ?? 'Unknown exercise'}</p>
                    <p className="flex items-center gap-1 text-sm text-muted">
                      {it.maxEffort ? (
                        <><span className="font-semibold text-accent">Max Effort</span> • {it.sets} sets • up to {fmtWeight(w, settings.units)}</>
                      ) : (
                        <>{it.sets} sets • {it.targetReps} reps • {fmtWeight(w, settings.units)}</>
                      )}
                      {h?.trend === 1 && <IconUp size={14} className="text-accent" aria-label="Going up" />}
                      {h?.trend === -1 && <IconDown size={14} className="text-danger" aria-label="Going down" />}
                    </p>
                  </div>
                  {ex?.preference === 1 && <IconStar size={16} className="text-accent" aria-label="More often" />}
                  <button aria-label={`Options for ${ex?.name}`} onClick={() => setMenuFor(it)} className="-mr-2 rounded-full p-2 text-muted active:bg-surface-2"><IconMore /></button>
                </li>
              );
            })}
          </ul>
          <button onClick={() => setAdding(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm font-medium text-muted active:bg-surface-2">
            <IconPlus size={18} />Add exercise
          </button>
          <p className="mt-3 text-center text-xs text-muted">Changes here update your {template.name} template.</p>
        </>
      )}

      <SwitchSheet open={switchOpen} onClose={() => setSwitchOpen(false)} currentId={template?.id} />

      {/* Exercise ⋯ menu */}
      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor ? map.get(menuFor.exerciseId)?.name : ''}>
        {menuFor && (() => {
          const ex = map.get(menuFor.exerciseId);
          const close = () => setMenuFor(null);
          return (
            <>
              <SheetRow icon={<IconEdit />} label="Edit sets, reps & weight" onClick={() => { setEditFor(menuFor); close(); }} />
              <SheetRow icon={<IconSwap />} label="Replace" onClick={() => { setReplaceFor(menuFor); close(); }} />
              <SheetRow icon={<IconTimer />} label="Set rest time" sub={`${Math.floor(menuFor.restSec / 60)}:${String(menuFor.restSec % 60).padStart(2, '0')}`} onClick={() => { setRestFor(menuFor); close(); }} />
              <SheetRow icon={<IconUp />} label="Move up" onClick={() => { update((t) => { const i = idxOf(t, menuFor); if (i > 0) [t.items[i - 1], t.items[i]] = [t.items[i], t.items[i - 1]]; }); close(); }} />
              <SheetRow icon={<IconDown />} label="Move down" onClick={() => { update((t) => { const i = idxOf(t, menuFor); if (i >= 0 && i < t.items.length - 1) [t.items[i + 1], t.items[i]] = [t.items[i], t.items[i + 1]]; }); close(); }} />
              <SheetRow icon={<IconChevronRight />} label={menuFor.maxEffort ? 'Turn off Max Effort' : 'Make it a Max Effort Day'} sub="Work up to a heavy top set" onClick={() => { update((t) => { const i = idxOf(t, menuFor); if (i >= 0) t.items[i].maxEffort = !t.items[i].maxEffort || undefined; }); close(); }} />
              {ex && (
                <div className="my-2 flex gap-2 px-2">
                  {([[1, 'More often'], [0, 'Normal'], [-1, 'Less often']] as const).map(([p, label]) => (
                    <button key={p} onClick={() => setPreference(ex.id, p)}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${ex.preference === p ? 'bg-accent text-accent-ink' : 'bg-surface-2'}`}>{label}</button>
                  ))}
                </div>
              )}
              <SheetRow icon={<IconTrash />} label="Remove from workout" danger onClick={() => { update((t) => { const i = idxOf(t, menuFor); if (i >= 0) t.items.splice(i, 1); }); close(); }} />
            </>
          );
        })()}
      </Sheet>

      <ExercisePicker
        open={!!replaceFor}
        title="Replace with"
        onClose={() => setReplaceFor(null)}
        excludeIds={items.map((i) => i.exerciseId)}
        onPick={(ex) => {
          const target = replaceFor!;
          update((t) => { const i = idxOf(t, target); if (i >= 0) t.items[i] = { ...t.items[i], exerciseId: ex.id, targetWeightKg: null, restSec: ex.defaultRestSec, maxEffort: undefined }; });
          setReplaceFor(null);
        }}
      />
      <ExercisePicker
        open={adding}
        title="Add exercise"
        onClose={() => setAdding(false)}
        excludeIds={items.map((i) => i.exerciseId)}
        onPick={(ex) => {
          update((t) => { t.items.push({ exerciseId: ex.id, sets: 3, targetReps: 10, targetWeightKg: null, restSec: ex.defaultRestSec, order: t.items.length }); });
          setAdding(false);
        }}
      />
      <RestPicker
        open={!!restFor}
        onClose={() => setRestFor(null)}
        value={restFor?.restSec ?? 90}
        onChange={(sec) => {
          const target = restFor!;
          setRestFor({ ...target, restSec: sec });
          update((t) => { const i = idxOf(t, target); if (i >= 0) t.items[i].restSec = sec; });
        }}
      />
      <EditItemSheet
        item={editFor}
        units={settings.units}
        onClose={() => setEditFor(null)}
        onSave={(patch) => {
          const target = editFor!;
          update((t) => { const i = idxOf(t, target); if (i >= 0) Object.assign(t.items[i], patch); });
          setEditFor(null);
        }}
      />
    </div>
  );
}

function EditItemSheet({ item, units, onClose, onSave }: {
  item: TemplateItem | null; units: 'kg' | 'lb'; onClose: () => void;
  onSave: (p: Pick<TemplateItem, 'sets' | 'targetReps' | 'targetWeightKg'>) => void;
}) {
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState<number | ''>('');
  const [lastItem, setLastItem] = useState<TemplateItem | null>(null);
  if (item !== lastItem) {
    setLastItem(item);
    if (item) {
      setSets(item.sets);
      setReps(item.targetReps);
      setWeight(item.targetWeightKg === null ? '' : toDisplay(item.targetWeightKg, units));
    }
  }
  return (
    <Sheet open={!!item} onClose={onClose} title="Edit plan">
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm text-muted">Sets<NumberField ariaLabel="Sets" value={sets} onChange={(n) => setSets(Math.max(1, Math.round(n)))} /></label>
        <label className="text-sm text-muted">{item?.maxEffort ? 'Top-set reps' : 'Reps'}<NumberField ariaLabel="Reps" value={reps} onChange={(n) => setReps(Math.max(1, Math.round(n)))} /></label>
        <label className="text-sm text-muted">{item?.maxEffort ? `Top (${units})` : `Weight (${units})`}<NumberField ariaLabel="Weight" value={weight} step={0.5} onChange={setWeight} /></label>
      </div>
      <p className="mt-3 text-xs text-muted">Weights pre-fill from your last session when there is one; this is the fallback.</p>
      <button
        className="mt-4 w-full rounded-xl bg-accent py-3 font-semibold text-accent-ink"
        onClick={() => onSave({ sets, targetReps: reps, targetWeightKg: weight === '' ? null : fromDisplay(weight, units) })}
      >Save</button>
    </Sheet>
  );
}
