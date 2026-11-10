import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { activeActions, discardWorkout, finishWorkout, itemForExercise } from '../../db/actions';
import type { ActiveItem } from '../../db/types';
import { useActive, useExercises, useNow, useSettings } from '../../lib/hooks';
import { fmtClock, fmtWeight } from '../../lib/format';
import { Confirm, ExerciseThumb, PageHeader, Sheet, SheetRow } from '../../components/ui';
import { ExercisePicker } from '../../components/ExercisePicker';
import { IconDown, IconMore, IconPlus, IconSwap, IconTrash, IconUp, IconX } from '../../components/icons';
import { RestTimerUI } from './RestTimer';
import { SwipeToDelete, useUndo } from '../../components/Swipe';

export function ActiveWorkoutPage() {
  const active = useActive();
  const settings = useSettings();
  const { map } = useExercises();
  const nav = useNavigate();
  const now = useNow(500, !!active);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [menuFor, setMenuFor] = useState<ActiveItem | null>(null);
  const [replaceFor, setReplaceFor] = useState<ActiveItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // Keep the Undo bar above the rest-timer bar when one is showing.
  const undo = useUndo(active?.rest ? 'bottom-44' : 'bottom-28');
  // The logging screen can remove an exercise and send us its undo info.
  const location = useLocation();
  const removed = (location.state as { removed?: { item: ActiveItem; index: number; name: string } } | null)?.removed;
  useEffect(() => {
    if (!removed) return;
    undo.show(`Removed ${removed.name}`, () => activeActions.insertItem(removed.item, removed.index));
    nav('.', { replace: true, state: null });
  }, [removed]);
  // Set while we're finishing/discarding, so the "no workout -> go home" redirect doesn't race our own navigation.
  const leaving = useRef(false);

  if (active === undefined) return null;
  if (active === null) return leaving.current ? null : <Navigate to="/" replace />;

  const totalSets = active.items.reduce((t, it) => t + it.sets.length, 0);
  const doneSets = active.items.reduce((t, it) => t + it.sets.filter((s) => s.done).length, 0);
  // What to do next: the first exercise with sets left to log.
  const nextItem = active.items.find((it) => it.sets.some((s) => !s.done));
  const removeItem = (it: ActiveItem) => {
    const index = active.items.findIndex((x) => x.key === it.key);
    activeActions.removeItem(it.key);
    undo.show(`Removed ${map.get(it.exerciseId)?.name ?? 'exercise'}`, () => activeActions.insertItem(it, index));
  };

  const finish = async () => {
    setFinishing(true);
    leaving.current = true;
    const id = await finishWorkout();
    setFinishing(false);
    if (id) nav(`/session/${id}?new=1`, { replace: true });
    else { leaving.current = false; setConfirmEmpty(true); }
  };

  return (
    <div className="pb-44">
      <PageHeader
        left={<button aria-label="Discard workout" onClick={() => setConfirmDiscard(true)} className="tap -ml-3 rounded-full p-2 text-muted active:bg-surface-2"><IconX /></button>}
        title={active.name}
        right={<Link to="/" className="tap -mr-3 rounded-full px-3 text-sm font-medium text-muted active:bg-surface-2">Hide</Link>}
      />
      <div className="px-4">
        <div className="flex flex-col items-center py-4">
          <div className="flex items-center gap-3">
            <span className="rec-dot h-3 w-3 rounded-full bg-danger" />
            <span className="tabular text-5xl font-bold tracking-tight">{fmtClock((now - active.startedAt) / 1000)}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{doneSets} / {totalSets} sets logged</p>
        </div>

        <ul className="divide-y divide-line">
          {active.items.map((it) => {
            const ex = map.get(it.exerciseId);
            const done = it.sets.filter((s) => s.done).length;
            const complete = done === it.sets.length && it.sets.length > 0;
            const top = Math.max(...it.sets.map((s) => s.weightKg));
            return (
              <SwipeToDelete as="li" key={it.key} onDelete={() => removeItem(it)}>
              <div className="flex items-center gap-1">
                <Link to={`/active/${it.key}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 active:opacity-70">
                  <ExerciseThumb ex={ex} done={complete} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{ex?.name ?? 'Unknown exercise'}</p>
                    <p className="text-sm text-muted">
                      <span className={done ? 'text-accent' : ''}>{done}/{it.sets.length} sets logged</span>
                      {' • '}{it.maxEffort ? 'Max Effort • ' : ''}{fmtWeight(top, settings.units)}
                    </p>
                  </div>
                </Link>
                <button aria-label={`Options for ${ex?.name}`} onClick={() => setMenuFor(it)} className="tap -mr-3 rounded-full p-2 text-muted active:bg-surface-2"><IconMore /></button>
              </div>
              </SwipeToDelete>
            );
          })}
        </ul>
        <button onClick={() => setAdding(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm font-medium text-muted active:bg-surface-2">
          <IconPlus size={18} />Add exercise
        </button>
      </div>

      {/* Mid-workout the main action is the next exercise; Finish takes over once everything is logged. */}
      <div className="pb-bar fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-lg gap-3 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6">
        {nextItem ? (
          <>
            <button disabled={finishing} onClick={() => setConfirmFinish(true)}
              className="min-h-14 rounded-2xl bg-surface-2 px-5 font-semibold active:opacity-70 disabled:opacity-50">Finish</button>
            <Link to={`/active/${nextItem.key}`}
              className="flex min-h-14 min-w-0 flex-1 items-center justify-center gap-1 rounded-2xl bg-accent px-4 text-lg font-bold text-accent-ink shadow-xl shadow-black/50 active:scale-[0.98]">
              <span className="truncate">{doneSets ? 'Continue' : 'Start'}: {map.get(nextItem.exerciseId)?.name ?? 'next exercise'}</span>
            </Link>
          </>
        ) : (
          <button disabled={finishing} onClick={finish}
            className="min-h-14 w-full rounded-2xl bg-accent text-lg font-bold text-accent-ink shadow-xl shadow-black/50 active:scale-[0.98] disabled:opacity-50">
            Finish Workout
          </button>
        )}
      </div>

      {undo.bar}
      <RestTimerUI active={active} label={active.rest ? map.get(active.items.find((i) => i.key === active.rest!.itemKey)?.exerciseId ?? '')?.name : undefined} />

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor ? map.get(menuFor.exerciseId)?.name : ''}>
        {menuFor && (
          <>
            <SheetRow icon={<IconSwap />} label="Replace" onClick={() => { setReplaceFor(menuFor); setMenuFor(null); }} />
            <SheetRow icon={<IconUp />} label="Move up" disabled={active.items[0]?.key === menuFor.key} onClick={() => { activeActions.moveItem(menuFor.key, -1); setMenuFor(null); }} />
            <SheetRow icon={<IconDown />} label="Move down" disabled={active.items.at(-1)?.key === menuFor.key} onClick={() => { activeActions.moveItem(menuFor.key, 1); setMenuFor(null); }} />
            <SheetRow icon={<IconTrash />} label="Remove from this workout" danger onClick={() => { removeItem(menuFor); setMenuFor(null); }} />
          </>
        )}
      </Sheet>
      <ExercisePicker open={!!replaceFor} title="Replace with" onClose={() => setReplaceFor(null)}
        onPick={async (ex) => { await activeActions.replaceItem(replaceFor!.key, ex); setReplaceFor(null); }} />
      <ExercisePicker open={adding} title="Add exercise" onClose={() => setAdding(false)} excludeIds={active.items.map((i) => i.exerciseId)}
        onPick={async (ex) => { await activeActions.addItem(await itemForExercise(ex)); setAdding(false); }} />

      <Confirm open={confirmDiscard} title="Discard this workout?" confirmLabel="Discard" danger
        body={doneSets ? `You've logged ${doneSets} set${doneSets === 1 ? '' : 's'}. ${doneSets === 1 ? 'It' : 'They'} won't be saved.` : 'Nothing from this session will be saved.'}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={async () => { leaving.current = true; await discardWorkout(); nav('/', { replace: true }); }} />
      <Confirm open={confirmFinish} title="Finish workout?" body={`${totalSets - doneSets} planned sets aren't logged. Only logged sets will be saved.`} confirmLabel="Finish"
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => { setConfirmFinish(false); finish(); }} />
      <Confirm open={confirmEmpty} title="No sets logged" body="There's nothing to save yet. Keep going, or discard the workout." confirmLabel="Discard" danger
        onCancel={() => setConfirmEmpty(false)}
        onConfirm={async () => { leaving.current = true; await discardWorkout(); nav('/', { replace: true }); }} />
    </div>
  );
}
