// Settings-style form pieces shared by Settings and My Plan.
import type { ReactNode } from 'react';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted uppercase">{title}</h2>
      <div className="divide-y divide-line rounded-2xl bg-surface px-3">{children}</div>
    </section>
  );
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 py-2">
      <div>
        <p>{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function ActionRow({ icon, label, hint, onClick, danger, disabled }: { icon: ReactNode; label: string; hint?: string; onClick?: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className={`flex min-h-14 w-full items-center gap-3 py-2 text-left disabled:opacity-40 ${danger ? 'text-danger' : ''}`}>
      <span className={danger ? '' : 'text-muted'}>{icon}</span>
      <span>
        <span className="block">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </button>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    // The visible track is 28px; the button around it gives a 44px hit area.
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="-my-2 flex h-11 w-14 shrink-0 items-center justify-end">
      <span className={`relative h-7 w-12 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-surface-2 ring-1 ring-line ring-inset'}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${on ? 'left-[1.375rem]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg bg-surface-2 p-0.5">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`min-h-10 rounded-md px-3.5 text-sm font-medium ${value === v ? 'bg-accent text-accent-ink' : 'text-muted'}`}>{label}</button>
      ))}
    </div>
  );
}

/** Rounded on/off chip for multi-select lists (muscles, equipment). `soft` = a weaker "on" (e.g. helper muscles). */
export function ToggleChip({ on, onClick, children, soft }: { on: boolean; onClick: () => void; children: ReactNode; soft?: boolean }) {
  const onCls = soft ? 'bg-accent/20 text-accent ring-1 ring-accent/50 ring-inset' : 'bg-accent text-accent-ink';
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={onClick}
      className={`min-h-10 rounded-full px-3.5 text-sm font-medium ${on ? onCls : 'bg-surface-2 text-muted'}`}>{children}</button>
  );
}

/** − value + stepper. */
export function Stepper({ value, label, onChange, min, max, step = 1 }: { value: number; label: string; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Less" disabled={value <= min} className="h-11 w-11 rounded-xl bg-surface-2 text-lg disabled:opacity-40" onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <span className="tabular min-w-14 text-center">{label}</span>
      <button type="button" aria-label="More" disabled={value >= max} className="h-11 w-11 rounded-xl bg-surface-2 text-lg disabled:opacity-40" onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </div>
  );
}
