import type { PlatformType } from '../types';
import { generateSmartVaultContent, type SmartVaultContent } from '../utils/noteGenerator';
import { resolveLinkMetadata } from './linkMetadataService';

export interface AISynthesizeOptions {
  context?: string;
  timeoutMs?: number;
}

/**
 * Mochi Second Brain Comprehensive AI Synthesizer Service.
 *
 * Multi-tier execution pipeline:
 * 1. Resolves YouTube oEmbed metadata for real author & title.
 * 2. Calls remote Asisten Heru AI Gateway (/api/petalife/summarize-link) powered by Gemini & Groq.
 * 3. Gracefully and seamlessly falls back to client-side heuristic Second Brain synthesizer
 *    if offline, unauthenticated, or server is unreachable.
 */
export async function synthesizeLink(
  url: string,
  platform: PlatformType,
  domain: string,
  options: AISynthesizeOptions = {}
): Promise<{
  content: SmartVaultContent;
  isFromRemoteAI: boolean;
}> {
  const cleanUrl = url.trim();

  // Tier 1: Client-side metadata resolution (e.g. YouTube oEmbed)
  const meta = await resolveLinkMetadata(cleanUrl, platform, domain);

  // Tier 2: Check remote AI gateway (Asisten Heru / Gemini Flash / Groq)
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BOT_API_URL) as string | undefined;
  const isStaticHost = typeof window !== 'undefined' && Boolean(window.location?.hostname?.endsWith('github.io'));
  const apiUrl = envUrl
    ? `${envUrl.replace(/\/$/, '')}/api/petalife/summarize-link`
    : (!isStaticHost ? '/api/petalife/summarize-link' : null);

  if (apiUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 14000);

      const initData = typeof window !== 'undefined'
        ? (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData || ''
        : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: cleanUrl,
          context: options.context || (meta.isRealMetadata ? `Judul asli video: ${meta.title} oleh ${meta.author || ''}` : '')
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && json.data.title) {
          const d = json.data;
          const formattedNotes = d.notes || [
            `💡 **Gagasan Utama:**\n${d.coreThesis || ''}`,
            d.keyTakeaways?.length
              ? `\n🔍 **Analisis Mendalam & Poin Kunci:**\n${d.keyTakeaways.map((t: { concept: string; explanation: string }) => `* **${t.concept}**: ${t.explanation}`).join('\n\n')}`
              : '',
            d.actionableInsights?.length
              ? `\n🎯 **Aksi Praktis:**\n${d.actionableInsights.map((a: string) => `* ${a}`).join('\n')}`
              : '',
            d.reflectionPrompt ? `\n🌱 **Refleksi Diri:**\n${d.reflectionPrompt}` : ''
          ].filter(Boolean).join('\n\n');

          return {
            content: {
              title: d.title,
              category: d.category || 'Umum',
              coreThesis: d.coreThesis || d.summary || '',
              keyTakeaways: Array.isArray(d.keyTakeaways) ? d.keyTakeaways : [],
              actionableInsights: Array.isArray(d.actionableInsights) ? d.actionableInsights : [],
              reflectionPrompt: d.reflectionPrompt || '',
              notes: formattedNotes,
              summary: d.coreThesis || d.summary || '',
              tags: Array.isArray(d.tags) ? d.tags : ['#wawasan', '#vault'],
              author: meta.author || d.author,
            },
            isFromRemoteAI: true,
          };
        }
      }
    } catch {
      // Graceful fallback to client-side synthesizer
    }
  }

  // Tier 3: Client-side heuristic Second Brain synthesizer
  const localSmart = generateSmartVaultContent(cleanUrl, platform, domain, meta.title, meta.author);
  return {
    content: localSmart,
    isFromRemoteAI: false,
  };
}
