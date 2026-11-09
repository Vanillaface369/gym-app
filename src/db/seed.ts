import type { Category, Equipment, Exercise, Muscle, Settings, WorkoutTemplate, PersonalRecord, GymProfile } from './types';

type Row = [name: string, uses: number, cat: Category, primary: Muscle[], secondary: Muscle[], equip: Equipment[], compound?: boolean];

// Your exercise list (SPEC section 7). Secondary muscles filled in sensibly.
const ROWS: Row[] = [
  ['Cable Tricep Pushdown', 82, 'push', ['triceps'], [], ['cable']],
  ['Cable Row', 64, 'pull', ['upper_back', 'lats'], ['biceps', 'rear_delts'], ['cable'], true],
  ['Lat Pulldown', 63, 'pull', ['lats'], ['biceps', 'upper_back'], ['cable'], true],
  ['Single Arm Preacher Curl', 58, 'pull', ['biceps'], ['forearms'], ['dumbbell', 'preacher_bench']],
  ['Dumbbell Bench Press', 53, 'push', ['chest'], ['front_delts', 'triceps'], ['dumbbell', 'bench'], true],
  ['Dumbbell Lateral Raise', 46, 'push', ['side_delts'], [], ['dumbbell']],
  ['Incline Dumbbell Curl', 44, 'pull', ['biceps'], ['forearms'], ['dumbbell', 'bench']],
  ['Dumbbell Skullcrusher', 39, 'push', ['triceps'], [], ['dumbbell', 'bench']],
  ['Seated Dumbbell Curl', 36, 'pull', ['biceps'], ['forearms'], ['dumbbell', 'bench']],
  ['Hammerstrength Iso Row', 33, 'pull', ['upper_back', 'lats'], ['biceps', 'rear_delts'], ['plate_loaded'], true],
  ['Machine Fly', 33, 'push', ['chest'], ['front_delts'], ['machine']],
  ['Seated Leg Curl', 32, 'legs', ['hamstrings'], ['calves'], ['machine']],
  ['Hammerstrength Shoulder Press', 31, 'push', ['front_delts'], ['side_delts', 'triceps'], ['plate_loaded'], true],
  ['Leg Extension', 31, 'legs', ['quads'], [], ['machine']],
  ['Dumbbell Lunge', 30, 'legs', ['quads', 'glutes'], ['hamstrings', 'adductors'], ['dumbbell'], true],
  ['Hammerstrength Chest Press', 30, 'push', ['chest'], ['front_delts', 'triceps'], ['plate_loaded'], true],
  ['Leg Press', 25, 'legs', ['quads', 'glutes'], ['hamstrings', 'adductors'], ['machine'], true],
  ['Calf Raise', 20, 'legs', ['calves'], [], ['machine']],
  ['Barbell Curl', 17, 'pull', ['biceps'], ['forearms'], ['barbell']],
  ['Cable Face Pull', 17, 'pull', ['rear_delts', 'upper_back'], ['traps'], ['cable']],
  ['Dumbbell Incline Bench Press', 16, 'push', ['chest', 'front_delts'], ['triceps'], ['dumbbell', 'bench'], true],
  ['Machine Bench Press', 16, 'push', ['chest'], ['front_delts', 'triceps'], ['machine'], true],
  ['Machine Shoulder Press', 13, 'push', ['front_delts'], ['side_delts', 'triceps'], ['machine'], true],
  ['Hammer Curls', 12, 'pull', ['biceps', 'forearms'], [], ['dumbbell']],
  ['Crunches', 11, 'core', ['abs'], ['obliques'], ['bodyweight']],
  ['Cable Lateral Raise', 9, 'push', ['side_delts'], [], ['cable']],
  ['Back Extensions', 7, 'pull', ['lower_back', 'glutes'], ['hamstrings'], ['back_extension_bench']],
  ['Preacher Curl', 6, 'pull', ['biceps'], ['forearms'], ['ez_bar', 'preacher_bench']],
  ['Assisted Pull Up', 5, 'pull', ['lats'], ['biceps', 'upper_back'], ['assisted_machine'], true],
  // Less-used (1-2 uses)
  ['Concentration Curl', 2, 'pull', ['biceps'], [], ['dumbbell', 'bench']],
  ['Dumbbell Bent Over Row', 2, 'pull', ['upper_back', 'lats'], ['biceps', 'rear_delts', 'lower_back'], ['dumbbell'], true],
  ['Dumbbell Walking Lunge', 2, 'legs', ['quads', 'glutes'], ['hamstrings', 'adductors'], ['dumbbell'], true],
  ['Hip Thrust', 2, 'legs', ['glutes'], ['hamstrings'], ['barbell', 'bench'], true],
  ['Plank', 2, 'core', ['abs'], ['obliques'], ['bodyweight']],
  ['Sit Up', 1, 'core', ['abs'], ['obliques'], ['bodyweight']],
  ['Standing Dumbbell Calf Raise', 1, 'legs', ['calves'], [], ['dumbbell']],
  ['Arnold Dumbbell Press', 1, 'push', ['front_delts'], ['side_delts', 'triceps'], ['dumbbell', 'bench'], true],
  ['Cable Bicep Curl', 1, 'pull', ['biceps'], ['forearms'], ['cable']],
  ['Cable Rope Overhead Triceps Extension', 1, 'push', ['triceps'], [], ['cable']],
  ['Dumbbell Fly', 1, 'push', ['chest'], ['front_delts'], ['dumbbell', 'bench']],
  ['Dumbbell Front Raise', 1, 'push', ['front_delts'], ['side_delts'], ['dumbbell']],
  ['Dumbbell Romanian Deadlift', 1, 'legs', ['hamstrings', 'glutes'], ['lower_back'], ['dumbbell'], true],
  ['Dumbbell Shrug', 1, 'pull', ['traps'], ['forearms'], ['dumbbell']],
  ['Dumbbell Squat', 1, 'legs', ['quads', 'glutes'], ['hamstrings', 'adductors'], ['dumbbell'], true],
  ['Dumbbell Standing Front Press', 1, 'push', ['front_delts'], ['side_delts', 'triceps'], ['dumbbell'], true],
  ['EZ-Bar Curl', 1, 'pull', ['biceps'], ['forearms'], ['ez_bar']],
  ['Hanging Knee Raise', 1, 'core', ['abs'], ['obliques'], ['pull_up_bar']],
  ['Lying Hamstrings Curl', 1, 'legs', ['hamstrings'], ['calves'], ['machine']],
  ['Machine Rear Delt Fly', 1, 'pull', ['rear_delts'], ['upper_back'], ['machine']],
  ['Push Up', 1, 'push', ['chest'], ['front_delts', 'triceps'], ['bodyweight'], true],
  ['Single Arm Dumbbell Tricep Extension', 1, 'push', ['triceps'], [], ['dumbbell']],
  ['Waiter Curls', 1, 'pull', ['biceps'], ['forearms'], ['dumbbell']],
];

export const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const seedExercises: Exercise[] = ROWS.map(([name, uses, category, primaryMuscles, secondaryMuscles, equipment, compound]) => ({
  id: slug(name),
  name,
  category,
  primaryMuscles,
  secondaryMuscles,
  equipment,
  isBodyweight: equipment.includes('bodyweight'),
  defaultRestSec: compound ? 120 : 75,
  preference: 0,
  isCustom: false,
  archived: false,
  useCount: uses,
}));

const restOf = (id: string) => seedExercises.find((e) => e.id === id)!.defaultRestSec;
const item = (name: string, sets: number, reps: number, weightKg: number | null, order: number, maxEffort = false) => {
  const exerciseId = slug(name);
  return { exerciseId, sets, targetReps: reps, targetWeightKg: weightKg, restSec: restOf(exerciseId), order, ...(maxEffort ? { maxEffort } : {}) };
};

// Current split templates and working weights (SPEC section 7). Blank weights fill in after your first session.
export const seedTemplates: WorkoutTemplate[] = [
  {
    id: 'pull-day', name: 'Pull Day', splitDay: 'pull',
    items: [
      item('Cable Row', 3, 10, 50, 0),
      item('Incline Dumbbell Curl', 3, 10, 12, 1),
      // Max effort: est. 1RM ~85 kg, so a top set of 2 reps is ~80 kg; the sets ramp up to it.
      item('Lat Pulldown', 4, 2, 80, 2, true),
      item('Single Arm Preacher Curl', 3, 10, 10.5, 3),
      item('Hammerstrength Iso Row', 3, 12, 30, 4),
      item('Barbell Curl', 3, 12, 22.5, 5),
    ],
  },
  {
    id: 'push-day', name: 'Push Day', splitDay: 'push',
    items: [
      item('Dumbbell Incline Bench Press', 3, 10, null, 0),
      item('Cable Tricep Pushdown', 3, 12, null, 1),
      item('Hammerstrength Shoulder Press', 3, 10, null, 2),
      item('Dumbbell Lateral Raise', 3, 12, null, 3),
      item('Machine Fly', 3, 12, null, 4),
      item('Dumbbell Skullcrusher', 3, 10, null, 5),
    ],
  },
  {
    id: 'leg-day', name: 'Leg Day', splitDay: 'legs',
    items: [
      item('Dumbbell Lunge', 2, 8, 15, 0),
      item('Calf Raise', 2, 12, 85, 1),
      item('Leg Extension', 2, 10, 50, 2),
      item('Seated Leg Curl', 3, 10, null, 3),
      item('Leg Press', 3, 10, null, 4),
    ],
  },
];

export const seedGymProfiles: GymProfile[] = [
  {
    id: 'your-gym', name: 'Your Gym', bodyweightOnly: false,
    equipment: ['barbell', 'ez_bar', 'dumbbell', 'cable', 'machine', 'plate_loaded', 'bench', 'preacher_bench', 'back_extension_bench', 'assisted_machine', 'pull_up_bar', 'bodyweight'],
  },
];

export const seedRecords: PersonalRecord[] = [
  { id: 'seed-lat-pulldown-e1rm', exerciseId: 'lat-pulldown', type: 'e1rm', value: 90.7, date: 0 },
];

export const LB_PER_KG = 2.20462;

export const defaultSettings: Settings = {
  id: 'settings',
  name: '',
  units: 'kg',
  weekStart: 0,
  goal: 'Build Muscle',
  experience: 'intermediate',
  workoutsPerWeek: 4,
  durationMin: 60,
  split: 'ppl',
  variability: 'balanced',
  warmups: false,
  supersets: false,
  weeklySetTargets: { push: 39, pull: 21, legs: 31 },
  bodyweightKg: 80,
  restDefaultSec: 90,
  sound: true,
  vibration: true,
  keepScreenOn: true,
  activeGymProfileId: 'your-gym',
  lifetimeOffset: { workouts: 206, volumeKg: Math.round(2055036 / LB_PER_KG), calories: 34468 },
};
