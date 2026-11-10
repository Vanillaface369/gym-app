// Editing today's planned sets before a workout starts (Workout tab). Pure, so it's easy to test.

export interface PlanSet { reps: number; weightKg: number }

/**
 * Change one set. Later sets that had the same old value (or no weight yet) follow, so you type a weight once,
 * the same way the logging screen works. Returns a new array.
 */
export function editPlanSet(sets: PlanSet[], i: number, patch: Partial<PlanSet>): PlanSet[] {
  const out = sets.map((s) => ({ ...s }));
  const s = out[i];
  if (!s) return out;
  for (const k of ['reps', 'weightKg'] as const) {
    const v = patch[k];
    if (v === undefined) continue;
    const old = s[k];
    s[k] = v;
    for (const later of out.slice(i + 1)) if (later[k] === old || (k === 'weightKg' && later[k] === 0)) later[k] = v;
  }
  return out;
}

/** Add a set that copies the last one (or a sensible default). */
export function addPlanSet(sets: PlanSet[], fallbackReps = 10): PlanSet[] {
  const last = sets[sets.length - 1];
  return [...sets.map((s) => ({ ...s })), { reps: last?.reps ?? fallbackReps, weightKg: last?.weightKg ?? 0 }];
}

/** Same sets as planned? (Used to tell whether an edit is worth keeping.) */
export function samePlan(a: PlanSet[], b: PlanSet[]): boolean {
  return a.length === b.length && a.every((s, i) => s.reps === b[i].reps && Math.abs(s.weightKg - b[i].weightKg) < 1e-6);
}
