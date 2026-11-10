import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { createTemplate, customSplitTemplates, generateWorkout, importWorkoutJson, updateSettings, pickGenerated } from '../../db/actions';
import { MUSCLES, type Category, type Exercise, type Muscle, type SplitDay, type WorkoutTemplate } from '../../db/types';
import { useExercises, useSettings } from '../../lib/hooks';
import { MUSCLE_LABEL } from '../../lib/format';
import { DAY_LABEL, dayMuscles, splitDays } from '../../lib/generate';
import { GROUP_MUSCLES } from '../../lib/targets';
import { ToggleChip } from '../../components/form';
import { Confirm, ExerciseThumb, Sheet, SheetRow } from '../../components/ui';
import { IconEdit, IconList, IconPlus, IconRotate, IconTarget, IconTrash, IconUpload } from '../../components/icons';

type View = 'main' | 'saved' | 'create' | 'import' | 'muscles';

export function SwitchSheet({ open, onClose, currentId, current }: { open: boolean; onClose: () => void; currentId?: string; current: WorkoutTemplate | null }) {
  const settings = useSettings();
  const { map } = useExercises();
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [busy, setBusy] = useState(false);
  const templates = useLiveQuery(() => db.templates.toArray(), []) ?? [];
  const [view, setView] = useState<View>('main');
  const [name, setName] = useState('');
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<WorkoutTemplate | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Each day in the split: its saved template, or a workout generated when picked.
  const own = settings.split === 'custom' ? customSplitTemplates(templates) : [];
  const days: { day: SplitDay; template?: WorkoutTemplate }[] = own.length
    ? own.map((t) => ({ day: 'custom' as SplitDay, template: t }))
    : splitDays(settings.split).map((day) => ({ day, template: templates.find((t) => t.splitDay === day) }));
  // Silhouette for a split day: every main muscle it trains, lit in its group colour.
  const dayThumb = (day: SplitDay, t?: WorkoutTemplate): Exercise => {
    const exs = (t?.items ?? []).map((i) => map.get(i.exerciseId)).filter((e): e is Exercise => !!e);
    const muscles = exs.length ? [...new Set(exs.flatMap((e) => e.primaryMuscles))] : dayMuscles(day);
    const counts = new Map<Category, number>();
    for (const e of exs) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    const cat: Category = day === 'push' || day === 'pull' || day === 'legs' ? day
      : [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'core';
    return { id: `day-${t?.id ?? day}`, name: t?.name ?? DAY_LABEL[day] ?? 'Workout', category: cat, primaryMuscles: muscles, secondaryMuscles: [],
      equipment: [], isBodyweight: false, defaultRestSec: 0, preference: 0, isCustom: false, archived: false, useCount: 0 };
  };
  const generate = async (opts: { muscles: Muscle[]; name: string; splitDay: SplitDay }) => {
    setBusy(true);
    try { await pickGenerated(await generateWorkout(opts)); close(); } finally { setBusy(false); }
  };
  const freshDay: SplitDay = current?.splitDay && current.splitDay !== 'custom' ? current.splitDay : days[0]?.day ?? 'full';
  const musclesName = (ms: Muscle[]) => {
    const names = ms.map((m) => MUSCLE_LABEL[m]);
    return names.length <= 3 ? names.join(', ').replace(/, ([^,]*)$/, ' & $1') : 'Custom workout';
  };

  const close = () => { setView('main'); setError(''); setJson(''); setName(''); setMuscles([]); onClose(); };
  const pick = async (id: string) => { await updateSettings({ selectedTemplateId: id }); close(); };

  const doImport = async (text: string) => {
    try {
      setError('');
      const t = await importWorkoutJson(text);
      await pick(t.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that JSON.');
    }
  };

  const titles: Record<View, string> = { main: 'Switch workout', saved: 'Saved workouts', create: 'New workout', import: 'Import workout', muscles: 'Pick muscle groups' };

  return (
    <Sheet open={open} onClose={close} title={titles[view]} onBack={view === 'main' ? undefined : () => { setView('main'); setError(''); }}>
      {view === 'main' && (
        <>
          <p className="mb-1 text-xs font-semibold tracking-wider text-muted uppercase">Within training split</p>
          <div className="space-y-2">
            {days.map(({ day, template: t }) => {
              const on = t ? t.id === currentId : current?.id === 'generated' && current.splitDay === day;
              return (
                <button key={t?.id ?? day} disabled={busy}
                  onClick={() => (t ? pick(t.id) : generate({ muscles: dayMuscles(day), name: DAY_LABEL[day] ?? 'Workout', splitDay: day }))}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${on ? 'bg-accent/10 ring-1 ring-accent' : 'bg-surface-2'}`}>
                  <ExerciseThumb ex={dayThumb(day, t)} size={44} />
                  <span className="flex-1">
                    <span className="block font-semibold">{t?.name ?? DAY_LABEL[day]}</span>
                    <span className="block text-sm text-muted">{t ? `${t.items.length} exercises` : 'Generated for you'}</span>
                  </span>
                  <span className={`h-5 w-5 rounded-full border-2 ${on ? 'border-accent bg-accent shadow-[inset_0_0_0_3px_var(--color-surface-2)]' : 'border-line'}`} />
                </button>
              );
            })}
          </div>
          <p className="mt-5 mb-1 text-xs font-semibold tracking-wider text-muted uppercase">Other options</p>
          <SheetRow icon={<IconRotate />} label="Generate a fresh workout" sub={`New ${DAY_LABEL[freshDay] ?? 'workout'} from your exercises`} disabled={busy}
            onClick={() => generate({ muscles: dayMuscles(freshDay), name: DAY_LABEL[freshDay] ?? 'Workout', splitDay: freshDay })} />
          <SheetRow icon={<IconTarget />} label="Pick muscle groups" sub="Generate a workout for the muscles you choose" onClick={() => setView('muscles')} />
          <SheetRow icon={<IconList />} label="View saved workouts" onClick={() => setView('saved')} />
          <SheetRow icon={<IconPlus />} label="Create workout from scratch" onClick={() => setView('create')} />
          <SheetRow icon={<IconUpload />} label="Import workout (JSON)" onClick={() => setView('import')} />
        </>
      )}

      {view === 'muscles' && (
        <>
          {(['push', 'pull', 'legs'] as const).map((g) => (
            <div key={g} className="mb-3">
              <p className="mb-1.5 text-xs font-semibold tracking-wider text-muted uppercase">{g === 'legs' ? 'Legs' : g === 'push' ? 'Push' : 'Pull'}</p>
              <div className="flex flex-wrap gap-1.5">
                {GROUP_MUSCLES[g].map((m) => (
                  <ToggleChip key={m} on={muscles.includes(m)} onClick={() => setMuscles(muscles.includes(m) ? muscles.filter((x) => x !== m) : [...muscles, m])}>{MUSCLE_LABEL[m]}</ToggleChip>
                ))}
              </div>
            </div>
          ))}
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-semibold tracking-wider text-muted uppercase">Core</p>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLES.filter((m) => m === 'abs' || m === 'obliques').map((m) => (
                <ToggleChip key={m} on={muscles.includes(m)} onClick={() => setMuscles(muscles.includes(m) ? muscles.filter((x) => x !== m) : [...muscles, m])}>{MUSCLE_LABEL[m]}</ToggleChip>
              ))}
            </div>
          </div>
          <button disabled={!muscles.length || busy} onClick={() => generate({ muscles, name: musclesName(muscles), splitDay: 'custom' })}
            className="mt-2 w-full rounded-xl bg-accent py-3 font-semibold text-accent-ink disabled:opacity-40">
            Generate{muscles.length ? ` for ${muscles.length} muscle${muscles.length > 1 ? 's' : ''}` : ''}
          </button>
        </>
      )}

      {view === 'saved' && (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <button onClick={() => pick(t.id)} className={`flex flex-1 items-center justify-between rounded-xl p-3 text-left ${t.id === currentId ? 'bg-accent/10 ring-1 ring-accent' : 'bg-surface-2'}`}>
                <span className="font-semibold">{t.name}</span>
                <span className="text-sm text-muted">{t.items.length} exercises</span>
              </button>
              {t.splitDay === 'custom' && (
                <button aria-label={`Delete ${t.name}`} onClick={() => setToDelete(t)} className="rounded-xl p-3 text-muted active:bg-surface-2"><IconTrash size={20} /></button>
              )}
            </li>
          ))}
        </ul>
      )}

      {view === 'create' && (
        <form onSubmit={async (e) => { e.preventDefault(); const t = await createTemplate(name); await pick(t.id); }}>
          <label className="text-sm text-muted">Name
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arms & Abs"
              className="mt-1 w-full rounded-xl bg-surface-2 px-4 py-3 text-ink outline-none focus:ring-2 focus:ring-accent" />
          </label>
          <p className="mt-2 text-sm text-muted">It starts empty. Add exercises with “Add exercise” on the Workout tab.</p>
          <button type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-accent-ink"><IconEdit size={18} />Create</button>
        </form>
      )}

      {view === 'import' && (
        <>
          <p className="text-sm text-muted">Paste JSON or pick a .json file. Exercise names are matched to your list; new names become custom exercises.</p>
          <textarea value={json} onChange={(e) => setJson(e.target.value)} rows={8} spellCheck={false}
            placeholder={'{\n  "name": "Arms",\n  "exercises": [\n    { "name": "Barbell Curl", "sets": 3, "reps": 12, "weightKg": 22.5 }\n  ]\n}'}
            className="mt-3 w-full rounded-xl bg-surface-2 p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent" />
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button className="flex-1 rounded-xl bg-surface-2 py-3 font-medium" onClick={() => fileRef.current?.click()}>Choose file</button>
            <button className="flex-1 rounded-xl bg-accent py-3 font-semibold text-accent-ink disabled:opacity-40" disabled={!json.trim()} onClick={() => doImport(json)}>Import</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) doImport(await f.text()); e.target.value = ''; }} />
        </>
      )}

      <Confirm
        open={!!toDelete}
        title={`Delete “${toDelete?.name}”?`}
        body="Past workouts done from it are kept."
        confirmLabel="Delete"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) {
            await db.templates.delete(toDelete.id);
            if (toDelete.id === currentId) await updateSettings({ selectedTemplateId: undefined });
          }
          setToDelete(null);
        }}
      />
    </Sheet>
  );
}
