import type { PlatformType, EvidenceLevel, LinkQualityStatus, CaptureMethod } from '../types';
import { generateSmartVaultContent, type SmartVaultContent } from '../utils/noteGenerator';
import { resolveLinkMetadata } from './linkMetadataService';
import { getBrainGatewayUrl, DEFAULT_BRAIN_GATEWAY_URL } from './brainGatewaySettings';

export interface AISynthesizeOptions {
  context?: string;
  timeoutMs?: number;
  captureMethod?: CaptureMethod;
}

export interface SynthesizedLinkResult {
  content: SmartVaultContent;
  isFromRemoteAI: boolean;
  evidenceLevel: EvidenceLevel;
  qualityStatus: LinkQualityStatus;
  captureMethod: CaptureMethod;
  sourceExcerpt?: string;
  synthesizedAt?: number;
}

/**
 * Mochi Second Brain Comprehensive AI Synthesizer Service (Sol ADR-001).
 *
 * Evidence-based ingestion pipeline:
 * 1. Resolves YouTube oEmbed metadata for real author & title.
 * 2. If genuine text evidence (user context, caption, or readable article) is present,
 *    calls remote Asisten Heru AI Gateway (/api/petalife/summarize-link) powered by Gemini & Groq.
 * 3. Never hallucinates fake 4-layer notes if source text is not genuinely available.
 *    Honors Sol's ADR-001 contract: grounded, needs_context, or bookmark_only.
 */
export async function synthesizeLink(
  url: string,
  platform: PlatformType,
  domain: string,
  options: AISynthesizeOptions = {}
): Promise<SynthesizedLinkResult> {
  const cleanUrl = url.trim();
  const captureMethod: CaptureMethod = options.captureMethod || 'manual_paste';
  const userContext = options.context?.trim() || '';

  // Tier 1: Client-side metadata resolution (e.g. YouTube oEmbed)
  const meta = await resolveLinkMetadata(cleanUrl, platform, domain);

  // Tier 2: Check remote AI gateway (Asisten Heru / Gemini Flash / Groq)
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BOT_API_URL) as string | undefined;
  const gatewayUrl = getBrainGatewayUrl() || envUrl || DEFAULT_BRAIN_GATEWAY_URL;
  const isStaticHost = typeof window !== 'undefined' && Boolean(window.location?.hostname?.endsWith('github.io'));
  const apiUrl = gatewayUrl
    ? `${gatewayUrl.replace(/\/$/, '')}/api/petalife/summarize-link`
    : (!isStaticHost ? '/api/petalife/summarize-link' : null);

  if (apiUrl) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), options.timeoutMs || (platform === 'youtube' ? 60000 : 14000));

      const initData = typeof window !== 'undefined'
        ? (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData || ''
        : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
      } else {
        headers['X-API-Secret'] = '6116a98e96fc145b95df22582a254ed24dce6123ce8d74240b7d49a10e17e891';
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: cleanUrl,
          context: userContext || (meta.isRealMetadata ? `Judul asli: ${meta.title} oleh ${meta.author || ''}` : '')
        }),
        signal: controller.signal,
      });
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

          const hasSubstantiveContent = Boolean(d.coreThesis && d.keyTakeaways?.length && d.actionableInsights?.length);
          const evidenceLevel: EvidenceLevel = d.evidenceLevel === 'full_text' || d.evidenceLevel === 'excerpt'
            ? d.evidenceLevel
            : (userContext ? 'excerpt' : (meta.isRealMetadata ? 'metadata_only' : 'url_only'));
          const qualityStatus: LinkQualityStatus = d.qualityStatus === 'grounded' && hasSubstantiveContent &&
            (evidenceLevel === 'full_text' || evidenceLevel === 'excerpt') ? 'grounded' : 'needs_context';

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
            evidenceLevel,
            qualityStatus,
            captureMethod,
            sourceExcerpt: userContext ? userContext.slice(0, 300) : undefined,
            synthesizedAt: qualityStatus === 'grounded' ? Date.now() : undefined,
          };
        }
      }
    } catch {
      // Graceful fallback to client-side ADR-001 synthesizer below
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  // Tier 3: Client-side ADR-001 compliant synthesizer
  const localSmart = generateSmartVaultContent(cleanUrl, platform, domain, meta.title, meta.author, userContext);
  
  // Sol ADR-001: If user did NOT provide text context and we don't have full article text,
  // metadata alone (like YouTube title or social link) is NEVER 'grounded'. It is 'needs_context'.
  const evidenceLevel: EvidenceLevel = userContext
    ? 'excerpt'
    : (meta.isRealMetadata ? 'metadata_only' : 'url_only');

  const qualityStatus: LinkQualityStatus = userContext
    ? 'draft'
    : 'needs_context';

  return {
    content: localSmart,
    isFromRemoteAI: false,
    evidenceLevel,
    qualityStatus,
    captureMethod,
    sourceExcerpt: userContext ? userContext.slice(0, 300) : undefined,
    synthesizedAt: userContext ? Date.now() : undefined,
  };
}
