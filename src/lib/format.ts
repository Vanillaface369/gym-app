import type { Units } from '../db/types';
import { LB_PER_KG } from '../db/seed';

/** Weight stored in kg -> number in the display unit (1 decimal max). */
export function toDisplay(kg: number, units: Units): number {
  const v = units === 'lb' ? kg * LB_PER_KG : kg;
  return Math.round(v * 10) / 10;
}

/** Number typed in the display unit -> kg for storage. */
export function fromDisplay(value: number, units: Units): number {
  return units === 'lb' ? value / LB_PER_KG : value;
}

export function fmtWeight(kg: number | null | undefined, units: Units): string {
  if (kg === null || kg === undefined) return `– ${units}`;
  return `${toDisplay(kg, units)} ${units}`;
}

export function fmtBigWeight(kg: number, units: Units): string {
  return `${Math.round(units === 'lb' ? kg * LB_PER_KG : kg).toLocaleString('en-AU')} ${units}`;
}

/** 75 -> "1:15" */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** 3900 -> "1 hr 5 min" */
export function fmtDuration(totalSec: number): string {
  const m = Math.round(totalSec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}

/** Australian date, e.g. "Tue 10 Nov 2026" */
export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** dd/mm/yyyy */
export function fmtShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(ts: number, now = Date.now()): string {
  const h = (now - ts) / 3_600_000;
  if (h < 1) return 'just now';
  if (h < 24) return `${Math.floor(h)} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export const MUSCLE_LABEL: Record<string, string> = {
  chest: 'Chest', front_delts: 'Front delts', side_delts: 'Side delts', rear_delts: 'Rear delts',
  triceps: 'Triceps', biceps: 'Biceps', forearms: 'Forearms', lats: 'Lats', upper_back: 'Upper back',
  traps: 'Traps', lower_back: 'Lower back', abs: 'Abs', obliques: 'Obliques', glutes: 'Glutes',
  quads: 'Quads', hamstrings: 'Hamstrings', adductors: 'Adductors', abductors: 'Abductors', calves: 'Calves',
};

/** Short unique id; works on plain http (crypto.randomUUID needs a secure context). */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export const EQUIPMENT_LABEL: Record<string, string> = {
  barbell: 'Barbell', ez_bar: 'EZ bar', dumbbell: 'Dumbbells', cable: 'Cables', machine: 'Machines', plate_loaded: 'Plate-loaded',
  bench: 'Bench', preacher_bench: 'Preacher bench', back_extension_bench: 'Back extension bench', assisted_machine: 'Assisted machine',
  pull_up_bar: 'Pull-up bar', bodyweight: 'Bodyweight',
};

/** "↑ +2.5 kg", "+1 rep" or "−10% lighter", in the user's units. */
export function fmtProgress(p: { kind: 'up' | 'reps' | 'deload'; deltaKg?: number } | undefined, units: Units): string | null {
  if (!p) return null;
  if (p.kind === 'up') return `↑ +${toDisplay(p.deltaKg ?? 0, units)} ${units}`;
  if (p.kind === 'deload') return '−10% lighter';
  return '+1 rep';
}
