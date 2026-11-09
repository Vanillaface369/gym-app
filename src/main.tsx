import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Offline support: caches the app so it opens at the gym with no signal. Updates install on next open.
registerSW({ immediate: true });

// Ask the browser not to evict our IndexedDB data under storage pressure.
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
