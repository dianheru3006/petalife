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

// Telegram exposes one BackButton for the entire Mini App. Keep one native
// callback and resolve the highest layer across every mounted screen/sheet.
const registeredLayers = new Map<symbol, { current: readonly BackLayer[] }>();
let boundButton: TelegramBackButtonLike | null = null;
const handleNativeBack = () => {
  const layers = Array.from(registeredLayers.values()).flatMap(entry => entry.current);
  resolveBackLayer(layers)?.onBack();
};

function syncNativeBackButton(): void {
  const button = getTelegramBackButton();
  const hasOpenLayer = Array.from(registeredLayers.values()).some(entry => resolveBackLayer(entry.current));
  if (boundButton && (boundButton !== button || !hasOpenLayer)) {
    boundButton.offClick?.(handleNativeBack);
    boundButton.hide?.();
    boundButton = null;
  }
  if (button && hasOpenLayer && !boundButton) {
    boundButton = button;
    button.onClick?.(handleNativeBack);
    button.show?.();
  }
}

/**
 * Binds the native Back Button to the topmost open layer.
 * The handler reads from a ref so a re-render never leaves a stale closure
 * pointing at a closed layer.
 */
export function useTelegramBackButton(layers: readonly BackLayer[]): void {
  const layersRef = useRef(layers);
  const key = useRef(Symbol('telegram-back-layer')).current;
  const isActive = resolveBackLayer(layers) !== null;

  useEffect(() => {
    layersRef.current = layers;
    syncNativeBackButton();
  });

  useEffect(() => {
    if (isActive) registeredLayers.set(key, layersRef);
    syncNativeBackButton();
    return () => {
      registeredLayers.delete(key);
      syncNativeBackButton();
    };
  }, [isActive, key]);
}
