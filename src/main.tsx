import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './registerServiceWorker'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()

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
    tg.ready?.();
    tg.expand?.();
    tg.setHeaderColor?.('#FAF7F2');
    tg.setBackgroundColor?.('#FAF7F2');
    tg.enableClosingConfirmation?.();
  }
} catch {
  // Ignored in standard browser environments
}
