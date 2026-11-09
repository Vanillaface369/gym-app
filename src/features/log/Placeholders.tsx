import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useSettings } from '../../lib/hooks';
import { fmtBigWeight, fmtDate, fmtDuration } from '../../lib/format';
import { IconChevronRight } from '../../components/icons';

function ComingSoon({ title, stage, children }: { title: string; stage: string; children?: React.ReactNode }) {
  return (
    <div className="pt-safe px-4">
      <h1 className="pt-6 text-3xl font-bold tracking-tight">{title}</h1>
      <div className="mt-6 rounded-2xl bg-surface p-5 text-muted">
        <p>Coming in <span className="font-semibold text-ink">{stage}</span>.</p>
      </div>
      {children}
    </div>
  );
}

export const BodyTab = () => <ComingSoon title="Body" stage="stage 5 (Recovery) and stage 6 (Strength score)" />;
export const TargetsTab = () => <ComingSoon title="Targets" stage="stage 4 (Weekly set targets)" />;

/** Stage 1 keeps this minimal: a plain list so you can check saved workouts. The full Log tab is stage 2. */
export function LogTab() {
  const s = useSettings();
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), []) ?? [];
  return (
    <ComingSoon title="Log" stage="stage 2 (stats, calendar, timeline)">
      <h2 className="mt-6 mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Saved workouts</h2>
      {!sessions.length && <p className="text-sm text-muted">Finish a workout and it'll show here.</p>}
      <ul className="divide-y divide-line">
        {sessions.map((w) => (
          <li key={w.id}>
            <Link to={`/session/${w.id}`} className="flex items-center gap-3 py-3 active:opacity-70">
              <div className="flex-1">
                <p className="font-semibold">{w.name}</p>
                <p className="text-sm text-muted">{fmtDate(w.startedAt)} · {fmtDuration(w.durationSec)} · {fmtBigWeight(w.volumeKg, s.units)}</p>
              </div>
              <IconChevronRight size={18} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </ComingSoon>
  );
}
