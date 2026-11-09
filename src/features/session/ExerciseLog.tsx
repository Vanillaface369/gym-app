import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { activeActions, recentSessionsFor } from '../../db/actions';
import { unlockAudio, useActive, useExercises, useSettings } from '../../lib/hooks';
import { fmtClock, fmtShortDate, fmtWeight, fromDisplay, MUSCLE_LABEL, toDisplay } from '../../lib/format';
import { Chip, NumberField, PageHeader, Sheet, SheetRow } from '../../components/ui';
import { ExercisePicker, RestPicker } from '../../components/ExercisePicker';
import { IconCheck, IconChevronLeft, IconEdit, IconHistory, IconInfo, IconLink, IconMinus, IconMore, IconPlus, IconSwap, IconTimer, IconTrash } from '../../components/icons';
import { RestTimerUI } from './RestTimer';

export function ExerciseLogPage() {
  const { key } = useParams();
  const active = useActive();
  const settings = useSettings();
  const { map } = useExercises();
  const nav = useNavigate();
  const [restOpen, setRestOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [editHowTo, setEditHowTo] = useState(false);
  const [removeSetIdx, setRemoveSetIdx] = useState<number | null>(null);

  if (active === undefined) return null;
  const item = active?.items.find((i) => i.key === key);
  if (!active || !item) return <Navigate to={active ? '/active' : '/'} replace />;
  const ex = map.get(item.exerciseId);
  const firstOpen = item.sets.findIndex((s) => !s.done);
  const u = settings.units;
  const idx = active.items.indexOf(item);
  const next = active.items[idx + 1];

  return (
    <div className="pb-48">
      <PageHeader
        left={<button aria-label="Back" onClick={() => nav('/active')} className="-ml-2 rounded-full p-2 active:bg-surface-2"><IconChevronLeft /></button>}
        title={<span className="text-sm text-muted">{idx + 1} of {active.items.length}</span>}
        right={<button aria-label="More" onClick={() => setMoreOpen(true)} className="-mr-2 rounded-full p-2 text-muted active:bg-surface-2"><IconMore /></button>}
      />
      <div className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-bold">{ex?.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {item.maxEffort && <span className="font-semibold text-accent">Max Effort Day · </span>}
              {ex?.primaryMuscles.map((m) => MUSCLE_LABEL[m]).join(', ')}
            </p>
          </div>
          <button onClick={() => setHowToOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-sm font-semibold"><IconInfo size={16} />How-To</button>
        </div>

        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip onClick={() => setRestOpen(true)}><IconTimer size={16} />{fmtClock(item.restSec)}</Chip>
          <Chip onClick={() => setHistoryOpen(true)}><IconHistory size={16} />History</Chip>
          <Chip onClick={() => setReplaceOpen(true)}><IconSwap size={16} />Replace</Chip>
          <Chip onClick={() => setMoreOpen(true)}><IconMore size={16} />More</Chip>
        </div>

        <div className="mt-5 grid grid-cols-[2.5rem_1fr_1fr_3rem] items-center gap-x-3 gap-y-2.5">
          <span />
          <span className="text-center text-xs font-semibold tracking-wider text-muted uppercase">Reps</span>
          <span className="text-center text-xs font-semibold tracking-wider text-muted uppercase">Weight ({u})</span>
          <span />
          {item.sets.map((s, i) => {
            const isCurrent = i === firstOpen;
            return (
              <div key={i} className="contents">
                <button
                  aria-label={`Set ${i + 1} options`}
                  onClick={() => setRemoveSetIdx(i)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${s.done ? 'bg-accent text-accent-ink' : isCurrent ? 'bg-surface-2 ring-2 ring-accent' : 'bg-surface-2 text-muted'}`}
                >{s.done ? <IconCheck size={18} /> : i + 1}</button>
                <NumberField ariaLabel={`Set ${i + 1} reps`} value={s.reps} done={s.done} highlight={isCurrent}
                  onChange={(n) => activeActions.updateSet(item.key, i, { reps: Math.round(n) })} />
                <NumberField ariaLabel={`Set ${i + 1} weight`} step={0.5} done={s.done} highlight={isCurrent}
                  value={s.weightKg === 0 && !ex?.isBodyweight ? '' : toDisplay(s.weightKg, u)} placeholder="0"
                  onChange={(n) => activeActions.updateSet(item.key, i, { weightKg: fromDisplay(n, u) })} />
                <button
                  aria-label={s.done ? `Un-log set ${i + 1}` : `Log set ${i + 1}`}
                  onClick={() => { unlockAudio(); activeActions.toggleSet(item.key, i); }}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.done ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}
                ><IconCheck /></button>
              </div>
            );
          })}
        </div>

        <button onClick={() => activeActions.addSet(item.key)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm font-medium text-muted active:bg-surface-2">
          <IconPlus size={18} />Add Set
        </button>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6 pb-4">
        {firstOpen >= 0 ? (
          <div className="flex gap-3">
            <button onClick={() => { unlockAudio(); activeActions.logAll(item.key); }} className="rounded-2xl bg-surface-2 px-5 py-4 font-semibold active:opacity-70">Log All Sets</button>
            <button onClick={() => { unlockAudio(); activeActions.logNext(item.key); }}
              className="flex-1 rounded-2xl bg-accent py-4 text-lg font-bold text-accent-ink shadow-xl shadow-black/50 active:scale-[0.98]">Log Set {firstOpen + 1}</button>
          </div>
        ) : (
          <button onClick={() => nav(next ? `/active/${next.key}` : '/active')}
            className="w-full rounded-2xl bg-accent py-4 text-lg font-bold text-accent-ink shadow-xl shadow-black/50">
            {next ? `Next: ${map.get(next.exerciseId)?.name}` : 'Back to workout'}
          </button>
        )}
      </div>

      <RestTimerUI active={active} />

      <RestPicker open={restOpen} onClose={() => setRestOpen(false)} value={item.restSec} onChange={(s) => activeActions.setRest(item.key, s)} />
      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} exerciseId={item.exerciseId} units={u} />
      <ExercisePicker open={replaceOpen} title="Replace with" onClose={() => setReplaceOpen(false)}
        onPick={async (e) => { await activeActions.replaceItem(item.key, e); setReplaceOpen(false); }} />

      <Sheet open={howToOpen} onClose={() => setHowToOpen(false)} title={`How-To · ${ex?.name ?? ''}`}>
        {ex?.howToNotes ? <p className="whitespace-pre-wrap">{ex.howToNotes}</p> : <p className="text-muted">No notes yet.</p>}
        {ex?.howToUrl && (
          <a href={ex.howToUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 rounded-xl bg-surface-2 p-3 font-medium text-accent">
            <IconLink size={18} /><span className="truncate">{ex.howToUrl}</span>
          </a>
        )}
        <button onClick={() => { setHowToOpen(false); setEditHowTo(true); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-surface-2 py-3 font-medium"><IconEdit size={18} />Edit notes & link</button>
      </Sheet>
      {ex && <HowToEditor open={editHowTo} onClose={() => setEditHowTo(false)} exerciseId={ex.id} notes={ex.howToNotes ?? ''} url={ex.howToUrl ?? ''} />}

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={ex?.name}>
        <SheetRow icon={<IconEdit />} label="Edit How-To notes & link" onClick={() => { setMoreOpen(false); setEditHowTo(true); }} />
        <SheetRow icon={<IconPlus />} label="Add set" onClick={() => { activeActions.addSet(item.key); setMoreOpen(false); }} />
        <SheetRow icon={<IconTrash />} label="Remove exercise from this workout" danger
          onClick={async () => { setMoreOpen(false); await activeActions.removeItem(item.key); nav('/active', { replace: true }); }} />
      </Sheet>

      <Sheet open={removeSetIdx !== null} onClose={() => setRemoveSetIdx(null)} title={`Set ${(removeSetIdx ?? 0) + 1}`}>
        <SheetRow icon={<IconMinus />} label="Remove this set" danger disabled={item.sets.length <= 1}
          onClick={() => { activeActions.removeSet(item.key, removeSetIdx!); setRemoveSetIdx(null); }} />
      </Sheet>
    </div>
  );
}

function HistorySheet({ open, onClose, exerciseId, units }: { open: boolean; onClose: () => void; exerciseId: string; units: 'kg' | 'lb' }) {
  const sessions = useLiveQuery(async () => (open ? recentSessionsFor(exerciseId, 12) : []), [open, exerciseId]) ?? [];
  return (
    <Sheet open={open} onClose={onClose} title="History">
      {!sessions.length && <p className="py-6 text-center text-muted">No history for this exercise yet.</p>}
      <ul className="divide-y divide-line">
        {sessions.map((ss) => (
          <li key={ss[0].sessionId} className="py-3">
            <p className="text-sm text-muted">{fmtShortDate(ss[0].completedAt)}</p>
            <p className="tabular mt-0.5">{ss.map((s) => `${s.reps} × ${fmtWeight(s.weightKg, units)}`).join(' · ')}</p>
            <p className="text-xs text-muted">Best est. 1RM {fmtWeight(Math.max(...ss.map((s) => s.e1rm)), units)}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-xs text-muted">Charts and PRs arrive in the Progress stage.</p>
    </Sheet>
  );
}

function HowToEditor({ open, onClose, exerciseId, notes, url }: { open: boolean; onClose: () => void; exerciseId: string; notes: string; url: string }) {
  const [n, setN] = useState(notes);
  const [l, setL] = useState(url);
  const [badUrl, setBadUrl] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setN(notes); setL(url); setBadUrl(false); } }
  const save = async () => {
    const link = l.trim();
    if (link && !/^https?:\/\//i.test(link)) { setBadUrl(true); return; }
    await db.exercises.update(exerciseId, { howToNotes: n.trim() || undefined, howToUrl: link || undefined });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="How-To notes">
      <label className="text-sm text-muted">Notes / cues
        <textarea value={n} onChange={(e) => setN(e.target.value)} rows={5} placeholder="e.g. Seat on notch 4. Squeeze shoulder blades, pull to upper chest."
          className="mt-1 w-full rounded-xl bg-surface-2 p-3 text-ink outline-none focus:ring-2 focus:ring-accent" />
      </label>
      <label className="mt-3 block text-sm text-muted">Link (optional)
        <input value={l} onChange={(e) => setL(e.target.value)} inputMode="url" placeholder="https://…"
          className="mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 text-ink outline-none focus:ring-2 focus:ring-accent" />
      </label>
      {badUrl && <p className="mt-1 text-sm text-danger">Links need to start with http:// or https://</p>}
      <button onClick={save} className="mt-4 w-full rounded-xl bg-accent py-3 font-semibold text-accent-ink">Save</button>
    </Sheet>
  );
}
