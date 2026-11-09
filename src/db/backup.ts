import { db, TABLES } from './db';
import { defaultSettings, seedExercises, seedGymProfiles, seedRecords, seedTemplates } from './seed';

const APP_TAG = 'gym-app-backup';

export async function exportAll(): Promise<{ filename: string; json: string }> {
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = await db.table(t).toArray();
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return {
    filename: `gym-backup-${stamp}.json`,
    json: JSON.stringify({ app: APP_TAG, version: 1, exportedAt: now.toISOString(), tables }, null, 1),
  };
}

/** Download the backup; on Android this lands in Downloads. Uses the share sheet when available so it can go to Drive etc. */
export async function downloadBackup(preferShare = false) {
  const { filename, json } = await exportAll();
  const file = new File([json], filename, { type: 'application/json' });
  if (preferShare && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Replace ALL data with the backup's contents. */
export async function importAll(text: string): Promise<{ sessions: number }> {
  const data = JSON.parse(text);
  if (data?.app !== APP_TAG || typeof data.tables !== 'object') throw new Error("That file isn't a backup from this app.");
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = data.tables[t];
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkAdd(rows);
    }
  });
  return { sessions: Array.isArray(data.tables.sessions) ? data.tables.sessions.length : 0 };
}

/** Wipe everything and go back to the seeded starting state. */
export async function resetAll() {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear();
    await db.exercises.bulkAdd(seedExercises);
    await db.templates.bulkAdd(seedTemplates);
    await db.gymProfiles.bulkAdd(seedGymProfiles);
    await db.records.bulkAdd(seedRecords);
    await db.settings.add(defaultSettings);
  });
}
