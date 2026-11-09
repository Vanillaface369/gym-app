import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Units } from '../../db/types';
import type { ChartPoint } from '../../lib/progress';
import { toDisplay } from '../../lib/format';

const ACCENT = 'var(--color-accent)';
const MUTED = 'var(--color-muted)';
const LINE = 'var(--color-line)';

function tickLabel(ts: number, monthly: boolean) {
  return new Date(ts).toLocaleDateString('en-AU', monthly ? { month: 'short' } : { day: '2-digit', month: '2-digit' });
}

/** Estimated 1RM over time: one accent line, faint grid, press-and-hold tooltip. */
export function E1rmChart({ points, from, to, units, monthly }: { points: ChartPoint[]; from: number; to: number; units: Units; monthly: boolean }) {
  const data = points.map((p) => ({ date: p.date, value: toDisplay(p.e1rm, units) }));
  const vals = data.map((d) => d.value);
  // Evenly spaced y ticks on a "nice" step, about 3-5 of them.
  const min = Math.min(...vals), max = Math.max(...vals);
  const step = [1, 2, 2.5, 5, 10, 20, 25, 50, 100].find((s) => s >= (max - min) / 3) ?? 100;
  const lo = Math.max(0, Math.floor((min - step / 2) / step) * step);
  const hi = Math.ceil((max + step / 2) / step) * step;
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  return (
    <div className="h-56 w-full" role="img" aria-label={`Estimated 1RM chart, ${data.length} point${data.length === 1 ? '' : 's'}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={LINE} strokeOpacity={0.6} />
          <XAxis dataKey="date" type="number" scale="time" domain={[from, to]} tickFormatter={(t) => tickLabel(t, monthly)}
            tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} tickCount={5} minTickGap={24} />
          <YAxis domain={[lo, hi]} ticks={ticks} width={36}
            tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ stroke: MUTED, strokeDasharray: '3 3' }} isAnimationActive={false}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload as { date: number; value: number } | undefined;
              if (!p) return null;
              return (
                <div className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs shadow-lg ring-1 ring-line">
                  <p className="text-muted">{monthly ? new Date(p.date).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) + ' best' : new Date(p.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <p className="tabular font-semibold">{p.value} {units}</p>
                </div>
              );
            }} />
          <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} isAnimationActive={false}
            dot={{ r: 4, fill: ACCENT, stroke: 'var(--color-bg)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: ACCENT, stroke: 'var(--color-bg)', strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tiny trend line for benchmark cards. No axes or interaction; the card itself is the tap target. */
export function Sparkline({ values, width = 96, height = 32 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pad = 4;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), height - pad - ((v - min) / span) * (height - pad * 2)]);
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={ACCENT} />
    </svg>
  );
}
