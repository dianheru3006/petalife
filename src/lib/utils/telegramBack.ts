import { useEffect, useRef } from 'react';

/**
 * Telegram Mini App hardware Back Button, layered properly.
 *
 * AUDIT-FIX (P0): only the Vault wired `WebApp.BackButton`. On Catatan, Beranda
 * (draft sheet) and Pengaturan the Android back gesture closed the whole Mini
 * App even with an editor open, losing an unsaved draft. The fix is a tiny
 * layer resolver: each screen declares what it can close and how important it
 * is, and the hook exposes a single native handler that always closes the most
 * specific layer first.
 */

export interface TelegramBackButtonLike {
  show?: () => void;
  hide?: () => void;
  onClick?: (handler: () => void) => void;
  offClick?: (handler: () => void) => void;
}

export interface BackLayer {
  id: string;
  isOpen: boolean;
  /** Higher wins. Modals should outrank the page beneath them. */
  priority: number;
  onBack: () => void;
}

/** Returns the layer that must handle the next back press, or null to let Telegram close the app. */
export function resolveBackLayer(layers: readonly BackLayer[]): BackLayer | null {
  let top: BackLayer | null = null;
  for (const layer of layers) {
    if (!layer.isOpen) continue;
    if (!top || layer.priority > top.priority) top = layer;
  }
  return top;
}

export function getTelegramBackButton(): TelegramBackButtonLike | null {
  if (typeof window === 'undefined') return null;
  const webApp = (window as unknown as { Telegram?: { WebApp?: { BackButton?: TelegramBackButtonLike } } })
    ?.Telegram?.WebApp;
  return webApp?.BackButton ?? null;
}

/**
 * Binds the native Back Button to the topmost open layer.
 * The handler reads from a ref so a re-render never leaves a stale closure
 * pointing at a closed layer.
 */
export function useTelegramBackButton(layers: readonly BackLayer[]): void {
  const layersRef = useRef(layers);

  // "Latest ref" pattern: kept in an effect (never mutated during render) so the
  // registered native handler always sees the current layer set without making
  // the effect below re-subscribe on every render.
  useEffect(() => {
    layersRef.current = layers;
  });

  const isActive = resolveBackLayer(layers) !== null;

  useEffect(() => {
    const backButton = getTelegramBackButton();
    if (!backButton) return;

    if (!isActive) {
      backButton.hide?.();
      return;
    }

    const handleBack = () => {
      const top = resolveBackLayer(layersRef.current);
      top?.onBack();
    };

    backButton.show?.();
    backButton.onClick?.(handleBack);

    return () => {
      backButton.offClick?.(handleBack);
      backButton.hide?.();
    };
  }, [isActive]);
}
