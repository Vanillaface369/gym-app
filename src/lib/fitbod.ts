// Fitbod CSV export parsing (SPEC 6). Pure functions, so they're easy to test against a real export later.
//
// Fitbod's export is one row per set, usually with columns like:
//   Date, Exercise, Reps, Weight(kg), Duration(s), Distance(m), Incline, Resistance, isWarmup, Note, multiplier
// Column names are matched loosely (case, spaces, units) because the exact layout can't be checked until the user's file arrives.

const LB_PER_KG = 2.20462;

/** Minimal RFC 4180 CSV parser: quoted fields, escaped quotes, commas and newlines inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export interface Columns { date: number; exercise: number; reps: number; weight: number; weightUnit: 'kg' | 'lb'; warmup: number; multiplier: number }

/** Find the columns we need. Throws a readable error when the file doesn't look like a Fitbod export. */
export function findColumns(header: string[]): Columns {
  const h = header.map(norm);
  const find = (...names: string[]) => h.findIndex((x) => names.some((n) => x === n || x.startsWith(n)));
  const date = find('date', 'workoutdate', 'time');
  const exercise = find('exercise', 'exercisename', 'movement');
  const reps = find('reps', 'rep');
  const weight = find('weightkg', 'weightlbs', 'weightlb', 'weight');
  const missing = [['Date', date], ['Exercise', exercise], ['Reps', reps], ['Weight', weight]].filter(([, i]) => i === -1).map(([n]) => n);
  if (missing.length) throw new Error(`This doesn't look like a Fitbod export: no ${missing.join(', ')} column.`);
  return { date, exercise, reps, weight, weightUnit: /lb/.test(h[weight]) ? 'lb' : 'kg', warmup: find('iswarmup', 'warmup'), multiplier: find('multiplier') };
}

/** Fitbod dates look like "2024-03-05 18:22:31 +0000"; also accepts ISO and plain dates. */
export function parseDate(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const m = t.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$/);
  if (m) {
    const tz = m[3] ? (m[3] === 'Z' ? 'Z' : m[3].replace(/^([+-]\d{2})(\d{2})$/, '$1:$2')) : '';
    const ms = Date.parse(`${m[1]}T${m[2].length === 5 ? m[2] + ':00' : m[2]}${tz}`);
    return Number.isNaN(ms) ? null : ms;
  }
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? null : ms;
}

export interface FitbodSet { at: number; exercise: string; reps: number; weightKg: number; isWarmup: boolean }
export interface ParseResult { sets: FitbodSet[]; skipped: number }

/** Rows to sets. Rows with no reps (cardio, timed holds) or an unreadable date are skipped and counted. */
export function parseFitbod(text: string): ParseResult {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('The file is empty.');
  const c = findColumns(rows[0]);
  const sets: FitbodSet[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const at = parseDate(r[c.date] ?? '');
    const exercise = (r[c.exercise] ?? '').trim();
    const reps = Math.round(parseFloat(r[c.reps] ?? '') || 0);
    let w = parseFloat(r[c.weight] ?? '') || 0;
    if (c.weightUnit === 'lb') w /= LB_PER_KG;
    // Fitbod's "multiplier" is 2 for per-hand dumbbell weights in some exports; the weight column is already per hand, so it's ignored.
    if (at === null || !exercise || reps <= 0) { skipped++; continue; }
    const wu = c.warmup >= 0 ? (r[c.warmup] ?? '').trim().toLowerCase() : '';
    sets.push({ at, exercise, reps, weightKg: Math.round(Math.max(0, w) * 100) / 100, isWarmup: wu === 'true' || wu === '1' || wu === 'yes' });
  }
  return { sets, skipped };
}

export interface FitbodWorkout { start: number; end: number; durationSec: number; sets: FitbodSet[] }

/**
 * Group sets into workouts: sorted by time, a new workout starts after a gap of more than 3 hours.
 * Duration is first-to-last set plus a couple of minutes; if every set shares one timestamp (some exports stamp the
 * workout, not the set), it's estimated at 3 minutes per set, between 20 and 120 minutes.
 */
export function groupWorkouts(sets: FitbodSet[]): FitbodWorkout[] {
  const sorted = [...sets].sort((a, b) => a.at - b.at);
  const out: FitbodWorkout[] = [];
  for (const s of sorted) {
    const cur = out[out.length - 1];
    if (cur && s.at - cur.end <= 3 * 3600_000) { cur.sets.push(s); cur.end = s.at; }
    else out.push({ start: s.at, end: s.at, durationSec: 0, sets: [s] });
  }
  for (const w of out) {
    const span = (w.end - w.start) / 1000;
    w.durationSec = span >= 600 ? Math.round(span + 120) : Math.round(Math.min(120, Math.max(20, w.sets.length * 3)) * 60);
  }
  return out;
}

// ---- Exercise name matching ----
const STOP = new Set(['the', 'a', 'with', 'on', 'and', 'machine']);
function tokens(name: string): string[] {
  return name.toLowerCase()
    .replace(/dumbbells?/g, 'dumbbell').replace(/\bdb\b/g, 'dumbbell').replace(/\bbb\b/g, 'barbell')
    .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .map((t) => (t.length > 4 && /(ss|sh|ch|x)es$/.test(t) ? t.slice(0, -2) : t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t))
    .filter((t) => t && !STOP.has(t));
}

/** Similarity 0-1 between two exercise names: exact (ignoring case and punctuation) = 1, otherwise shared words. */
export function nameScore(a: string, b: string): number {
  if (norm(a) === norm(b)) return 1;
  const ta = new Set(tokens(a)), tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return (2 * shared) / (ta.size + tb.size); // Dice coefficient
}

export const AUTO_MATCH = 0.8;

/** Best match for a Fitbod name among the user's exercises; `id` is null when nothing is close enough. */
export function matchExercise(name: string, exercises: { id: string; name: string }[]): { id: string | null; score: number } {
  let best: { id: string | null; score: number } = { id: null, score: 0 };
  for (const e of exercises) {
    const s = nameScore(name, e.name);
    if (s > best.score) best = { id: e.id, score: s };
  }
  return best.score >= AUTO_MATCH ? best : { id: null, score: best.score };
}

/** Local calendar day "yyyy-mm-dd". */
export const dayOf = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---- Keeping lifetime totals and records in line with Fitbod ----

/**
 * The app estimates calories from bodyweight and duration, which runs higher than Fitbod's own numbers. When the
 * estimates for imported workouts add up to more than Fitbod's lifetime calories (`budget`), scale them down so the
 * lifetime total stays at Fitbod's figure. With no budget left (e.g. a second import), estimates are kept as they are.
 */
export function scaleCalories(estimates: number[], budget: number): number[] {
  const total = estimates.reduce((a, b) => a + b, 0);
  if (budget <= 0 || total <= budget) return estimates;
  const f = budget / total;
  const out = estimates.map((c) => Math.round(c * f));
  // Put any rounding difference on the largest workout so the total lands exactly on the budget.
  const diff = Math.round(budget) - out.reduce((a, b) => a + b, 0);
  if (diff) { const i = out.indexOf(Math.max(...out)); out[i] = Math.max(0, out[i] + diff); }
  return out;
}

export interface SeededRecord { id: string; exerciseId: string; type: string; value: number }
export interface ImportedSet { exerciseId: string; weightKg: number; e1rm: number; isWarmup: boolean }

/**
 * Carried-over (seeded) records to drop after an import: those the imported sets match or beat. A seeded best that the
 * file never reaches (e.g. Fitbod's 90.7 kg Lat Pulldown e1RM) is kept, so the PR doesn't go backwards.
 */
export function seededToDrop(seeded: SeededRecord[], sets: ImportedSet[]): SeededRecord[] {
  const best = (exerciseId: string, type: string) => {
    const work = sets.filter((s) => s.exerciseId === exerciseId && !s.isWarmup);
    if (type === 'e1rm') return Math.max(-Infinity, ...work.map((s) => s.e1rm));
    if (type === 'weight') return Math.max(-Infinity, ...work.map((s) => s.weightKg));
    return Infinity; // other record types aren't seeded; replace them with real data
  };
  return seeded.filter((r) => r.value <= best(r.exerciseId, r.type));
}
