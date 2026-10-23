import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

function getSnapshot(): boolean {
  return document.visibilityState !== 'hidden';
}

/** Pauses optional work in background WebViews and resumes it on return. */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
