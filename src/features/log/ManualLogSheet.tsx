import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { createManualSession } from '../../db/actions';
import { Sheet } from '../../components/ui';

const pad = (n: number) => String(n).padStart(2, '0');
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "+" on the Log tab: add a workout you did without the app. */
export function ManualLogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const templates = useLiveQuery(() => db.templates.toArray(), []) ?? [];
  const yesterday = new Date(Date.now() - 86_400_000);
  const [templateId, setTemplateId] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(toDateInput(yesterday));
  const [time, setTime] = useState('17:30');
  const [minutes, setMinutes] = useState('60');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const startedAt = new Date(y, m - 1, d, hh || 0, mm || 0).getTime();
    const mins = parseInt(minutes, 10);
    if (!Number.isFinite(startedAt) || !y) return setError('Pick a date.');
    if (startedAt > Date.now()) return setError("That's in the future.");
    if (!(mins > 0 && mins < 600)) return setError('Duration should be between 1 and 600 minutes.');
    setBusy(true);
    const t = templates.find((x) => x.id === templateId);
    const id = await createManualSession({ name: name || t?.name || 'Workout', startedAt, durationSec: mins * 60 }, t);
    setBusy(false);
    onClose();
    nav(`/session/${id}?edit=1`);
  };

  const field = 'mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 text-ink outline-none focus:ring-2 focus:ring-accent';
  return (
    <Sheet open={open} onClose={onClose} title="Log a past workout">
      <p id="manual-start-from" className="text-sm text-muted">Start from</p>
      <div role="radiogroup" aria-labelledby="manual-start-from" className="mt-1 grid grid-cols-2 gap-2">
        {[{ id: '', name: 'Blank workout', n: 0 }, ...templates.map((t) => ({ id: t.id, name: t.name, n: t.items.length }))].map((o) => (
          <button key={o.id || 'blank'} type="button" role="radio" aria-checked={templateId === o.id} onClick={() => setTemplateId(o.id)}
            className={`min-h-12 rounded-xl px-3 py-2 text-left ${templateId === o.id ? 'bg-accent/10 ring-1 ring-accent' : 'bg-surface-2'}`}>
            <span className="block truncate text-sm font-semibold text-ink">{o.name}</span>
            <span className="block text-xs text-muted">{o.id ? `${o.n} exercises` : 'Add exercises next'}</span>
          </button>
        ))}
      </div>
      <label className="mt-3 block text-sm text-muted">Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={templates.find((t) => t.id === templateId)?.name ?? 'Workout'} className={field} />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-sm text-muted">Date
          <input type="date" value={date} max={toDateInput(new Date())} onChange={(e) => setDate(e.target.value)} className={field} />
        </label>
        <label className="text-sm text-muted">Start time
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
        </label>
      </div>
      <label className="mt-3 block text-sm text-muted">Duration (minutes)
        <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} className={field} />
      </label>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <p className="mt-3 text-sm text-muted">Next you'll edit the exercises and sets.</p>
      <button disabled={busy} onClick={save} className="mt-4 w-full rounded-xl bg-accent py-3 font-semibold text-accent-ink disabled:opacity-50">Continue</button>
    </Sheet>
  );
}
