// Install prompt and app-update state, shared between main.tsx (which registers the service worker) and the UI.
import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let installEvent: BeforeInstallPromptEvent | null = null;
let needRefresh = false;
let applyUpdate: (() => void) | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

/** Call once at startup. Chrome fires this when the app can be installed; we keep it for our own Install button. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e as BeforeInstallPromptEvent; emit(); });
  window.addEventListener('appinstalled', () => { installEvent = null; emit(); });
}

/** Called by the service worker registration when a new version is waiting. */
export function setUpdateReady(apply: () => void) { needRefresh = true; applyUpdate = apply; emit(); }

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function useInstall() {
  const canInstall = useSyncExternalStore(subscribe, () => installEvent !== null);
  return {
    canInstall,
    installed: isStandalone(),
    install: async () => {
      if (!installEvent) return;
      await installEvent.prompt();
      await installEvent.userChoice.catch(() => undefined);
      installEvent = null;
      emit();
    },
  };
}

export function useUpdate() {
  const ready = useSyncExternalStore(subscribe, () => needRefresh);
  return { ready, apply: () => applyUpdate?.(), dismiss: () => { needRefresh = false; emit(); } };
}
