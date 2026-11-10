import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Muscle, Units } from '../../db/types';
import { useSettings } from '../../lib/hooks';
import { fmtBigWeight, toDisplay } from '../../lib/format';
import { rangeStart, type Range } from '../../lib/progress';
import { addDays, startOfDay, startOfWeek } from '../../lib/stats';
import { bucketVolume, SUBS, trend, type Sub } from '../../lib/strength';
import { PageHeader } from '../../components/ui';
import { IconChevronLeft, IconUpload } from '../../components/icons';
import { BodyMap } from '../body/BodyMap';
import { TrendBadge } from './StrengthSummary';
import { shareCardImage } from './share';
import { useStrength, type StrengthData } from './data';

const ACCENT = 'var(--color-accent)';
const MUTED = 'var(--color-muted)';
const LINE = 'var(--color-line)';
const APP_NAME = 'Liftlog';

const STRENGTH_RANGES: { id: Range; label: string }[] = [{ id: 'month', label: 'Month' }, { id: '6m', label: '6 Months' }, { id: 'year', label: 'Year' }];
const VOLUME_RANGES: { id: Range; label: string }[] = [{ id: 'week', label: 'Week' }, ...STRENGTH_RANGES];

export function ReportPage() {
  const nav = useNavigate();
  const data = useStrength();
  const settings = useSettings();
  const [sRange, setSRange] = useState<Range>('6m');
  const [vRange, setVRange] = useState<Range>('month');

  return (
    <div className="pb-16">
      <PageHeader
        left={<button aria-label="Back" onClick={() => nav(-1)} className="tap -ml-3 rounded-full p-2 active:bg-surface-2"><IconChevronLeft /></button>}
        title="Workout Report"
      />
      {data && (
        <div className="px-4">
          <Heading title="Muscle strength" ranges={STRENGTH_RANGES} value={sRange} onChange={setSRange} />
          <Carousel label="Muscle strength">
            {SUBS.map((s) => <StrengthCard key={s.id} sub={s.id} data={data} range={sRange} />)}
          </Carousel>

          <Heading title="Muscle volume" ranges={VOLUME_RANGES} value={vRange} onChange={setVRange} />
          <Carousel label="Muscle volume">
            {SUBS.map((s) => <VolumeCard key={s.id} sub={s.id} data={data} range={vRange} units={settings.units} weekStart={settings.weekStart} />)}
          </Carousel>
        </div>
      )}
    </div>
  );
}

function Heading({ title, ranges, value, onChange }: { title: string; ranges: { id: Range; label: string }[]; value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="mt-4 mb-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div role="tablist" aria-label={`${title} range`} className="mt-2 flex gap-1 rounded-xl bg-surface p-1">
        {ranges.map((r) => (
          <button key={r.id} role="tab" aria-selected={r.id === value} onClick={() => onChange(r.id)}
            className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${r.id === value ? 'bg-surface-2 text-ink' : 'text-muted'}`}>{r.label}</button>
        ))}
      </div>
    </div>
  );
}

/** Swipeable row of full-width cards with page dots. */
function Carousel({ label, children }: { label: string; children: ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  return (
    <div role="region" aria-label={label}>
      <div ref={ref} onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto">
        {children.map((c, i) => <div key={i} className="w-full shrink-0 snap-center px-4">{c}</div>)}
      </div>
      <div className="mt-1 flex justify-center">
        {children.map((_, i) => (
          <button key={i} aria-label={`Card ${i + 1} of ${children.length}`} aria-current={i === page}
            onClick={() => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: 'smooth' })}
            className="flex h-11 min-w-7 items-center justify-center">
            <span className={`h-1.5 rounded-full transition-all ${i === page ? 'w-4 bg-ink' : 'w-1.5 bg-line'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Card({ title, value, badge, sub, fileName, children }: { title: string; value: ReactNode; badge?: ReactNode; sub: Sub; fileName: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const info = SUBS.find((s) => s.id === sub)!;
  const on = (m: Muscle) => info.muscles.includes(m);
  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl bg-surface p-4">
      <div className="pointer-events-none absolute top-10 -right-5 h-52 w-26 opacity-25">
        <BodyMap side={info.side} selected={null} pick={(ms) => ms.find(on) ?? ms[0]}
          colour={(m) => (on(m) ? ACCENT : 'var(--color-line)')} />
      </div>
      <div className="relative">
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">{APP_NAME}</p>
          <button data-noshare aria-label={`Share ${title} card`} disabled={busy}
            onClick={async () => { setBusy(true); try { await shareCardImage(ref.current!, fileName); } finally { setBusy(false); } }}
            className="tap -mt-1 -mr-1 rounded-full p-2 text-muted active:bg-surface-2 disabled:opacity-40"><IconUpload size={18} /></button>
        </div>
        <p className="text-2xl font-bold">{title}</p>
        <div className="mt-1 flex items-center gap-2">{value}{badge}</div>
        <div className="mt-3 h-40">{children}</div>
      </div>
    </div>
  );
}

const axisTick = { fill: MUTED, fontSize: 11 };
const tickDate = (range: Range) => (t: number) =>
  new Date(t).toLocaleDateString('en-AU', range === 'week' ? { weekday: 'short' } : range === 'month' ? { day: 'numeric', month: 'short' } : { month: 'short' });

function StrengthCard({ sub, data, range }: { sub: Sub; data: StrengthData; range: Range }) {
  const label = SUBS.find((s) => s.id === sub)!.label;
  const all = data.series.map((w) => ({ date: w.week, value: w.subs[sub] }));
  const from = rangeStart(range, Date.now());
  const pts = all.filter((p) => p.date >= from && p.value !== null);
  const now = all[all.length - 1].value;
  // Fit the y axis to the data (in steps of 10, within 0-100) so small changes are visible.
  const vals = pts.map((p) => p.value as number);
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 3) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...vals) + 3) / 10) * 10);
  const step = hi - lo > 40 ? 20 : hi - lo > 20 ? 10 : 5;
  const ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  return (
    <Card title={label} sub={sub} fileName={`${label} strength`}
      value={<span className="tabular text-4xl font-bold">{now ?? '–'}</span>}
      badge={<TrendBadge delta={trend(all.map((p) => p.value))} />}>
      {pts.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pts} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={LINE} strokeOpacity={0.6} />
            <XAxis dataKey="date" type="number" scale="time" domain={[from, Date.now()]} tickFormatter={tickDate(range)}
              tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis domain={[lo, hi]} ticks={ticks} tick={axisTick} axisLine={false} tickLine={false} width={36} />
            <Tooltip cursor={{ stroke: MUTED, strokeDasharray: '3 3' }} isAnimationActive={false} content={({ active, payload }) => {
              const p = active && (payload?.[0]?.payload as { date: number; value: number } | undefined);
              return p ? <Tip label={`Week of ${new Date(p.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`} value={`${p.value}`} /> : null;
            }} />
            <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} isAnimationActive={false}
              dot={pts.length <= 12 ? { r: 4, fill: ACCENT, stroke: 'var(--color-surface)', strokeWidth: 2 } : false}
              activeDot={{ r: 5, fill: ACCENT, stroke: 'var(--color-surface)', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : <Empty text="No score yet. It appears once you've trained this muscle for a full week." />}
    </Card>
  );
}

function VolumeCard({ sub, data, range, units, weekStart }: { sub: Sub; data: StrengthData; range: Range; units: Units; weekStart: 0 | 1 }) {
  const label = SUBS.find((s) => s.id === sub)!.label;
  const now = Date.now();
  // Week: daily bars. Month: weekly bars. 6 Months / Year: monthly bars.
  const bucketStart = (t: number) => {
    if (range === 'week') return startOfDay(t);
    if (range === 'month') return startOfWeek(t, weekStart);
    const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  };
  const next = (t: number) => (range === 'week' ? addDays(t, 1) : range === 'month' ? addDays(t, 7) : new Date(new Date(t).getFullYear(), new Date(t).getMonth() + 1, 1).getTime());
  const from = range === 'week' ? addDays(startOfDay(now), -6) : bucketStart(rangeStart(range, now));
  const buckets = bucketVolume(data.sets, data.exercises, sub, (t) => (t >= from && t <= now ? bucketStart(t) : null));
  const bars: { date: number; value: number }[] = [];
  for (let b = from; b <= now; b = next(b)) bars.push({ date: b, value: toDisplay(buckets.get(b) ?? 0, units) });
  const totalKg = [...buckets.values()].reduce((a, b) => a + b, 0);
  return (
    <Card title={label} sub={sub} fileName={`${label} volume`}
      value={<span className="tabular text-4xl font-bold">{fmtBigWeight(totalKg, units)}</span>}>
      {totalKg > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bars} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
            <CartesianGrid vertical={false} stroke={LINE} strokeOpacity={0.6} />
            <XAxis dataKey="date" tickFormatter={tickDate(range === 'month' ? 'month' : range)} tick={axisTick} axisLine={false} tickLine={false} minTickGap={8} interval="preserveStartEnd" />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${v}`)} />
            <Tooltip cursor={{ fill: 'var(--color-surface-2)' }} isAnimationActive={false} content={({ active, payload }) => {
              const p = active && (payload?.[0]?.payload as { date: number; value: number } | undefined);
              return p ? <Tip label={tickDate(range === 'month' ? 'month' : range)(p.date)} value={`${Math.round(p.value).toLocaleString('en-AU')} ${units}`} /> : null;
            }} />
            <Bar dataKey="value" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      ) : <Empty text="No volume in this range." />}
    </Card>
  );
}

function Tip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs shadow-lg ring-1 ring-line">
      <p className="text-muted">{label}</p>
      <p className="tabular font-semibold">{value}</p>
    </div>
  );
}

const Empty = ({ text }: { text: string }) => <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">{text}</p>;
