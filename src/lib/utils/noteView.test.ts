import { describe, expect, it } from 'vitest';
import type { SavedLink } from '../types';
import { getNoteViewSections, noteSummary, noteTextForDraft } from './noteView';

describe('Mochi note reading view', () => {
  it('shows four readable layers from the note text without Obsidian syntax', () => {
    const sections = getNoteViewSections([
      '💡 **Gagasan Utama:**',
      'Blok fokus mengurangi interupsi.',
      '',
      '🔍 **Model Mental & Poin Kunci:**',
      '- **Lindungi pagi:** Kerjakan [[Deep Work|tugas sulit]] saat segar.',
      '',
      '🎯 **Aksi Praktis (24 Jam):**',
      '- Blokir tiga jam besok.',
      '',
      '🌱 **Refleksi Diri:**',
      'Kapan fokus saya paling kuat?'
    ].join('\n'));

    expect(sections.map(section => section.kind)).toEqual(['thesis', 'takeaways', 'actions', 'reflection']);
    expect(sections[1].lines[0]).toEqual({ text: 'Lindungi pagi: Kerjakan tugas sulit saat segar.', bullet: true });
    expect(noteSummary('💡 **Gagasan Utama:**\nBlok fokus mengurangi interupsi.')).toBe('Blok fokus mengurangi interupsi.');
  });

  it('replaces legacy raw Obsidian draft with its existing verified structured fields', () => {
    const link = {
      notes: '# 📺 Fokus Kerja\n- **Link Video:** https://youtu.be/qxABp0pjntU\n## 🧵 Draf Threads Multi-Sudut Pandang\nOpsi A',
      coreThesis: 'Blok fokus mengurangi interupsi.',
      keyTakeaways: [{ concept: 'Lindungi pagi', explanation: 'Kerjakan [[Deep Work|tugas sulit]] saat segar.' }],
      actionableInsights: ['Blokir tiga jam besok.'],
      reflectionPrompt: 'Kapan fokus saya paling kuat?',
    } as SavedLink;

    const draft = noteTextForDraft(link);
    expect(draft).toContain('Lindungi pagi');
    expect(draft).toContain('tugas sulit');
    expect(draft).not.toMatch(/# 📺|Link Video|Draf Threads|\[\[/);
  });

  it('cleans malformed wikilinks with stray colons and brackets seamlessly', () => {
    const raw = [
      '**Gagasan Utama:**',
      'AI butuh contoh konkret.',
      '',
      '**Poin Kunci:**',
      '- **[[Spesifikasi Berbasis Bukti (Evidence-Based PRD)]: ]** Menggunakan artefak nyata.',
      '',
      '**Refleksi Diri & Uji Asumsi:**',
      'Apakah saya sudah memberi referensi konkret?'
    ].join('\n');

    const sections = getNoteViewSections(raw);
    expect(sections.map(s => s.kind)).toEqual(['thesis', 'takeaways', 'reflection']);
    expect(sections[1].lines[0].text).toBe('Spesifikasi Berbasis Bukti (Evidence-Based PRD): Menggunakan artefak nyata.');
    expect(sections[1].lines[0].bullet).toBe(true);
  });

  it('keeps plain manual notes editable without claiming four invented layers', () => {
    expect(getNoteViewSections('Catatan pribadi pengguna.')).toEqual([
      { kind: 'general', title: 'Catatan', lines: [{ text: 'Catatan pribadi pengguna.', bullet: false }] },
    ]);
  });
});
