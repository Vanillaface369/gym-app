import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { updateSettings } from '../../db/actions';
import { EQUIPMENT, MUSCLES, type Equipment, type GymProfile, type Settings } from '../../db/types';
import { useSettings } from '../../lib/hooks';
import { EQUIPMENT_LABEL, fmtDuration, fromDisplay, MUSCLE_LABEL, toDisplay, uid } from '../../lib/format';
import { DEFAULT_STEPS, goalRange, STEP_LABEL, type StepKind } from '../../lib/progression';
import { Confirm, NumberField, PageHeader, Sheet } from '../../components/ui';
import { ActionRow, Row, Section, Segmented, Stepper, Toggle, ToggleChip } from '../../components/form';
import { IconChevronLeft, IconEdit, IconList, IconPlus, IconTarget } from '../../components/icons';

const GOALS: [string, string][] = [['Build Muscle', 'Muscle'], ['Strength', 'Strength'], ['General Fitness', 'Fitness']];

export function PlanPage() {
  const s = useSettings();
  const nav = useNavigate();
  const gyms = useLiveQuery(() => db.gymProfiles.toArray(), []) ?? [];
  const [editGym, setEditGym] = useState<GymProfile | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const range = goalRange(s.goal);
  const avoid = s.avoidMuscles ?? [];

  return (
    <div className="pb-24">
      <PageHeader
        left={<button aria-label="Back" onClick={() => nav(-1)} className="-ml-2 rounded-full p-2 active:bg-surface-2"><IconChevronLeft /></button>}
        title="My Plan"
      />
      <div className="space-y-6 px-4">
        <Section title="Goal">
          <Row label="Goal" hint={`Default rep range ${range.min}–${range.max}`}>
            <Segmented value={s.goal} options={GOALS} onChange={(v) => updateSettings({ goal: v })} />
          </Row>
          <Row label="Experience">
            <Segmented value={s.experience} options={[['beginner', 'New'], ['intermediate', 'Mid'], ['advanced', 'Adv.']]}
              onChange={(v) => updateSettings({ experience: v })} />
          </Row>
        </Section>

        <Section title="Training">
          <Row label="Workouts per week" hint="Your weekly goal on the Log tab">
            <Stepper value={s.workoutsPerWeek} label={String(s.workoutsPerWeek)} min={1} max={7} onChange={(v) => updateSettings({ workoutsPerWeek: v })} />
          </Row>
          <Row label="Workout length" hint="About 7½ minutes per exercise">
            <Stepper value={s.durationMin} label={fmtDuration(s.durationMin * 60)} min={15} max={120} step={15} onChange={(v) => updateSettings({ durationMin: v })} />
          </Row>
          <Row label="Split">
            <Segmented value={s.split === 'custom' ? 'ppl' : s.split} options={[['ppl', 'PPL'], ['upper_lower', 'Up/Low'], ['full', 'Full']]}
              onChange={(v) => updateSettings({ split: v, selectedTemplateId: undefined })} />
          </Row>
          <Row label="Exercise rotation" hint="How much generated workouts change">
            <Segmented value={s.variability} options={[['low', 'Low'], ['balanced', 'Mid'], ['high', 'High']]}
              onChange={(v) => updateSettings({ variability: v })} />
          </Row>
          <Row label="Warm-up sets" hint="One light set before each new muscle">
            <Toggle on={s.warmups} onChange={(v) => updateSettings({ warmups: v })} />
          </Row>
          <Row label="Week starts on">
            <Segmented value={String(s.weekStart)} options={[['0', 'Sun'], ['1', 'Mon']]} onChange={(v) => updateSettings({ weekStart: Number(v) as 0 | 1 })} />
          </Row>
          <ActionRow icon={<IconTarget size={20} />} label="Weekly set targets" hint={`Push ${s.weeklySetTargets.push} · Pull ${s.weeklySetTargets.pull} · Legs ${s.weeklySetTargets.legs}`} onClick={() => nav('/targets')} />
          <ActionRow icon={<IconList size={20} />} label="Manage exercises" hint="More/less often, rep ranges, add your own" onClick={() => nav('/exercises')} />
        </Section>

        <Section title="Injuries & limits">
          <div className="py-3">
            <textarea value={notes ?? s.injuryNotes ?? ''} onChange={(e) => setNotes(e.target.value)}
              onBlur={() => { if (notes !== null) { updateSettings({ injuryNotes: notes.trim() || undefined }); setNotes(null); } }}
              rows={2} placeholder="Notes for yourself, e.g. sore left shoulder"
              className="w-full rounded-xl bg-surface-2 p-3 text-sm outline-none focus:ring-2 focus:ring-accent" />
            <p className="mt-3 text-sm">Muscles to avoid</p>
            <p className="text-xs text-muted">Generated workouts skip exercises that mainly train these.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MUSCLES.map((m) => (
                <ToggleChip key={m} on={avoid.includes(m)}
                  onClick={() => updateSettings({ avoidMuscles: avoid.includes(m) ? avoid.filter((x) => x !== m) : [...avoid, m] })}>{MUSCLE_LABEL[m]}</ToggleChip>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Gyms">
          {gyms.map((g) => (
            <div key={g.id} className="flex min-h-14 items-center gap-3 py-2">
              <button role="radio" aria-checked={g.id === s.activeGymProfileId} aria-label={`Use ${g.name}`}
                onClick={() => updateSettings({ activeGymProfileId: g.id })}
                className={`h-5 w-5 shrink-0 rounded-full border-2 ${g.id === s.activeGymProfileId ? 'border-accent bg-accent shadow-[inset_0_0_0_3px_var(--color-surface)]' : 'border-line'}`} />
              <button onClick={() => setEditGym(g)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{g.name}</span>
                  <span className="block truncate text-xs text-muted">{g.bodyweightOnly ? 'Bodyweight only' : `${g.equipment.length} kinds of equipment`}</span>
                </span>
                <IconEdit size={18} className="text-muted" />
              </button>
            </div>
          ))}
          <ActionRow icon={<IconPlus size={20} />} label="Add a gym" onClick={() => setEditGym({ id: '', name: '', equipment: ['dumbbell', 'bench', 'bodyweight'], bodyweightOnly: false })} />
        </Section>

        <Section title={`Weight steps (${s.units})`}>
          <p className="px-1 pt-3 text-xs text-muted">How much the weight goes up when you hit the top of your rep range.</p>
          {(Object.keys(DEFAULT_STEPS) as StepKind[]).map((k) => (
            <Row key={k} label={STEP_LABEL[k]}>
              <div className="w-20">
                <NumberField ariaLabel={`${STEP_LABEL[k]} step`} step={0.5} value={toDisplay(s.weightSteps?.[k] ?? DEFAULT_STEPS[k], s.units)}
                  onChange={(v) => v > 0 && updateSettings({ weightSteps: { ...s.weightSteps, [k]: fromDisplay(v, s.units) } })} />
              </div>
            </Row>
          ))}
        </Section>
      </div>

      <GymEditor gym={editGym} onClose={() => setEditGym(null)} canDelete={gyms.length > 1} settings={s} />
    </div>
  );
}

function GymEditor({ gym, onClose, canDelete, settings }: { gym: GymProfile | null; onClose: () => void; canDelete: boolean; settings: Settings }) {
  const [draft, setDraft] = useState<GymProfile | null>(null);
  const [shownFor, setShownFor] = useState<GymProfile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (gym !== shownFor) { setShownFor(gym); setDraft(gym ? structuredClone(gym) : null); }
  if (!gym || !draft) return null;
  const isNew = !gym.id;
  const toggle = (e: Equipment) => setDraft({ ...draft, equipment: draft.equipment.includes(e) ? draft.equipment.filter((x) => x !== e) : [...draft.equipment, e] });
  const save = async () => {
    const g = { ...draft, name: draft.name.trim() || 'My Gym', id: draft.id || uid() };
    await db.gymProfiles.put(g);
    if (isNew) await updateSettings({ activeGymProfileId: g.id });
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={isNew ? 'New gym' : 'Edit gym'} tall>
      <label className="text-sm text-muted">Name
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Home"
          className="mt-1 w-full rounded-xl bg-surface-2 px-4 py-3 text-ink outline-none focus:ring-2 focus:ring-accent" />
      </label>
      <div className="mt-3 flex items-center justify-between">
        <div><p>Bodyweight only</p><p className="text-xs text-muted">No equipment at all</p></div>
        <Toggle on={draft.bodyweightOnly} onChange={(v) => setDraft({ ...draft, bodyweightOnly: v })} />
      </div>
      {!draft.bodyweightOnly && (
        <>
          <p className="mt-4 text-sm text-muted">Equipment</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EQUIPMENT.map((e) => <ToggleChip key={e} on={draft.equipment.includes(e)} onClick={() => toggle(e)}>{EQUIPMENT_LABEL[e]}</ToggleChip>)}
          </div>
        </>
      )}
      <div className="mt-6 flex gap-2">
        {!isNew && canDelete && <button onClick={() => setConfirmDelete(true)} className="rounded-2xl bg-surface-2 px-4 py-3.5 text-sm font-semibold text-danger">Delete</button>}
        <button onClick={save} className="flex-1 rounded-2xl bg-accent py-3.5 font-bold text-accent-ink">Save</button>
      </div>
      <Confirm open={confirmDelete} title={`Delete “${gym.name}”?`} body="Past workouts are kept." confirmLabel="Delete" danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await db.gymProfiles.delete(gym.id);
          if (settings.activeGymProfileId === gym.id) {
            const other = (await db.gymProfiles.toArray())[0];
            if (other) await updateSettings({ activeGymProfileId: other.id });
          }
          setConfirmDelete(false);
          onClose();
        }} />
    </Sheet>
  );
}

