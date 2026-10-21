/**
 * R3-UX-01: util fokus untuk dialog/modal.
 *
 * Sheet catatan memakai `role="dialog"` dan `aria-modal="true"`, tetapi tanpa
 * penjaga fokus pengguna keyboard tetap bisa men-Tab ke navbar di belakang sheet
 * dan kehilangan konteks. Helper di sini menjaga siklus Tab tetap di dalam sheet
 * dan menyediakan daftar elemen yang memang dapat difokuskan.
 */

export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

/**
 * Elemen yang dapat difokuskan dan benar-benar terlihat (bukan hidden/aria-hidden).
 */
export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.closest('[hidden], [inert]')) return false;
    return element.offsetParent !== null || element === document.activeElement;
  });
}

/**
 * Indeks elemen berikutnya dalam siklus Tab. `currentIndex` -1 berarti fokus
 * sedang di luar container, sehingga Tab masuk ke elemen pertama dan Shift+Tab
 * masuk ke elemen terakhir.
 */
export function resolveFocusTargetIndex(count: number, currentIndex: number, shiftKey: boolean): number {
  if (count <= 0) return -1;
  if (currentIndex < 0) return shiftKey ? count - 1 : 0;
  return (currentIndex + (shiftKey ? -1 : 1) + count) % count;
}

/**
 * Pilih target fokus awal saat sheet dibuka: textarea (menulis catatan) lebih
 * berguna daripada tombol tutup.
 */
export function resolveInitialFocusIndex(elements: HTMLElement[]): number {
  if (elements.length === 0) return -1;
  const textareaIndex = elements.findIndex(element => element.tagName === 'TEXTAREA');
  return textareaIndex >= 0 ? textareaIndex : 0;
}
