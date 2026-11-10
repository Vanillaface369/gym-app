import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Units } from '../../db/types';
import { useSettings } from '../../lib/hooks';
import { fmtBigWeight, toDisplay } from '../../lib/format';
import { lifetimeTotals, MILESTONE_TIERS, milestoneLevel, type Track } from '../../lib/stats';
import { PageHeader } from '../../components/ui';
import { IconChevronLeft } from '../../components/icons';

export const TRACKS: { id: Track; label: string; colour: string }[] = [
  { id: 'workouts', label: 'Workouts', colour: 'var(--color-accent)' },
  // Not the push/pull category colours, so they don't read as muscle groups.
  { id: 'volumeKg', label: 'Volume', colour: 'var(--color-silver)' },
  { id: 'calories', label: 'Calories', colour: 'var(--color-gold)' },
];

export function fmtTrack(track: Track, value: number, units: Units): string {
  if (track === 'volumeKg') return fmtBigWeight(value, units);
  if (track === 'calories') return `${Math.round(value).toLocaleString('en-AU')} kcal`;
  return Math.round(value).toLocaleString('en-AU');
}

/** Short tier label, e.g. "250k kg", "1M kg", "500". */
function shortTier(track: Track, v: number, units: Units): string {
  const n = track === 'volumeKg' ? toDisplay(v, units) : v;
  const s = n >= 1_000_000 ? `${Math.round(n / 100_000) / 10}M` : n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n));
  return track === 'volumeKg' ? `${s} ${units}` : s;
}

/** Filled hexagon badge with the level number. */
export function HexBadge({ level, colour, size = 72 }: { level: number; colour: string; size?: number }) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + 60 * i) * Math.PI) / 180;
    return `${50 + 46 * Math.cos(a)},${50 + 46 * Math.sin(a)}`;
  }).join(' ');
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label={`Level ${level}`} role="img">
      <polygon points={pts} fill={`color-mix(in oklab, ${colour} 18%, var(--color-surface))`} stroke={colour} strokeWidth="5" strokeLinejoin="round" />
      <text x="50" y="47" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-muted)" letterSpacing="1">LEVEL</text>
      <text x="50" y="71" textAnchor="middle" fontSize="28" fontWeight="800" fill="var(--color-ink)">{level}</text>
    </svg>
  );
}

export function MilestonesPage() {
  const nav = useNavigate();
  const s = useSettings();
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  if (!sessions) return null;
  const totals = lifetimeTotals(sessions, s.lifetimeOffset);

  return (
    <div className="pb-16">
      <PageHeader
        left={<button aria-label="Back" onClick={() => nav(-1)} className="tap -ml-3 rounded-full p-2 active:bg-surface-2"><IconChevronLeft /></button>}
        title="Milestones"
      />
      <div className="space-y-3 px-4">
        {TRACKS.map(({ id, label, colour }) => {
          const tiers = MILESTONE_TIERS[id];
          const value = totals[id];
          const { level, next } = milestoneLevel(value, tiers);
          const prev = level ? tiers[level - 1] : 0;
          const pct = next ? Math.min(100, ((value - prev) / (next - prev)) * 100) : 100;
          return (
            <section key={id} className="rounded-2xl bg-surface p-4">
              <div className="flex items-center gap-4">
                <HexBadge level={level} colour={colour} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-muted">{label}</p>
                  <p className="tabular truncate text-2xl font-bold">{fmtTrack(id, value, s.units)}</p>
                  <p className="text-sm text-muted">{next ? <><span className="font-semibold text-ink">{fmtTrack(id, next - value, s.units)} to go</span> · level {level + 1} at {fmtTrack(id, next, s.units)}</> : 'Top level reached'}</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colour }} />
              </div>
              <ol className="mt-3 flex flex-wrap gap-1.5" aria-label={`${label} levels`}>
                {tiers.map((t, i) => (
                  <li key={t} className={`tabular rounded-full px-2 py-0.5 text-xs font-semibold ${i < level ? 'text-accent-ink' : 'bg-surface-2 text-muted'}`}
                    style={i < level ? { background: colour } : undefined}>{shortTier(id, t, s.units)}</li>
                ))}
              </ol>
            </section>
          );
        })}
        <p className="px-1 text-xs text-muted">Totals include your history from before this app.</p>
      </div>
    </div>
  );
}
