import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { updateSettings } from '../../db/actions';
import { useExercises, useNow, useSettings } from '../../lib/hooks';
import { MUSCLE_LABEL } from '../../lib/format';
import { addDays, startOfWeek } from '../../lib/stats';
import { countSets, fmtSets, GROUP_MUSCLES, GROUPS, progress, type Group, type WeekCounts } from '../../lib/targets';
import { NumberField, Sheet } from '../../components/ui';
import { IconChevronRight, IconEdit } from '../../components/icons';
import { GROUP_COLOUR, HexRing } from './Hexagon';

const WEEKS = 9; // this week + 8 previous

const fmtRange = (from: number) => {
  const to = addDays(from, 6);
  const f = (t: number) => new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  // "8–14 Nov", or "29 Nov – 5 Dec" across months
  return new Date(from).getMonth() === new Date(to).getMonth() ? `${new Date(from).getDate()}–${f(to)}` : `${f(from)} – ${f(to)}`;
};

export function TargetsTab() {
  const settings = useSettings();
  const { map } = useExercises();
  const now = useNow(60_000);
  const thisWeek = startOfWeek(now, settings.weekStart);
  const weekStarts = Array.from({ length: WEEKS }, (_, i) => addDays(thisWeek, -7 * (WEEKS - 1 - i))); // oldest first
  const [picked, setPicked] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState<Group | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // Sets grouped by the week their workout started in.
  const byWeek = useLiveQuery(async () => {
    const sessions = await db.sessions.where('startedAt').aboveOrEqual(weekStarts[0]).toArray();
    const sets = sessions.length ? await db.sets.where('sessionId').anyOf(sessions.map((s) => s.id)).toArray() : [];
    const weekOf = new Map(sessions.map((s) => [s.id, startOfWeek(s.startedAt, settings.weekStart)]));
    const out = new Map<number, typeof sets>();
    for (const s of sets) {
      const w = weekOf.get(s.sessionId)!;
      out.set(w, [...(out.get(w) ?? []), s]);
    }
    return out;
  }, [weekStarts[0], settings.weekStart]);

  // Open the history row scrolled to the newest week.
  const loaded = byWeek !== undefined;
  useEffect(() => {
    const el = historyRef.current;
    if (loaded && el) requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth; });
  }, [loaded]);

  const counts = new Map<number, WeekCounts>(weekStarts.map((w) => [w, countSets(byWeek?.get(w) ?? [], map)]));
  const targets = settings.weeklySetTargets;
  const week = picked !== null && weekStarts.includes(picked) ? picked : thisWeek;
  const c = counts.get(week)!;
  const p = progress(c.groups, targets);
  const isCurrent = week === thisWeek;

  return (
    <div className="pt-safe px-4">
      <div className="flex items-end justify-between pt-6">
        <h1 className="text-3xl font-bold tracking-tight">Targets</h1>
        <button onClick={() => setEditing(true)} className="-mr-3 flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink active:bg-surface">
          <IconEdit size={16} />Edit targets
        </button>
      </div>
      <div className="mt-1 flex min-h-11 items-center gap-2">
        <p className="text-sm text-muted">{isCurrent ? 'This week · ' : ''}{fmtRange(week)}</p>
        {!isCurrent && <button onClick={() => setPicked(null)} className="flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line ring-inset active:bg-surface">Back to this week</button>}
      </div>

      <div className="mt-4 flex justify-center">
        <HexRing size={220} stroke={12} pct={{ push: p.groups.push.pct, pull: p.groups.pull.pct, legs: p.groups.legs.pct }}
          label={`${p.overall}% of weekly set targets`}>
          <span className="tabular text-5xl font-bold">{p.overall}<span className="text-2xl text-muted">%</span></span>
          <span className="text-xs text-muted">of weekly sets</span>
        </HexRing>
      </div>

      <ul className="mt-4 space-y-2">
        {GROUPS.map(({ id, label }) => {
          const g = p.groups[id];
          const expanded = open === id;
          return (
            <li key={id} className="rounded-2xl bg-surface">
              <button onClick={() => setOpen(expanded ? null : id)} aria-expanded={expanded} className="w-full p-4 text-left">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: GROUP_COLOUR[id] }} />
                  <span className="flex-1 font-semibold">{label}</span>
                  <span className="tabular text-sm"><span className="font-semibold">{g.done}</span><span className="text-muted"> / {g.target} sets</span></span>
                  <IconChevronRight size={18} className={`text-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${g.pct}%`, background: GROUP_COLOUR[id] }} />
                </div>
                <p className="mt-1.5 text-xs text-muted">{g.toGo ? `${g.toGo} to go` : g.target ? 'Target hit' : 'No target set'}</p>
              </button>
              {expanded && (
                <div className="border-t border-line px-4 py-3">
                  <ul className="tabular space-y-1.5 text-sm">
                    {GROUP_MUSCLES[id].map((m) => (
                      <li key={m} className="flex justify-between">
                        <span className="text-muted">{MUSCLE_LABEL[m]}</span>
                        <span className={c.muscles[m] ? 'font-semibold' : 'text-muted'}>{fmtSets(c.muscles[m] ?? 0)} sets</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted">Per muscle, a set counts 1 where the muscle is a main target and ½ where it helps, so these won't add up to the total above.</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">History</h2>
        <div className="no-scrollbar -mx-4 mt-2 flex gap-1 overflow-x-auto px-4 pb-1" ref={historyRef}>
          {weekStarts.map((w) => {
            const wp = progress(counts.get(w)!.groups, targets);
            const sel = w === week;
            return (
              <button key={w} onClick={() => setPicked(w)} aria-pressed={sel} aria-label={`Week of ${fmtRange(w)}: ${wp.overall}%`}
                className={`flex shrink-0 flex-col items-center rounded-xl px-1.5 pt-1.5 pb-2 ${sel ? 'bg-surface-2' : 'active:bg-surface'}`}>
                <HexRing size={56} stroke={4} pct={{ push: wp.groups.push.pct, pull: wp.groups.pull.pct, legs: wp.groups.legs.pct }}>
                  <span className="tabular text-xs font-semibold">{wp.overall}%</span>
                </HexRing>
                <span className={`mt-0.5 text-xs ${sel ? 'text-ink' : 'text-muted'}`}>
                  {w === thisWeek ? 'This wk' : new Date(w).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <TargetEditor open={editing} onClose={() => setEditing(false)} targets={targets} />
    </div>
  );
}

function TargetEditor({ open, onClose, targets }: { open: boolean; onClose: () => void; targets: Record<Group, number> }) {
  const [t, setT] = useState(targets);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) { setWasOpen(open); if (open) setT(targets); }
  const save = async () => {
    await updateSettings({ weeklySetTargets: { push: Math.round(t.push), pull: Math.round(t.pull), legs: Math.round(t.legs) } });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Weekly set targets">
      <p className="text-sm text-muted">Working sets per week for each group.</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {GROUPS.map(({ id, label }) => (
          <label key={id} className="text-center">
            <span className="mb-1.5 flex items-center justify-center gap-1.5 text-sm font-semibold">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: GROUP_COLOUR[id] }} />{label.replace(' muscles', '')}
            </span>
            <NumberField ariaLabel={`${id} sets per week`} value={t[id]} onChange={(v) => setT((p) => ({ ...p, [id]: Math.min(200, v) }))} />
          </label>
        ))}
      </div>
      <button onClick={save} className="mt-5 w-full rounded-2xl bg-accent py-3.5 font-bold text-accent-ink">Save</button>
    </Sheet>
  );
}
