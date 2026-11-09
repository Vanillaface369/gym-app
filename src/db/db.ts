import Dexie, { type EntityTable } from 'dexie';
import type {
  ActiveWorkout, Exercise, GymProfile, PersonalRecord, RecoveryOverride, SetLog, Settings,
  WorkoutSession, WorkoutTemplate,
} from './types';
import { defaultSettings, seedExercises, seedGymProfiles, seedRecords, seedTemplates } from './seed';

export class GymDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  templates!: EntityTable<WorkoutTemplate, 'id'>;
  sessions!: EntityTable<WorkoutSession, 'id'>;
  sets!: EntityTable<SetLog, 'id'>;
  records!: EntityTable<PersonalRecord, 'id'>;
  gymProfiles!: EntityTable<GymProfile, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  recoveryOverrides!: EntityTable<RecoveryOverride, 'muscle'>;
  active!: EntityTable<ActiveWorkout, 'id'>;

  constructor(name = 'gym-app') {
    super(name);
    this.version(1).stores({
      exercises: 'id, name, category',
      templates: 'id, splitDay',
      sessions: 'id, startedAt, templateId, splitDay',
      sets: 'id, sessionId, exerciseId, completedAt',
      records: 'id, exerciseId, [exerciseId+type]',
      gymProfiles: 'id',
      settings: 'id',
      recoveryOverrides: 'muscle',
      active: 'id',
    });
    this.on('populate', (tx) => {
      tx.table('exercises').bulkAdd(seedExercises);
      tx.table('templates').bulkAdd(seedTemplates);
      tx.table('gymProfiles').bulkAdd(seedGymProfiles);
      tx.table('records').bulkAdd(seedRecords);
      tx.table('settings').add(defaultSettings);
    });
  }
}

export const db = new GymDB();

export const TABLES = ['exercises', 'templates', 'sessions', 'sets', 'records', 'gymProfiles', 'settings', 'recoveryOverrides', 'active'] as const;
