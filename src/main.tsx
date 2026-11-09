import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { captureInstallPrompt, setUpdateReady } from './lib/pwa';
import './index.css';

// Offline support: caches the app so it opens at the gym with no signal.
// A new version waits until the user taps "Reload" on the update notice (or next fully closes the app).
const updateSW = registerSW({ immediate: true, onNeedRefresh: () => setUpdateReady(() => updateSW(true)) });
captureInstallPrompt();

// Ask the browser not to evict our IndexedDB data under storage pressure.
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
