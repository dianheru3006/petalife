import type { SavedLink, Note, Pet, NavigationTab } from '../../../lib/types';
import { getUserDisplayName } from '../../../lib/utils';
import { buildPetalifeAuthHeaders, getAnonSessionToken } from '../../../lib/services/aiSynthesisService';

export interface AssistantResponse {
  replyText: string;
  suggestedAction?: {
    label: string;
    targetTab: NavigationTab;
  };
}

/**
 * Grounded Knowledge Assistant Engine for Petalife (Phase 4)
 *
 * Responds intelligently using the user's real IndexedDB SavedLinks, Notes, and Pet status.
 * Ensures zero hallucination: quotes directly from materials the user actually owns.
 */
export function processAssistantMessage(
  userQuery: string,
  context: {
    links: SavedLink[];
    notes: Note[];
    pet: Pet;
  }
): AssistantResponse {
  const query = userQuery.trim().toLowerCase();
  const { links, notes, pet } = context;

  // 1. Pet Status & Wellbeing Query
  if (
    query.includes('mochi') ||
    query.includes('pet') ||
    query.includes('status') ||
    query.includes('hungry') ||
    query.includes('level') ||
    query.includes('keadaan mochi') ||
    query.includes('kabar mochi')
  ) {
    const hungerStatus = pet.hunger >= 90 ? 'kenyang' : pet.hunger < 30 ? 'mulai lapar' : 'cukup kenyang';
    const reply = `Keadaan Mochi · Level ${pet.level}\n\nKenyang: ${pet.hunger}% (${hungerStatus})\nAfeksi: ${pet.mood}%\nEnergi: ${pet.energy}%\nXP: ${pet.exp} / ${pet.expToNextLevel}\nRangkaian belajar: ${pet.streakDays} hari\n\nMeninjau materi dan menulis catatan membantu Mochi bertumbuh.`;

    return {
      replyText: reply,
      suggestedAction: {
        label: pet.hunger < 100 ? 'Kunjungi Mochi' : 'Buka Pustaka',
        targetTab: pet.hunger < 100 ? 'home' : 'vault',
      },
    };
  }

  // 2. Study Vault Overview / "What should I review?"
  if (
    query.includes('what should i review') ||
    query.includes('vault') ||
    query.includes('summarize my vault') ||
    query.includes('summary of vault') ||
    query.includes('overview') ||
    query.includes('pustaka') ||
    query.includes('tinjau')
  ) {
    const toReview = links.filter(l => l.status === 'to_review');
    const inProgress = links.filter(l => l.status === 'in_progress');
    const mastered = links.filter(l => l.status === 'completed');

    if (links.length === 0) {
      return {
        replyText: 'Pustakamu masih kosong. Simpan tautan materi untuk mulai belajar bersama Mochi.',
        suggestedAction: { label: 'Buka Pustaka', targetTab: 'vault' },
      };
    }

    let reply = `Ringkasan Pustaka · ${links.length} materi\n\nPerlu ditinjau: ${toReview.length}\nSedang dipelajari: ${inProgress.length}\nSelesai: ${mastered.length}\n\n`;

    if (toReview.length > 0) {
      reply += `Bacaan berikutnya: "${toReview[0].title}" (${toReview[0].domain})`;
    } else {
      reply += 'Semua materi tersimpan sudah kamu tinjau.';
    }

    return {
      replyText: reply,
      suggestedAction: { label: 'Buka Pustaka', targetTab: 'vault' },
    };
  }

  // 3. Content Search in Notes & Vault
  // Extract keywords
  const matchedNotes = notes.filter(n =>
    n.title.toLowerCase().includes(query) ||
    n.body.toLowerCase().includes(query) ||
    n.tags.some(t => query.includes(t.toLowerCase()))
  );

  const matchedLinks = links.filter(l =>
    l.title.toLowerCase().includes(query) ||
    (l.notes && l.notes.toLowerCase().includes(query)) ||
    (l.summary && l.summary.toLowerCase().includes(query)) ||
    l.tags.some(t => query.includes(t.toLowerCase()))
  );

  if (matchedNotes.length > 0 || matchedLinks.length > 0) {
    let reply = `Ditemukan untuk "${userQuery}":\n\n`;

    if (matchedNotes.length > 0) {
      const n = matchedNotes[0];
      reply += `Catatan: "${n.title}"\n${n.body.slice(0, 160)}${n.body.length > 160 ? '...' : ''}\n\n`;
    }

    if (matchedLinks.length > 0) {
      const l = matchedLinks[0];
      reply += `Pustaka: "${l.title}" (${l.domain})\n${l.notes || l.summary || 'Tersimpan untuk ditinjau.'}\n`;
    }

    return {
      replyText: reply,
      suggestedAction: matchedNotes.length > 0
        ? { label: 'Buka Catatan', targetTab: 'notes' }
        : { label: 'Buka Pustaka', targetTab: 'vault' },
    };
  }

  // 5. Cooking & Recipes keyword fallback
  if (query.includes('recipe') || query.includes('cook') || query.includes('dimsum') || query.includes('resep') || query.includes('masak')) {
    const cookNotes = notes.filter(n => n.tags.includes('cooking') || n.title.toLowerCase().includes('dimsum'));
    if (cookNotes.length > 0) {
      return {
        replyText: `Resep yang kamu simpan:\n\n"${cookNotes[0].title}"\n\n${cookNotes[0].body}`,
        suggestedAction: { label: 'Buka Catatan', targetTab: 'notes' },
      };
    }
  }

  // 6. Architecture / Clean Code keyword fallback
  if (query.includes('architecture') || query.includes('clean') || query.includes('code') || query.includes('dependency')) {
    const archNotes = notes.filter(n => n.tags.includes('coding') || n.tags.includes('architecture'));
    if (archNotes.length > 0) {
      return {
        replyText: `Dari catatanmu:\n\n"${archNotes[0].title}"\n\n${archNotes[0].body}`,
        suggestedAction: { label: 'Buka Catatan', targetTab: 'notes' },
      };
    }
  }

  // 7. General Knowledge / Friendly Companion Fallback
  return {
    replyText: `Aku sudah memeriksa ${links.length} materi dan ${notes.length} catatan, tetapi belum menemukan jawaban untuk "${userQuery}".\n\nCoba tanyakan keadaan Mochi, minta ringkasan Pustaka, atau tanyakan materi yang perlu ditinjau.`,
    suggestedAction: { label: 'Buka Pustaka', targetTab: 'vault' },
  };
}

/**
 * Hybrid Assistant Query:
 * Queries the remote Bot Asisten Heru (audit-narzo) backend for intelligent responses,
 * and seamlessly falls back to the local grounded IndexedDB engine if the bot server is offline.
 */
export async function queryAssistant(
  userQuery: string,
  context: {
    links: SavedLink[];
    notes: Note[];
    pet: Pet;
  }
): Promise<AssistantResponse> {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BOT_API_URL) as string | undefined;
  // Static hosts (such as GitHub Pages) reject POST requests with 405; only query network when an explicit
  // remote gateway URL is provided or when hosted on a server origin with backend API support.
  const isStaticHost = typeof window !== 'undefined' && Boolean(window.location?.hostname?.endsWith('github.io'));
  const apiBase = (envUrl || '').replace(/\/$/, '');
  const apiUrl = envUrl || (!isStaticHost ? '/api/petalife/chat' : null);

  if (apiUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      // R3-PROD-01: pengunjung web publik memakai sesi anonim; pengguna Telegram
      // tetap memakai initData.
      const headers = await buildPetalifeAuthHeaders(apiBase, controller.signal);
      headers['Content-Type'] = 'application/json';

      const requestInit: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: userQuery,
          context: {
            pet: context.pet,
            links: context.links.slice(0, 5),
            notes: context.notes.slice(0, 5),
            user: {
              name: getUserDisplayName(),
            },
          },
        }),
        signal: controller.signal,
      };

      try {
        let res = await fetch(apiUrl, requestInit);
        if (res.status === 401 && !headers['X-Telegram-Init-Data']) {
          const refreshed = await getAnonSessionToken(apiBase, controller.signal, { force: true });
          if (refreshed) {
            headers['X-Petalife-Session'] = refreshed;
            res = await fetch(apiUrl, requestInit);
          }
        }

        if (res.ok) {
          const data = (await res.json()) as AssistantResponse;
          if (data && data.replyText) {
            return data;
          }
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      // Graceful offline fallback to local grounded engine
    }
  }

  return processAssistantMessage(userQuery, context);
}

