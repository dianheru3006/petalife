# Petalife — Forensic Audit & Hardening Report

**Scope:** React 19 / TypeScript / Vite PWA inside the Telegram Mini App WebView, running on the
Realme Narzo 50A (Helio G85, 4 GB RAM) against the Asisten Heru gateway.
**Date:** 2026-10-21
**Baseline:** 25 test files / 162 tests green
**After:** 31 test files / **205 tests green** (+43 regression tests), `tsc -b` clean, production build clean

---

## 1. Severity matrix

| ID | Sev | Finding | Root cause | Fix location |
|----|-----|---------|-----------|--------------|
| F-01 | **P0** | A rejected feed (full belly or 2 s cooldown) still completed the daily snack habit and paid its XP. Every extra tap farmed habit XP. | `fulfillDailyGoal('goal-2')` ran unconditionally, outside the engine result check, in `handleFeedPet`. | [App.tsx:289](src/App.tsx#L289-L322) |
| F-02 | **P0** | UI announced `+25 XP` for a feed that awards 5 XP once per day (and 0 XP on repeats). | Hard-coded string; engine `FeedResult` was discarded by `onFeed: () => void`. | [PetRoom.tsx:407](src/components/pet/PetRoom.tsx#L407-L440) |
| F-03 | **P0** | One corrupted stat turned Mochi permanently unusable (NaN meters forever, level frozen). | `isValidPet` used `typeof x === 'number'`, which accepts `NaN`/`Infinity`; `awardXp` propagated NaN through `exp + xp`. | [petStorage.ts:62](src/features/pet/engine/petStorage.ts#L62-L100), [petEngine.ts:321](src/features/pet/engine/petEngine.ts#L321-L352) |
| F-04 | **P0** | No way to export, import or reset data. One IndexedDB eviction (Android storage pressure) = permanent loss of the whole Vault. | Settings shipped only gateway config + cache purge. | [backup.ts](src/lib/db/backup.ts), [SettingsPage.tsx:136](src/features/settings/SettingsPage.tsx#L136-L235) |
| F-05 | **P0** | Telegram hardware back closed the Mini App while the note editor or the AI draft sheet had unsaved text. | `BackButton` was wired only in `VaultPage`; no layered resolution. | [telegramBack.ts](src/lib/utils/telegramBack.ts), [NotesPage.tsx:198](src/features/notes/NotesPage.tsx#L198), [MochiNoteSheet.tsx:146](src/components/pet/MochiNoteSheet.tsx#L146) |
| F-06 | **P1** | Deleting a material closed the reading view even when the IndexedDB delete failed; the row reappeared after reload. | `onDeleteLink` was fire-and-forget and App swallowed the rejection. | [VaultPage.tsx:305](src/features/vault/VaultPage.tsx#L305-L322), [App.tsx:356](src/App.tsx#L356-L364) |
| F-07 | **P1** | Assistant errors produced no reply at all; replies below the fold were never scrolled into view; the typing indicator was a fake 600 ms timer. | `catch {}` with no message; no scroll anchor; `setTimeout` disconnected from the request. | [App.tsx:515](src/App.tsx#L515-L530), [AssistantPage.tsx:39](src/features/assistant/AssistantPage.tsx#L39-L66) |
| F-08 | **P1** | On Android/Telegram, the keyboard covered the note editor's “Simpan catatan” button. | The `useVisualViewportInset` hook existed but was only used by the AI sheet. | [NotesPage.tsx:64](src/features/notes/NotesPage.tsx#L64), [:361](src/features/notes/NotesPage.tsx#L361-L372) |
| F-09 | **P1** | Decay, feeding, night toggle and the review pose bypassed the write-through path, so `petRef` lagged one render. A reward claim in that window rebuilt the pet from a stale snapshot and erased fresh stats/XP. | Two mutation paths (`setPet` vs `persistPetChange`). | [App.tsx:185](src/App.tsx#L185-L206), [:223](src/App.tsx#L223), [:262](src/App.tsx#L262) |
| F-10 | **P1** | Vault toasts used per-action timers: saving then deleting could clear the newer toast early, and timers fired after unmount. | Untracked `setTimeout` per handler. | [VaultPage.tsx:143](src/features/vault/VaultPage.tsx#L143-L160) |
| F-11 | **P1** | Saving a new gateway URL while a 3 s probe was in flight let the **stale** result overwrite the new one — a green “Terhubung” for a server that was just replaced. | No request token / abort in `runConnectionTest`. | [SettingsPage.tsx:70](src/features/settings/SettingsPage.tsx#L70-L95) |
| F-12 | **P1** | Service Worker cached third-party font origins (`googleapis.com`, `gstatic.com`) even though the shell is fully self-hosted. | Leftover branch from the pre–self-host era. | [sw.js:142](public/sw.js#L142) |
| F-13 | **P1** | Out-of-range saved stats (e.g. energy `400`, hand-edited storage or crafted backup) survived load; the awake decay branch only has a lower bound. | No clamp at the storage boundary. | [petStorage.ts:82](src/features/pet/engine/petStorage.ts#L82-L100) |
| F-14 | **P2** | TV flicker timers raced on rapid channel taps and fired after unmount; feed/speech/snack timers leaked the same way. | Untracked `setTimeout` calls. | [TvScreen.tsx:20](src/components/pet/TvScreen.tsx#L20), [PetRoom.tsx:136](src/components/pet/PetRoom.tsx#L136-L143) |
| F-15 | **P2** | Only the Notes sprite honoured `prefers-reduced-motion`; dozens of infinite sprite/TV animations kept running on the Helio G85. No user control. | Missing global kill switch + preference. | [appPreferences.ts](src/lib/preferences/appPreferences.ts), [index.css](src/index.css), [main.tsx:9](src/main.tsx#L9) |
| F-16 | **P2** | Browser/`scrollIntoView` stopped with a focused button behind the floating `BottomNav`, so taps hit the nav instead of the button. | No `scroll-padding-bottom`. | [index.css](src/index.css) (`html { scroll-padding-bottom }`) |
| F-17 | **P2** | Vault empty state told the user to use a “(+) button above” that does not exist in the Pustaka tab. | Copy drift after the capture form moved to Beranda. | [VaultPage.tsx:1042](src/features/vault/VaultPage.tsx#L1042) |
| F-18 | **P3** | Note success notice never dismissed; it stacked across actions. | No auto-clear effect. | [NotesPage.tsx:216](src/features/notes/NotesPage.tsx#L216-L221) |
| F-19 | **P3** | Pagination/edit state could survive moving to another book. | Missing reset in prev/next handlers. | [VaultPage.tsx:820](src/features/vault/VaultPage.tsx#L820) |

### Accepted / external (not code defects)

- `telegram.org/js/telegram-web-app.js` remains the **single** allowed external script; it is required by the TMA contract and is `defer`red. A test now enforces that it is the only one.
- The configured gateway host (`*.trycloudflare.com`) currently fails DNS in this environment. The UI reports “Gagal menghubungi” / “Offline” honestly; this is infrastructure, not a frontend bug.
- `googleFonts` references are gone from both the shell and the SW, so no font request can leave the origin.

---

## 2. What changed (behavioural summary)

### Economy & data integrity
- Feeding now returns the engine `FeedResult`; the daily habit is fulfilled **only** on `success`, and the toast shows the real award (`+5 XP` first care, “Nyam!” on repeats).
- An in-flight latch blocks double-feed inside the same frame, on top of the engine's 2 s cooldown.
- Every pet mutation (decay, feed, night toggle, review pose, reward) goes through one write-through commit; the transitory “happy/feeding” reset timers are tracked and cleared on unmount.
- `isValidPet` requires finite, non-negative numbers; `sanitizeLoadedPet` clamps stats/threshold at load; `awardXp` normalises inputs and can no longer divide by a zero threshold.

### Backup / restore / reset (new)
- `exportPetalifeBackup` → schema-tagged JSON with links, notes, reward ledger, quiz history and pet snapshot.
- `parseBackupFile` validates schema/version/size (< 8 MB, ≤ 20 000 rows), sanitises each record, neutralises unknown enums, and **de-duplicates ids** (a duplicate key would abort `bulkAdd` and roll back the import).
- `restorePetalifeBackup` replaces all four tables in **one** transaction; invalid input never touches existing data.
- Two-step UI: file pick → “1 materi, 1 catatan … Timpa Data?” → import. Nothing is wiped on a single tap.
- Reset Mochi (pet only) and Reset Total (all tables) keep `PETALIFE_LAST_SEEN_MS`, so resetting cannot re-open old days for XP farming.

### Telegram environment
- New layered `useTelegramBackButton`: editor (30) → detail page (20) / draft sheet (40) / delete confirm (30). Closing a sheet no longer exits the Mini App.
- Note editor now measures the virtual keyboard (`useVisualViewportInset`) and caps its height, keeping the save button reachable.

### UX / performance
- Assistant: real pending lifecycle, error bubble instead of silence, auto-scroll anchor (respects reduced motion).
- Vault: delete is awaited with retryable feedback; single timer per toast channel.
- Settings: race-free diagnostics, night-mode toggle, “Kurangi Animasi” switch (persisted + applied before first paint), backup/restore/reset.
- Global reduced-motion kill switch in CSS; `scroll-padding-bottom` so focused controls are never behind the floating nav.

---

## 3. Verification performed

```
npx tsc -b                # 0 errors
npm run build             # success (PWA plugin precached 16 assets, skipped 2 JPEG fallbacks)
npx vitest run            # 31 files, 205 tests passed  (162 baseline + 43 new)
npm run lint              # 0 errors (40 warnings, pre-existing exhaustive-deps/ref patterns)
```

New regression suites:

| File | Locks |
|------|-------|
| `src/features/pet/engine/petIntegrity.test.ts` | NaN/Infinity rejection, load clamping, `awardXp` normalisation, feed contract (0 XP on reject) |
| `src/lib/db/backup.test.ts` | schema/version/size rejection, sanitisation, dedupe, atomic restore, reset keeps monotonic clock |
| `src/lib/utils/telegramBack.test.ts` | layer priority, closed layers, no-op outside Telegram |
| `src/lib/perf/networkPolicy.test.ts` | zero third-party font origins in shell and SW |
| `src/lib/perf/uxContracts.test.ts` | keyboard hook, back-button wiring, goal gating order, chat scroll anchor, reduced-motion CSS |
| `src/lib/preferences/appPreferences.test.ts` | preference round-trip, failure tolerance, root attribute mirroring |

Browser smoke test (Vite dev server, 430×1000 and 412×860 viewports):
- Settings renders both switches; “Kurangi Animasi” sets `html[data-reduce-motion="true"]`, persists `true`, and computes `animation-name: none`.
- Night-mode switch toggles `aria-checked` and the palette, then reverts.
- Import picker accepted a synthetic backup and showed “1 materi, 1 catatan, 0 klaim reward”; cancelling left the DB at 4 rows.
- Notes editor opens focused, 664 px tall, save button fully visible; at 412×860 the floating nav no longer intercepts the “Catatan baru” tap.
- Assistant reply renders, `aria-busy` returns to `false`, thread scrolled to bottom.
- Feed: XP rose by feed + habit, `lastCareDate` recorded, state returned to `idle`.

---

## 4. Manual test guide (Telegram Mini App)

**Setup:** `npm run build`, publish `dist/`, open the bot’s Mini App on the Narzo 50A.

1. **Feed / habit (F-01, F-02)** — Let hunger drop ≤ 80, tap the snack. Toast must read `+5 XP` (first care today) or `Kue Stroberi • Nyam!` afterwards. Tap twice quickly: the second tap must be ignored (no snack animation, no extra XP).
2. **Hardware back (F-05)** — Catatan → open a note → Edit → type text → Android back: first press closes the editor, second leaves the note, third exits the Mini App. Repeat from Beranda with an AI draft sheet open.
3. **Keyboard (F-08)** — Catatan → Catatan baru → focus “Isi catatan”. The sheet must lift above the keyboard and “Simpan catatan” must remain tappable.
4. **Backup (F-04)** — Pengaturan → Ekspor Cadangan: a `petalife-backup-YYYY-MM-DD.json` file downloads. Change a note, then Impor the file → preview counts → Timpa Data → Vault/notes/pet restored.
5. **Bad backup** — Try importing a random `.json`. Expect a red-ish message, never a wiped Vault.
6. **Reset** — Reset Status Mochi returns level 1 with the Vault intact; Reset Total empties Pustaka and notes after two confirmations.
7. **Assistant (F-07)** — Send several messages: the thread follows the newest reply; kill the network → the reply bubble explains the failure instead of silence.
8. **Reduced motion (F-15)** — Pengaturan → Kurangi Animasi: sprite/TV animation stops immediately; relaunch the Mini App and it stays off.
9. **Vault delete (F-06)** — Delete a material. It disappears; relaunch and confirm it is still gone.

---

## 5. Remaining recommendations (not implemented)

- **Draft persistence for the AI sheet:** closing the sheet still discards the draft (now at least the back gesture closes the sheet instead of the app). Storing the draft in IndexedDB would make closing non-destructive.
- **Per-device server clock:** daily quotas rely on a local high-water mark; a signed server day would remove the remaining “set clock forward” loophole.
- **Telegram `initData` freshness:** `initData` is read on every request but never validated for age client-side; the backend must keep enforcing `auth_date`.
