import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateSettings } from '../../db/actions';
import { downloadBackup, importAll, resetAll } from '../../db/backup';
import { useSettings } from '../../lib/hooks';
import { fmtClock, fromDisplay, toDisplay } from '../../lib/format';
import { Confirm, PageHeader } from '../../components/ui';
import { IconChevronLeft, IconDownload, IconTrash, IconUpload } from '../../components/icons';

export function SettingsPage() {
  const s = useSettings();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const canShare = typeof navigator !== 'undefined' && 'canShare' in navigator;

  return (
    <div className="pb-24">
      <PageHeader
        left={<button aria-label="Back" onClick={() => nav(-1)} className="-ml-2 rounded-full p-2 active:bg-surface-2"><IconChevronLeft /></button>}
        title="Settings"
      />
      <div className="space-y-6 px-4">
        <Section title="You">
          <Row label="Name">
            <input value={s.name} onChange={(e) => updateSettings({ name: e.target.value })} placeholder="Your name"
              className="w-40 rounded-lg bg-surface-2 px-3 py-2 text-right outline-none focus:ring-2 focus:ring-accent" />
          </Row>
          <Row label={`Bodyweight (${s.units})`} hint="Used for calorie estimates">
            <input type="number" inputMode="decimal" key={`${s.units}-${s.bodyweightKg}`} defaultValue={toDisplay(s.bodyweightKg, s.units)}
              onBlur={(e) => { const n = parseFloat(e.target.value); if (n > 0) updateSettings({ bodyweightKg: fromDisplay(n, s.units) }); else e.target.value = String(toDisplay(s.bodyweightKg, s.units)); }}
              className="tabular w-24 rounded-lg bg-surface-2 px-3 py-2 text-right outline-none focus:ring-2 focus:ring-accent" />
          </Row>
        </Section>

        <Section title="Preferences">
          <Row label="Units">
            <Segmented value={s.units} options={[['kg', 'kg'], ['lb', 'lb']]} onChange={(v) => updateSettings({ units: v })} />
          </Row>
          <Row label="Week starts on">
            <Segmented value={String(s.weekStart)} options={[['0', 'Sun'], ['1', 'Mon']]} onChange={(v) => updateSettings({ weekStart: Number(v) as 0 | 1 })} />
          </Row>
        </Section>

        <Section title="Rest timer">
          <Row label="Default rest" hint="For new custom exercises">
            <div className="flex items-center gap-2">
              <button className="h-9 w-9 rounded-lg bg-surface-2" onClick={() => updateSettings({ restDefaultSec: Math.max(15, s.restDefaultSec - 15) })}>−</button>
              <span className="tabular w-12 text-center">{fmtClock(s.restDefaultSec)}</span>
              <button className="h-9 w-9 rounded-lg bg-surface-2" onClick={() => updateSettings({ restDefaultSec: s.restDefaultSec + 15 })}>+</button>
            </div>
          </Row>
          <Row label="Sound"><Toggle on={s.sound} onChange={(v) => updateSettings({ sound: v })} /></Row>
          <Row label="Vibration"><Toggle on={s.vibration} onChange={(v) => updateSettings({ vibration: v })} /></Row>
          <Row label="Keep screen on during workouts" hint="So the timer can beep and buzz">
            <Toggle on={s.keepScreenOn} onChange={(v) => updateSettings({ keepScreenOn: v })} />
          </Row>
        </Section>

        <Section title="Your data">
          <p className="px-1 pb-2 text-sm text-muted">Everything is stored on this phone only. Export a backup now and then.</p>
          <ActionRow icon={<IconDownload size={20} />} label="Export data (JSON)" onClick={async () => {
            try { await downloadBackup(false); setMsg({ text: 'Backup saved to Downloads.' }); } catch (e) { setMsg({ text: String(e), error: true }); }
          }} />
          {canShare && (
            <ActionRow icon={<IconDownload size={20} />} label="Share backup…" hint="Send to Drive, email, etc." onClick={async () => {
              try { await downloadBackup(true); } catch { /* user cancelled share */ }
            }} />
          )}
          <ActionRow icon={<IconUpload size={20} />} label="Import data (JSON)" hint="Replaces everything on this phone" onClick={() => fileRef.current?.click()} />
          <ActionRow icon={<IconUpload size={20} />} label="Import Fitbod CSV" hint="Coming in the Polish stage" disabled />
          <ActionRow icon={<IconTrash size={20} />} label="Reset all data" danger onClick={() => setConfirmReset(true)} />
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPendingImport(await f.text()); e.target.value = ''; }} />
          {msg && <p className={`px-1 pt-2 text-sm ${msg.error ? 'text-danger' : 'text-accent'}`}>{msg.text}</p>}
        </Section>

        <p className="pb-4 text-center text-xs text-muted">Stage 1 · core logging</p>
      </div>

      <Confirm open={pendingImport !== null} title="Replace all data?" danger confirmLabel="Import"
        body="Everything currently on this phone (workouts, exercises, settings) will be replaced with the backup."
        onCancel={() => setPendingImport(null)}
        onConfirm={async () => {
          const text = pendingImport!;
          setPendingImport(null);
          try { const r = await importAll(text); setMsg({ text: `Imported ${r.sessions} workouts.` }); }
          catch (e) { setMsg({ text: e instanceof Error ? e.message : 'Import failed.', error: true }); }
        }} />
      <Confirm open={confirmReset} title="Reset all data?" danger confirmLabel="Reset"
        body="Deletes every workout and change you've made and restores the starting exercises and templates. Export a backup first if you might want it back."
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => { setConfirmReset(false); await resetAll(); setMsg({ text: 'All data reset.' }); }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted uppercase">{title}</h2>
      <div className="divide-y divide-line rounded-2xl bg-surface px-3">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 py-2">
      <div>
        <p>{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function ActionRow({ icon, label, hint, onClick, danger, disabled }: { icon: ReactNode; label: string; hint?: string; onClick?: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className={`flex min-h-14 w-full items-center gap-3 py-2 text-left disabled:opacity-40 ${danger ? 'text-danger' : ''}`}>
      <span className={danger ? '' : 'text-muted'}>{icon}</span>
      <span>
        <span className="block">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-surface-2'}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${on ? 'left-[1.375rem]' : 'left-0.5'}`} />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg bg-surface-2 p-0.5">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium ${value === v ? 'bg-accent text-accent-ink' : 'text-muted'}`}>{label}</button>
      ))}
    </div>
  );
}
