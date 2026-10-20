import { useEffect, useState } from 'react';

/**
 * R2-UX-01 — Mengukur tinggi keyboard virtual yang menutupi layout viewport.
 *
 * Di Android WebView / Telegram Mini App, keyboard tidak mengecilkan layout viewport
 * melainkan visual viewport. Tanpa pengukuran ini, elemen `position: fixed` (bottom
 * sheet, footer aksi) bisa tertutup keyboard saat pengguna menulis catatan panjang.
 *
 * Rumus: tinggi layout viewport − tinggi visual viewport − offset visual viewport.
 * Hasil 0 berarti keyboard tertutup (atau browser tanpa `visualViewport`).
 */
export function useVisualViewportInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // Abaikan selisih < 80px: itu biasanya UI browser (URL bar), bukan keyboard.
      setInset(covered > 80 ? Math.round(covered) : 0);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
