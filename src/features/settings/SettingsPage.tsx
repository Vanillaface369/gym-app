import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateSettings } from '../../db/actions';
import { downloadBackup, importAll, resetAll } from '../../db/backup';
import { useSettings } from '../../lib/hooks';
import { useInstall } from '../../lib/pwa';
import { fmtClock, fromDisplay, toDisplay } from '../../lib/format';
import { Confirm, PageHeader } from '../../components/ui';
import { ActionRow, Row, Section, Segmented, Toggle } from '../../components/form';
import { IconCheck, IconChevronLeft, IconDownload, IconTrash, IconTrophy, IconUpload } from '../../components/icons';

export function SettingsPage() {
  const s = useSettings();
  const install = useInstall();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const canShare = typeof navigator !== 'undefined' && 'canShare' in navigator;

  return (
    <div className="pb-24">
      <PageHeader
        left={<button aria-label="Back" onClick={() => nav(-1)} className="tap -ml-3 rounded-full p-2 active:bg-surface-2"><IconChevronLeft /></button>}
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
          <Row label="Height (cm)">
            <ProfileNumber value={s.heightCm} min={100} max={250} onSave={(v) => updateSettings({ heightCm: v })} label="Height in centimetres" />
          </Row>
          <Row label="Age">
            <ProfileNumber value={s.age} min={10} max={100} onSave={(v) => updateSettings({ age: v })} label="Age in years" />
          </Row>
          <Row label="Sex">
            <Segmented value={s.sex ?? ''} options={[['male', 'Male'], ['female', 'Female'], ['other', 'Other']]}
              onChange={(v) => updateSettings({ sex: v as 'male' | 'female' | 'other' })} />
          </Row>
        </Section>

        <Section title="Preferences">
          <Row label="Units">
            <Segmented value={s.units} options={[['kg', 'kg'], ['lb', 'lb']]} onChange={(v) => updateSettings({ units: v })} />
          </Row>
        </Section>

        <Section title="Rest timer">
          <Row label="Default rest" hint="For new custom exercises">
            <div className="flex items-center gap-2">
              <button aria-label="Less rest" className="h-11 w-11 rounded-xl bg-surface-2 text-lg" onClick={() => updateSettings({ restDefaultSec: Math.max(15, s.restDefaultSec - 15) })}>−</button>
              <span className="tabular w-12 text-center">{fmtClock(s.restDefaultSec)}</span>
              <button aria-label="More rest" className="h-11 w-11 rounded-xl bg-surface-2 text-lg" onClick={() => updateSettings({ restDefaultSec: s.restDefaultSec + 15 })}>+</button>
            </div>
          </Row>
          <Row label="Sound"><Toggle on={s.sound} onChange={(v) => updateSettings({ sound: v })} /></Row>
          <Row label="Vibration"><Toggle on={s.vibration} onChange={(v) => updateSettings({ vibration: v })} /></Row>
          <Row label="Keep screen on during workouts" hint="So the timer can beep and buzz">
            <Toggle on={s.keepScreenOn} onChange={(v) => updateSettings({ keepScreenOn: v })} />
          </Row>
        </Section>

        <Section title="App">
          {install.installed ? (
            <ActionRow icon={<IconCheck size={20} />} label="Installed" hint="Opens from your home screen and works offline" />
          ) : install.canInstall ? (
            <ActionRow icon={<IconDownload size={20} />} label="Install app" hint="Adds Liftlog to your home screen; works offline" onClick={install.install} />
          ) : (
            <ActionRow icon={<IconDownload size={20} />} label="Install app" hint="In Chrome: ⋮ menu → Add to Home screen" />
          )}
        </Section>

        <Section title="Progress">
          <ActionRow icon={<IconTrophy size={20} />} label="Workout Report" hint="Muscle strength and volume" onClick={() => nav('/report')} />
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
          <ActionRow icon={<IconUpload size={20} />} label="Import Fitbod history (CSV)" hint="Preview before anything is saved" onClick={() => nav('/import-fitbod')} />
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPendingImport(await f.text()); e.target.value = ''; }} />
          {msg && <p role="status" className={`px-1 pt-2 text-sm ${msg.error ? 'text-danger' : 'text-accent'}`}>{msg.text}</p>}
        </Section>

        <Section title="Reset">
          <ActionRow icon={<IconTrash size={20} />} label="Reset all data" hint="Deletes everything on this phone" danger onClick={() => setConfirmReset(true)} />
        </Section>

        <p className="pb-4 text-center text-xs text-muted">Liftlog · your data stays on this phone</p>
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

/** Whole-number profile field that saves on blur; empty clears it. */
function ProfileNumber({ value, min, max, onSave, label }: { value?: number; min: number; max: number; onSave: (v: number | undefined) => void; label: string }) {
  return (
    <input type="number" inputMode="numeric" aria-label={label} key={value ?? 'none'} defaultValue={value ?? ''} placeholder="–"
      onBlur={(e) => {
        const raw = e.target.value.trim();
        if (!raw) { onSave(undefined); return; }
        const n = Math.round(parseFloat(raw));
        if (n >= min && n <= max) onSave(n); else e.target.value = value === undefined ? '' : String(value);
      }}
      className="tabular min-h-11 w-24 rounded-lg bg-surface-2 px-3 text-right outline-none focus:ring-2 focus:ring-accent" />
  );
}
