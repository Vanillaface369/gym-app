import { useUpdate } from '../lib/pwa';

/** "New version ready" notice. Reloading is safe mid-workout: everything is saved in the phone's database. */
export function UpdateToast() {
  const { ready, apply, dismiss } = useUpdate();
  if (!ready) return null;
  return (
    <div role="status" className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto max-w-lg px-4">
      <div className="pointer-events-auto mt-3 flex items-center gap-3 rounded-2xl bg-surface-2 p-3 shadow-xl shadow-black/50 ring-1 ring-line">
        <p className="flex-1 text-sm"><span className="font-semibold">Updated.</span> <span className="text-muted">Reload to use the new version.</span></p>
        <button onClick={dismiss} className="rounded-lg px-2 py-1.5 text-sm text-muted">Later</button>
        <button onClick={apply} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-accent-ink">Reload</button>
      </div>
    </div>
  );
}
