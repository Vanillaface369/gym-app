export const MUSCLES = [
  'chest', 'front_delts', 'side_delts', 'rear_delts', 'triceps', 'biceps', 'forearms',
  'lats', 'upper_back', 'traps', 'lower_back', 'abs', 'obliques', 'glutes', 'quads',
  'hamstrings', 'adductors', 'abductors', 'calves',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const EQUIPMENT = [
  'barbell', 'ez_bar', 'dumbbell', 'cable', 'machine', 'plate_loaded', 'bench',
  'preacher_bench', 'back_extension_bench', 'assisted_machine', 'pull_up_bar', 'bodyweight',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export type Category = 'push' | 'pull' | 'legs' | 'core' | 'other';
export type SplitDay = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'custom';
export type Units = 'kg' | 'lb';

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  equipment: Equipment[];
  isBodyweight: boolean;
  defaultRestSec: number;
  howToNotes?: string;
  howToUrl?: string;
  preference: -1 | 0 | 1;
  isCustom: boolean;
  archived: boolean;
  /** Times used (seeded from Fitbod history, incremented on each finished workout). */
  useCount: number;
  /** Rep range for progression. Missing = the goal's default (8-12 for Build Muscle). */
  repMin?: number;
  repMax?: number;
}

export interface TemplateItem {
  exerciseId: string;
  sets: number;
  targetReps: number;
  targetWeightKg: number | null;
  restSec: number;
  maxEffort?: boolean;
  order: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  splitDay?: SplitDay;
  items: TemplateItem[];
}

export interface WorkoutSession {
  id: string;
  name: string;
  templateId?: string;
  splitDay?: SplitDay;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  gymProfileId?: string;
  caloriesEst: number;
  volumeKg: number;
  recordsCount: number;
  /** Exercise order as performed. */
  exerciseOrder: string[];
  notes?: string;
}

export interface SetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  reps: number;
  weightKg: number;
  isWarmup: boolean;
  completedAt: number;
  e1rm: number;
}

export type RecordType = 'weight' | 'e1rm' | 'reps' | 'volume';
export interface PersonalRecord {
  id: string;
  exerciseId: string;
  type: RecordType;
  value: number;
  /** For 'reps' records: the weight the reps were done at. */
  weightKg?: number;
  /** The best it beat. Missing on a first-ever baseline, which isn't celebrated. */
  previous?: number;
  /** Missing on seeded records (carried over from before this app). */
  sessionId?: string;
  date: number;
}

export interface GymProfile {
  id: string;
  name: string;
  equipment: Equipment[];
  bodyweightOnly: boolean;
}

export interface Settings {
  id: 'settings';
  name: string;
  units: Units;
  weekStart: 0 | 1; // 0 = Sunday, 1 = Monday
  goal: string;
  experience: 'beginner' | 'intermediate' | 'advanced';
  workoutsPerWeek: number;
  durationMin: number;
  split: 'ppl' | 'upper_lower' | 'full' | 'custom';
  variability: 'low' | 'balanced' | 'high';
  warmups: boolean;
  supersets: boolean;
  weeklySetTargets: { push: number; pull: number; legs: number };
  bodyweightKg: number;
  heightCm?: number;
  age?: number;
  sex?: 'male' | 'female' | 'other';
  restDefaultSec: number;
  sound: boolean;
  vibration: boolean;
  keepScreenOn: boolean;
  activeGymProfileId: string;
  /** Template picked via Switch; cleared after a workout is finished. */
  selectedTemplateId?: string;
  /** My Plan: free-text injuries/limitations, and muscles generated workouts should avoid. */
  injuryNotes?: string;
  avoidMuscles?: Muscle[];
  /** Weight steps for progression, per kind of equipment. Missing = defaults (see lib/progression). */
  weightSteps?: Partial<Record<'dumbbell' | 'cable_machine' | 'barbell' | 'plate_loaded', number>>;
  /** A generated workout the user picked or edited (selectedTemplateId === 'generated'). */
  generated?: WorkoutTemplate;
  /** Exercises pinned as benchmark lifts on Body > Results. Unset = the most-used exercises. */
  benchmarkIds?: string[];
  /** Lifetime totals carried over from before this app (milestones). */
  lifetimeOffset: { workouts: number; volumeKg: number; calories: number };
  /**
   * Sets edited on the Workout tab for the next workout of one template, keyed `${exerciseId}-${order}`.
   * Used when that workout starts, then cleared, so progression works as usual next time.
   */
  planEdits?: { templateId: string; items: Record<string, { reps: number; weightKg: number }[]> };
}

export interface RecoveryOverride {
  muscle: Muscle;
  percent: number;
  setAt: number;
}

// ---- In-progress workout (persisted so a reload or app kill doesn't lose it) ----
export interface ActiveSet {
  reps: number;
  weightKg: number;
  done: boolean;
  completedAt?: number;
  isWarmup: boolean;
}
export interface ActiveItem {
  key: string;
  exerciseId: string;
  restSec: number;
  maxEffort?: boolean;
  /** What progression suggested for this session (shown as e.g. "↑ +2.5 kg", "+1 rep"). */
  progress?: { kind: 'up' | 'reps' | 'deload'; deltaKg?: number };
  /** The sets were changed by hand on the Workout tab before starting (progression no longer applies). */
  edited?: boolean;
  sets: ActiveSet[];
}
export interface RestTimer {
  /** When this rest began; a new value means a new rest (used to pop the timer sheet open). */
  startedAt: number;
  /** Total length, for the progress ring. */
  durationMs: number;
  /** When running: the timestamp it hits zero. */
  endsAt: number | null;
  /** When paused: the time left. */
  pausedRemainingMs: number | null;
  itemKey: string;
}
export interface ActiveWorkout {
  id: 'current';
  name: string;
  templateId?: string;
  splitDay?: SplitDay;
  startedAt: number;
  items: ActiveItem[];
  rest: RestTimer | null;
}
