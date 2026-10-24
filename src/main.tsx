import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './app/ErrorBoundary'
import { registerServiceWorker } from './registerServiceWorker'
import { prewarmInactiveTabsOnIdle } from './lib/perf/prewarmTabs'
import { initReducedMotion } from './lib/preferences/appPreferences'

// AUDIT-FIX (P2): apply the saved "Kurangi Animasi" preference before the first
// paint so no idle sprite animation starts for a frame and then stops.
initReducedMotion()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

registerServiceWorker()

// R4-PERF-04: panaskan chunk + gambar tab Pustaka/Catatan saat perangkat menganggur,
// supaya perpindahan tab tidak lagi menunggu unduh chunk dan decode gambar.
prewarmInactiveTabsOnIdle()

// Safe Telegram Mini App viewport & theme initialization if embedded
try {
  const tg = (window as unknown as {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        enableClosingConfirmation?: () => void;
      };
    };
  }).Telegram?.WebApp;

  if (tg) {
    tg.expand?.();
    tg.setHeaderColor?.('#FAF7F2');
    tg.setBackgroundColor?.('#FAF7F2');
    tg.enableClosingConfirmation?.();
  }
} catch {
  // Ignored in standard browser environments
}
