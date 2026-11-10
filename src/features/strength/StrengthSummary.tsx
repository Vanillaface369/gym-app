import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GROUPS, type Group } from '../../lib/targets';
import { SUBS, trend } from '../../lib/strength';
import { IconChevronRight } from '../../components/icons';
import { Sparkline } from '../progress/E1rmChart';
import { GROUP_COLOUR } from '../targets/Hexagon';
import { useStrength } from './data';

const GROUP_NAME: Record<Group, string> = { push: 'Push', pull: 'Pull', legs: 'Legs' };

export function TrendBadge({ delta }: { delta: number | null }) {
  if (delta === null || Math.abs(delta) < 1) return <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">–</span>;
  const up = delta > 0;
  return (
    <span className={`tabular rounded-full px-2 py-0.5 text-xs font-semibold ${up ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'}`}
      aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} in 4 weeks`}>
      {up ? '▲' : '▼'} {Math.abs(delta)}
    </span>
  );
}

/** Striped bar for the overall score on a 0-200 scale (4x where you started), with marks at 50 (start) and 100 (twice as strong). */
const BAR_MAX = 200;
function ScoreBar({ score }: { score: number | null }) {
  const mark = (v: number) => `${(v / BAR_MAX) * 100}%`;
  return (
    <div>
      <div className="relative h-3 overflow-hidden rounded-full bg-surface-2">
        {score !== null && (
          <div className="h-full rounded-full" style={{
            width: mark(Math.min(score, BAR_MAX)),
            background: 'repeating-linear-gradient(-45deg, var(--color-accent) 0 6px, color-mix(in oklab, var(--color-accent) 70%, var(--color-bg)) 6px 12px)',
          }} />
        )}
        {[50, 100].map((v) => <span key={v} className="absolute inset-y-0 w-0.5 bg-bg" style={{ left: mark(v) }} />)}
      </div>
      <div className="relative mt-1 h-4 text-xs text-muted" aria-hidden>
        <span className="absolute -translate-x-1/2" style={{ left: mark(50) }}>Start</span>
        <span className="absolute -translate-x-1/2" style={{ left: mark(100) }}>2×</span>
        <span className="absolute right-0">4×</span>
      </div>
    </div>
  );
}

export function StrengthSummary() {
  const data = useStrength();
  const [open, setOpen] = useState<Group | null>(null);
  if (!data) return <div className="mt-6 h-40 rounded-2xl bg-surface" />;
  const { series } = data;
  const now = series[series.length - 1];
  const recent = series.slice(-12);

  return (
    <section className="mt-6">
      <div className="rounded-2xl bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">Strength score</p>
          <TrendBadge delta={trend(series.map((s) => s.overall))} />
        </div>
        <p className="tabular mt-1 text-5xl font-bold">{now.overall ?? '–'}</p>
        <div className="mt-3"><ScoreBar score={now.overall} /></div>
        <p className="mt-2 text-xs text-muted">
          {now.overall === null
            ? 'Your score appears after your first full week of training.'
            : '50 = as strong as when you started, 100 = twice as strong. Updates each week.'}
        </p>
      </div>

      <ul className="mt-2 space-y-2">
        {GROUPS.map(({ id }) => {
          const expanded = open === id;
          return (
            <li key={id} className="rounded-2xl bg-surface">
              <button onClick={() => setOpen(expanded ? null : id)} aria-expanded={expanded} className="flex w-full items-center gap-3 p-4 text-left">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: GROUP_COLOUR[id] }} />
                <span className="flex-1 font-semibold">{GROUP_NAME[id]}</span>
                <span className="tabular text-xl font-bold">{now.groups[id] ?? '–'}</span>
                <TrendBadge delta={trend(series.map((s) => s.groups[id]))} />
                <IconChevronRight size={18} className={`text-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </button>
              {expanded && (
                <ul className="divide-y divide-line border-t border-line px-4">
                  {SUBS.filter((s) => s.group === id).map((s) => {
                    const vals = recent.map((w) => w.subs[s.id]).filter((v): v is number => v !== null);
                    return (
                      <li key={s.id} className="flex items-center gap-3 py-2.5">
                        <span className="flex-1 text-sm">{s.label}</span>
                        <Sparkline values={vals} width={72} height={24} />
                        <span className="tabular w-8 text-right font-semibold">{now.subs[s.id] ?? '–'}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <Link to="/report" className="mt-2 flex min-h-11 items-center justify-center gap-0.5 rounded-xl text-sm font-semibold text-ink active:bg-surface">
        See full report<IconChevronRight size={16} className="text-muted" />
      </Link>
    </section>
  );
}
