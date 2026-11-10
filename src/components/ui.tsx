import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Category, Exercise } from '../db/types';
import { IconChevronLeft, IconX } from './icons';
import { muscleIconView } from '../features/body/muscleIcon';

/** Moves focus into an open dialog and puts it back where it was on close. */
function useDialogFocus(open: boolean) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    return () => { before?.focus?.({ preventScroll: true }); };
  }, [open]);
  return panel;
}

export function Sheet({ open, onClose, title, children, tall, onBack }: {
  open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; tall?: boolean;
  /** Shows a back arrow before the title (for sub-views inside one sheet). */
  onBack?: () => void;
}) {
  const titleId = useId();
  const panel = useDialogFocus(open);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && (onBack ?? onClose)();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose, onBack]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby={title !== undefined ? titleId : undefined}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={panel} tabIndex={-1} className={`sheet-in relative w-full max-w-lg rounded-t-3xl bg-surface pb-safe outline-none ${tall ? 'h-[88vh]' : 'max-h-[88vh]'} flex flex-col`}>
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
        {title !== undefined && (
          <div className="flex items-center gap-1 px-5 pt-2 pb-1">
            {onBack && <IconButton label="Back" onClick={onBack} className="-ml-3"><IconChevronLeft /></IconButton>}
            <h2 id={titleId} className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h2>
            <IconButton label="Close" onClick={onClose} className="-mr-3"><IconX /></IconButton>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ open, title, body, confirmLabel = 'Confirm', danger, onConfirm, onCancel }: {
  open: boolean; title: string; body?: ReactNode; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const panel = useDialogFocus(open);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={body ? bodyId : undefined}>
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div ref={panel} tabIndex={-1} className="relative w-full max-w-sm rounded-2xl bg-surface p-5 outline-none">
        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        {body && <div id={bodyId} className="mt-2 text-sm text-muted">{body}</div>}
        <div className="mt-5 flex gap-3">
          <button className="min-h-12 flex-1 rounded-xl bg-surface-2 font-medium" onClick={onCancel}>Cancel</button>
          <button
            className={`min-h-12 flex-1 rounded-xl font-semibold ${danger ? 'bg-danger text-white' : 'bg-accent text-accent-ink'}`}
            onClick={onConfirm}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/** Round icon-only button with a 44px hit area. */
export function IconButton({ label, onClick, children, className = '', tone = 'muted', disabled }: {
  label: string; onClick?: () => void; children: ReactNode; className?: string; tone?: 'muted' | 'ink' | 'danger'; disabled?: boolean;
}) {
  const colour = tone === 'ink' ? 'text-ink' : tone === 'danger' ? 'text-danger' : 'text-muted';
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
      className={`tap rounded-full ${colour} active:bg-surface-2 disabled:opacity-30 ${className}`}>{children}</button>
  );
}

/** Tappable chips are filled and 44px tall; static info chips (no onClick) are outlined so they don't read as buttons. */
export function Chip({ children, onClick, active, className = '' }: { children: ReactNode; onClick?: () => void; active?: boolean; className?: string }) {
  const base = 'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium';
  if (!onClick) return <span className={`${base} py-1.5 text-muted ring-1 ring-line ring-inset ${className}`}>{children}</span>;
  return <button className={`${base} min-h-11 ${active ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink'} active:opacity-70 ${className}`} onClick={onClick}>{children}</button>;
}

export function PrimaryButton({ children, onClick, className = '', disabled }: { children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl bg-accent px-5 py-4 text-base font-bold text-accent-ink shadow-lg shadow-black/40 active:scale-[0.98] disabled:opacity-40 ${className}`}
    >{children}</button>
  );
}

export function SheetRow({ icon, label, sub, onClick, danger, disabled }: { icon?: ReactNode; label: ReactNode; sub?: ReactNode; onClick?: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className={`flex w-full items-center gap-4 rounded-xl px-2 py-3.5 text-left active:bg-surface-2 disabled:opacity-40 ${danger ? 'text-danger' : ''}`}>
      {icon && <span className={danger ? '' : 'text-muted'}>{icon}</span>}
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {sub && <span className="block text-sm text-muted">{sub}</span>}
      </span>
    </button>
  );
}

export const CATEGORY_COLOUR: Record<Category, string> = {
  push: 'var(--color-push)', pull: 'var(--color-pull)', legs: 'var(--color-legs)', core: 'var(--color-core)', other: 'var(--color-muted)',
};

/** Thumbnail: a crop of the body map with the exercise's main muscles lit in its category colour (initials if it has no muscles). */
export function ExerciseThumb({ ex, size = 48, done }: { ex?: Exercise; size?: number; done?: boolean }) {
  const colour = CATEGORY_COLOUR[ex?.category ?? 'other'];
  const view = ex ? muscleIconView(ex.primaryMuscles, ex.secondaryMuscles) : null;
  const initials = (ex?.name ?? '?').split(/[\s-]+/).filter((w) => /[A-Za-z]/.test(w[0] ?? '')).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl text-sm font-bold"
        style={{ background: `color-mix(in srgb, ${colour} 14%, var(--color-surface-2))`, color: colour }}
      >
        {view ? (
          <svg viewBox={view.viewBox} className="h-full w-full" aria-hidden="true">
            <path d={view.figure.body} fill="var(--color-body)" />
            {view.figure.regions.map((r) => {
              const lit = r.muscles.some((m) => ex!.primaryMuscles.includes(m)) ? 1
                : r.muscles.some((m) => ex!.secondaryMuscles.includes(m)) ? 0.4 : 0;
              return <path key={r.muscles.join()} d={r.d}
                fill={lit ? colour : 'color-mix(in srgb, var(--color-body) 80%, var(--color-ink))'} fillOpacity={lit || 1} />;
            })}
          </svg>
        ) : initials}
      </div>
      {done && (
        <span className="absolute -right-1.5 -bottom-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-ink ring-2 ring-bg">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
      )}
    </div>
  );
}

export function PageHeader({ left, title, right }: { left?: ReactNode; title?: ReactNode; right?: ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-30 bg-bg/95 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex min-w-10 items-center">{left}</div>
        <div className="flex-1 truncate text-center font-semibold">{title}</div>
        <div className="flex min-w-10 items-center justify-end">{right}</div>
      </div>
    </header>
  );
}

export function NumberField({ value, onChange, ariaLabel, step = 1, highlight, done, placeholder, compact }: {
  value: number | ''; onChange: (n: number) => void; ariaLabel: string; step?: number; highlight?: boolean; done?: boolean; placeholder?: string;
  /** Smaller text for settings rows; still 44px tall. */
  compact?: boolean;
}) {
  // Local text while focused: the store updates asynchronously, so a controlled value would drop keystrokes.
  const [text, setText] = useState<string | null>(null);
  return (
    <input
      type="text"
      inputMode="decimal"
      data-step={step}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={text ?? String(value)}
      onFocus={(e) => { setText(String(value)); const el = e.currentTarget; requestAnimationFrame(() => el.select()); }}
      onBlur={() => setText(null)}
      onChange={(e) => {
        const raw = e.target.value.replace(',', '.');
        if (!/^\d*\.?\d*$/.test(raw)) return;
        setText(raw);
        const n = parseFloat(raw);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      className={`tabular w-full rounded-xl px-3 text-center outline-none focus:ring-2 focus:ring-accent ${compact ? 'min-h-11 py-2 text-base font-medium' : 'py-3 text-lg font-semibold'}
        ${done ? 'bg-accent/15 text-accent' : highlight ? 'bg-surface-2 ring-1 ring-accent/60' : 'bg-surface-2'}`}
    />
  );
}
