import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Static contracts for fixes that need a real WebView to reproduce (Telegram
 * keyboard / hardware back / chat scroll). The repo already locks PWA budgets
 * this way; the alternative is a jsdom + testing-library stack that does not
 * exist here and would still not emulate Telegram's Android WebView.
 */

const rootUrl = new URL('../../../', import.meta.url);
const readText = (relativePath: string) => readFileSync(new URL(relativePath, rootUrl), 'utf-8');

describe('P0/P1 UI regression contracts', () => {
  it('the note editor measures the virtual keyboard and wires the back button', () => {
    const notes = readText('src/features/notes/NotesPage.tsx');
    expect(notes).toContain('useVisualViewportInset');
    expect(notes).toContain('useTelegramBackButton');
    expect(notes).toContain('keyboardInset');
  });

  it('the AI draft sheet closes before the Mini App on hardware back', () => {
    const sheet = readText('src/components/pet/MochiNoteSheet.tsx');
    expect(sheet).toContain('useTelegramBackButton');
    expect(sheet).toMatch(/id: 'mochi-note-sheet',\s*isOpen,\s*priority: 40/);
  });

  it('Settings exposes backup, import and both reset levels', () => {
    const settings = readText('src/features/settings/SettingsPage.tsx');
    expect(settings).toContain('exportPetalifeBackup');
    expect(settings).toContain('restorePetalifeBackup');
    expect(settings).toContain('resetPetalifeData');
    expect(settings).toContain('handleConfirmImport');
  });

  it('a rejected feed returns before the daily habit is fulfilled', () => {
    const app = readText('src/App.tsx');
    const guardIndex = app.indexOf('if (!result.success) return result;');
    // lastIndexOf: the audit comment above the handler also quotes the call.
    const goalIndex = app.lastIndexOf("fulfillDailyGoal('goal-2')");
    expect(guardIndex).toBeGreaterThan(-1);
    expect(goalIndex).toBeGreaterThan(guardIndex);
  });

  it('the assistant thread keeps a scroll anchor for new replies', () => {
    const assistant = readText('src/features/assistant/AssistantPage.tsx');
    expect(assistant).toContain('bottomRef.current');
    expect(assistant).toContain('scrollIntoView');
  });

  it('a global reduced-motion kill switch exists in CSS', () => {
    const css = readText('src/index.css');
    expect(css).toContain("html[data-reduce-motion=\"true\"] *");
    expect(css).toContain('animation: none !important');
  });
});
