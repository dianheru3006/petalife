import type { SavedLink } from '../types';

export type NoteSectionKind = 'thesis' | 'takeaways' | 'actions' | 'reflection' | 'general';

export interface NoteViewSection {
  kind: NoteSectionKind;
  title: string;
  lines: { text: string; bullet: boolean }[];
}

const SECTION_TITLES: Record<NoteSectionKind, string> = {
  thesis: 'Gagasan Utama',
  takeaways: 'Poin Kunci',
  actions: 'Aksi Praktis',
  reflection: 'Refleksi Diri',
  general: 'Catatan',
};

function cleanInline(text: string): string {
  return text
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, concept: string, label: string | undefined) => label || concept)
    .replace(/[\[\]]/g, '')
    .replace(/\*\*/g, '')
    .replace(/\s*:\s*:\s*/g, ': ')
    .replace(/\s*:\s*\]/g, ':')
    .replace(/\s+/g, ' ')
    .trim();
}

function headingKind(line: string): NoteSectionKind | null {
  const heading = cleanInline(line).replace(/^[^\p{L}]+/u, '').replace(/:$/, '').trim().toLowerCase();
  if (heading === 'gagasan utama') return 'thesis';
  if (heading === 'poin kunci' || heading === 'analisis mendalam & poin kunci' || heading === 'model mental & poin kunci') return 'takeaways';
  if (heading === 'aksi praktis' || heading === 'aksi praktis (24 jam)') return 'actions';
  if (heading === 'refleksi diri' || heading === 'refleksi diri & uji asumsi') return 'reflection';
  return null;
}

export function getNoteViewSections(notes: string): NoteViewSection[] {
  const sections: NoteViewSection[] = [];
  let current: NoteViewSection | null = null;

  for (const rawLine of notes.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const kind = headingKind(line);
    if (kind) {
      current = { kind, title: SECTION_TITLES[kind], lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { kind: 'general', title: SECTION_TITLES.general, lines: [] };
      sections.push(current);
    }
    const bullet = /^(?:[-*]|\d+[.)])\s+/.test(line);
    const text = cleanInline(line.replace(/^(?:[-*]|\d+[.)])\s+/, ''));
    if (text) current.lines.push({ text, bullet });
  }

  return sections.filter(section => section.lines.length > 0);
}

export function noteSummary(notes: string): string {
  const sections = getNoteViewSections(notes);
  const lead = sections.find(section => section.kind === 'thesis') || sections[0];
  return (lead?.lines.map(line => line.text).join(' ') || '').slice(0, 150);
}

export function noteTextForDraft(link: SavedLink): string {
  const notes = link.notes || link.summary || '';
  if (!/^#\s*📺|^##\s+.*(?:Draf Threads|Catatan Terkait di Vault)/m.test(notes) || !link.coreThesis) {
    return notes;
  }

  const takeaways = (link.keyTakeaways || [])
    .map(item => `- **${cleanInline(item.concept)}:** ${cleanInline(item.explanation)}`)
    .join('\n');
  const actions = (link.actionableInsights || []).map(item => `- ${cleanInline(item)}`).join('\n');
  return [
    `💡 **Gagasan Utama:**\n${cleanInline(link.coreThesis)}`,
    takeaways && `🔍 **Model Mental & Poin Kunci:**\n${takeaways}`,
    actions && `🎯 **Aksi Praktis (24 Jam):**\n${actions}`,
    link.reflectionPrompt && `🌱 **Refleksi Diri:**\n${cleanInline(link.reflectionPrompt)}`,
  ].filter(Boolean).join('\n\n');
}
