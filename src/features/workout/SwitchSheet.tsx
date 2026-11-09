import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { createTemplate, importWorkoutJson, updateSettings } from '../../db/actions';
import type { WorkoutTemplate } from '../../db/types';
import { Confirm, Sheet, SheetRow, CATEGORY_COLOUR } from '../../components/ui';
import { IconEdit, IconList, IconPlus, IconTarget, IconTrash, IconUpload } from '../../components/icons';

type View = 'main' | 'saved' | 'create' | 'import';

export function SwitchSheet({ open, onClose, currentId }: { open: boolean; onClose: () => void; currentId?: string }) {
  const templates = useLiveQuery(() => db.templates.toArray(), []) ?? [];
  const [view, setView] = useState<View>('main');
  const [name, setName] = useState('');
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<WorkoutTemplate | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const splits = ['push', 'pull', 'legs']
    .map((d) => templates.find((t) => t.splitDay === d))
    .filter((t): t is WorkoutTemplate => !!t);

  const close = () => { setView('main'); setError(''); setJson(''); setName(''); onClose(); };
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

  const titles: Record<View, string> = { main: 'Switch workout', saved: 'Saved workouts', create: 'New workout', import: 'Import workout' };

  return (
    <Sheet open={open} onClose={close} title={titles[view]}>
      {view === 'main' && (
        <>
          <p className="mb-1 text-xs font-semibold tracking-wider text-muted uppercase">Within training split</p>
          <div className="space-y-2">
            {splits.map((t) => (
              <button key={t.id} onClick={() => pick(t.id)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${t.id === currentId ? 'bg-accent/10 ring-1 ring-accent' : 'bg-surface-2'}`}>
                <span className="h-9 w-9 rounded-lg" style={{ background: `color-mix(in srgb, ${CATEGORY_COLOUR[t.splitDay as 'push']} 25%, transparent)` }} />
                <span className="flex-1">
                  <span className="block font-semibold">{t.name}</span>
                  <span className="block text-sm text-muted">{t.items.length} exercises</span>
                </span>
                <span className={`h-5 w-5 rounded-full border-2 ${t.id === currentId ? 'border-accent bg-accent shadow-[inset_0_0_0_3px_var(--color-surface-2)]' : 'border-line'}`} />
              </button>
            ))}
          </div>
          <p className="mt-5 mb-1 text-xs font-semibold tracking-wider text-muted uppercase">Other options</p>
          <SheetRow icon={<IconTarget />} label="Pick muscle groups" sub="Coming with auto-generated workouts" disabled />
          <SheetRow icon={<IconList />} label="View saved workouts" onClick={() => setView('saved')} />
          <SheetRow icon={<IconPlus />} label="Create workout from scratch" onClick={() => setView('create')} />
          <SheetRow icon={<IconUpload />} label="Import workout (JSON)" onClick={() => setView('import')} />
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
