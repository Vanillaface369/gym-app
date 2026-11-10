import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { GENERATED_ID, previewItems, progressionTrend, saveTemplate, setPreference, suggestedTemplate, updateSettings } from '../../db/actions';
import type { TemplateItem, WorkoutTemplate } from '../../db/types';
import { useExercises, useSettings } from '../../lib/hooks';
import { fmtDuration, fmtProgress, fmtWeight, fromDisplay, toDisplay } from '../../lib/format';
import { Chip, ExerciseThumb, Sheet, SheetRow, NumberField } from '../../components/ui';
import { ExercisePicker, RestPicker } from '../../components/ExercisePicker';
import {
  IconChevronRight, IconDown, IconMore, IconPlus, IconStar, IconSwap, IconTimer, IconTrash, IconUp, IconEdit,
} from '../../components/icons';
import { SwitchSheet } from './SwitchSheet';
import { SwipeToDelete, useUndo } from '../../components/Swipe';

export function WorkoutTab() {
  const settings = useSettings();
  const { map } = useExercises();
  const template = useLiveQuery(() => suggestedTemplate(), []);
  const gyms = useLiveQuery(() => db.gymProfiles.toArray(), []) ?? [];
  const gym = gyms.find((g) => g.id === settings.activeGymProfileId);
  // What each exercise will start with today (progression applied), plus the e1RM trend arrow.
  const preview = useLiveQuery(async () => {
    if (!template) return null;
    const items = await previewItems(template);
    const trends = new Map<string, -1 | 0 | 1>();
    for (const it of template.items) trends.set(it.exerciseId, await progressionTrend(it.exerciseId));
    return { items, trends };
  }, [template]);
  const [gymOpen, setGymOpen] = useState(false);
  const isGenerated = template?.id === GENERATED_ID;

  const [switchOpen, setSwitchOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<TemplateItem | null>(null);
  const [replaceFor, setReplaceFor] = useState<TemplateItem | null>(null);
  const [restFor, setRestFor] = useState<TemplateItem | null>(null);
  const [editFor, setEditFor] = useState<TemplateItem | null>(null);
  const [adding, setAdding] = useState(false);
  const undo = useUndo('bottom-48'); // above the Start Workout button and tab bar

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
        <Link to="/plan" className="text-sm font-medium text-accent">My Plan</Link>
      </header>

      {template === undefined ? null : !template ? (
        <p className="mt-10 text-center text-muted">No workouts yet. Use Switch to create one.</p>
      ) : (
        <>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted">Today's workout</p>
              <h1 className="truncate text-3xl font-bold tracking-tight">{template.name}</h1>
              <p className="mt-1 text-sm text-muted">{isGenerated && <span className="font-semibold text-accent">Generated · </span>}{items.length} exercises • {muscles.size} muscles</p>
            </div>
            <button onClick={() => setSwitchOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2.5 text-sm font-semibold active:opacity-70">
              <IconSwap size={16} />Switch
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <Chip><IconTimer size={16} />{fmtDuration(settings.durationMin * 60)}</Chip>
            <Chip onClick={() => setGymOpen(true)}>{gym?.name ?? 'Your Gym'}</Chip>
          </div>

          <ul className="mt-5 divide-y divide-line">
            {items.map((it) => {
              const ex = map.get(it.exerciseId);
              const p = preview?.items.get(`${it.exerciseId}-${it.order}`);
              const first = p?.sets.find((x) => !x.isWarmup);
              const w = (it.maxEffort ? p?.sets.at(-1)?.weightKg ?? it.targetWeightKg : first?.weightKg ?? it.targetWeightKg) || null; // 0 = not set yet
              const reps = first?.reps ?? it.targetReps;
              const trend = preview?.trends.get(it.exerciseId);
              const note = fmtProgress(p?.progress, settings.units);
              return (
                <SwipeToDelete as="li" key={`${it.exerciseId}-${it.order}`} onDelete={() => {
                  const before = structuredClone(template);
                  update((t) => { const i = idxOf(t, it); if (i >= 0) t.items.splice(i, 1); });
                  undo.show(`Removed ${ex?.name ?? 'exercise'}`, () => saveTemplate(before));
                }}>
                <div className="flex items-center gap-3 py-3">
                  <ExerciseThumb ex={ex} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{ex?.name ?? 'Unknown exercise'}</p>
                    <p className="flex items-center gap-1 text-sm text-muted">
                      {it.maxEffort ? (
                        <><span className="font-semibold text-accent">Max Effort</span> • {it.sets} sets • up to {fmtWeight(w, settings.units)}</>
                      ) : (
                        <>{it.sets} sets • {reps} reps • {fmtWeight(w, settings.units)}</>
                      )}
                      {trend === 1 && <IconUp size={14} className="text-accent" aria-label="Going up" />}
                      {trend === -1 && <IconDown size={14} className="text-danger" aria-label="Going down" />}
                    </p>
                    {note && <p className={`text-xs font-semibold ${p?.progress?.kind === 'deload' ? 'text-warn' : 'text-accent'}`}>{note}</p>}
                  </div>
                  {ex?.preference === 1 && <IconStar size={16} className="text-accent" aria-label="More often" />}
                  <button aria-label={`Options for ${ex?.name}`} onClick={() => setMenuFor(it)} className="-mr-2 rounded-full p-2 text-muted active:bg-surface-2"><IconMore /></button>
                </div>
                </SwipeToDelete>
              );
            })}
          </ul>
          <button onClick={() => setAdding(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm font-medium text-muted active:bg-surface-2">
            <IconPlus size={18} />Add exercise
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            Swipe an exercise left to remove it. {isGenerated ? 'Generated for you. Changes here stay with this workout.' : `Changes here update your ${template.name} template.`}
          </p>
        </>
      )}

      {undo.bar}
      <SwitchSheet open={switchOpen} onClose={() => setSwitchOpen(false)} currentId={template?.id} current={template ?? null} />

      <Sheet open={gymOpen} onClose={() => setGymOpen(false)} title="Where are you training?">
        <div className="space-y-2">
          {gyms.map((g) => (
            <button key={g.id} onClick={async () => { await updateSettings({ activeGymProfileId: g.id }); setGymOpen(false); }}
              className={`flex w-full items-center justify-between rounded-xl p-3 text-left ${g.id === settings.activeGymProfileId ? 'bg-accent/10 ring-1 ring-accent' : 'bg-surface-2'}`}>
              <span><span className="block font-semibold">{g.name}</span>
                <span className="block text-sm text-muted">{g.bodyweightOnly ? 'Bodyweight only' : `${g.equipment.length} kinds of equipment`}</span></span>
            </button>
          ))}
        </div>
        <Link to="/plan" className="mt-3 block py-2 text-center text-sm font-semibold text-accent">Edit gyms in My Plan</Link>
      </Sheet>

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
      <p className="mt-3 text-xs text-muted">With history, weights and reps pre-fill from your last session plus progression; this is the fallback.</p>
      <button
        className="mt-4 w-full rounded-xl bg-accent py-3 font-semibold text-accent-ink"
        onClick={() => onSave({ sets, targetReps: reps, targetWeightKg: weight === '' ? null : fromDisplay(weight, units) })}
      >Save</button>
    </Sheet>
  );
}
