import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { applyFitbod, NEW, previewFitbod, SKIP, type ImportPreview, type ImportResult } from '../../db/fitbodImport';
import { useExercises } from '../../lib/hooks';
import { fmtShortDate } from '../../lib/format';
import { PageHeader } from '../../components/ui';
import { IconCheck, IconChevronLeft, IconUpload } from '../../components/icons';

export function FitbodImportPage() {
  const nav = useNavigate();
  const { list } = useExercises();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const options = list.filter((e) => !e.archived).sort((a, b) => a.name.localeCompare(b.name));

  const read = async (file: File) => {
    setError(''); setPreview(null); setResult(null);
    try {
      const p = await previewFitbod(await file.text());
      setPreview(p);
      // Close matches are pre-selected; unmatched names default to "add as new" so nothing is lost.
      setChoices(Object.fromEntries(p.names.map((n) => [n.name, n.match ?? NEW])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.');
    }
  };

  const run = async () => {
    if (!preview) return;
    setBusy(true);
    try { setResult(await applyFitbod(preview, choices)); setPreview(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Import failed.'); }
    finally { setBusy(false); }
  };

  const unmatched = preview?.names.filter((n) => n.match === null).length ?? 0;

  return (
    <div className="pb-32">
      <PageHeader
        left={<button aria-label="Back" onClick={() => nav(-1)} className="-ml-2 rounded-full p-2 active:bg-surface-2"><IconChevronLeft /></button>}
        title="Import Fitbod history"
      />
      <div className="px-4">
        {!preview && !result && (
          <>
            <p className="text-sm text-muted">
              In Fitbod, export your workout history as a CSV file, then choose it here. It's read on this phone only; nothing is uploaded.
              You'll see a preview before anything is saved.
            </p>
            <button onClick={() => fileRef.current?.click()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 font-bold text-accent-ink">
              <IconUpload size={20} />Choose CSV file
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ''; }} />
          </>
        )}
        {error && <p className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

        {preview && (
          <>
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-3xl font-bold">{preview.toImport.length} <span className="text-lg font-semibold text-muted">workouts to import</span></p>
              <p className="mt-1 text-sm text-muted">{fmtShortDate(preview.from)} – {fmtShortDate(preview.to)}</p>
              <ul className="mt-3 space-y-1 text-sm text-muted">
                {preview.sameDay > 0 && <li>{preview.sameDay} skipped: you already have a workout logged here that day.</li>}
                {preview.skippedRows > 0 && <li>{preview.skippedRows} rows skipped (no reps, e.g. cardio).</li>}
                <li>Your lifetime totals will be adjusted so these aren't counted twice.</li>
              </ul>
            </div>

            <h2 className="mt-6 text-lg font-semibold">Exercises</h2>
            <p className="text-sm text-muted">
              {unmatched ? `${unmatched} name${unmatched > 1 ? 's' : ''} didn't match your list. Pick one, add it as new, or skip it.` : 'Every name matched your list.'}
            </p>
            <ul className="mt-2 divide-y divide-line rounded-2xl bg-surface">
              {preview.names.map((n) => (
                <li key={n.name} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-medium">{n.name}</p>
                    {n.match && choices[n.name] === n.match && <IconCheck size={16} className="shrink-0 text-accent" aria-label="Matched" />}
                    <span className="shrink-0 text-xs text-muted">{n.sets} sets</span>
                  </div>
                  <select value={choices[n.name]} aria-label={`Match for ${n.name}`}
                    onChange={(e) => setChoices({ ...choices, [n.name]: e.target.value })}
                    className="mt-2 w-full rounded-lg bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent">
                    <option value={NEW}>Add as a new exercise</option>
                    <option value={SKIP}>Skip (don't import)</option>
                    <optgroup label="Your exercises">
                      {options.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </optgroup>
                  </select>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">New exercises start without muscles; set them in My Plan → Manage exercises so they count toward recovery and targets.</p>

            <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-lg gap-3 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6 pb-4">
              <button onClick={() => setPreview(null)} className="rounded-2xl bg-surface-2 px-6 py-4 font-semibold">Cancel</button>
              <button disabled={busy || !preview.toImport.length} onClick={run}
                className="flex-1 rounded-2xl bg-accent py-4 text-lg font-bold text-accent-ink disabled:opacity-50">
                {busy ? 'Importing…' : `Import ${preview.toImport.length} workouts`}
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="rounded-2xl bg-surface p-5 text-center">
            <p className="text-4xl">✓</p>
            <p className="mt-2 text-xl font-bold">Imported {result.workouts} workouts</p>
            <p className="mt-1 text-sm text-muted">
              {result.sets.toLocaleString('en-AU')} sets{result.newExercises ? `, ${result.newExercises} new exercise${result.newExercises > 1 ? 's' : ''}` : ''}. PRs, charts and strength scores now include them.
            </p>
            <Link to="/log" className="mt-4 block rounded-2xl bg-accent py-3.5 font-bold text-accent-ink">See your Log</Link>
          </div>
        )}
      </div>
    </div>
  );
}
