import type { PlatformType, EvidenceLevel, LinkQualityStatus, CaptureMethod, GatewayErrorType, LinkProvenance } from '../types';
import { generateSmartVaultContent, type SmartVaultContent } from '../utils/noteGenerator';
import { formatStructuredNotes } from '../utils/noteView';
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
  provenance?: LinkProvenance;
  captureMethod: CaptureMethod;
  sourceExcerpt?: string;
  synthesizedAt?: number;
  gatewayErrorType?: GatewayErrorType;
  gatewayErrorMessage?: string;
  gatewayErrorAction?: string;
  gatewayHttpStatus?: number;
}

/**
 * Mochi Second Brain Comprehensive AI Synthesizer Service (Sol ADR-001 / ADR-002).
 *
 * Evidence-based ingestion pipeline:
 * 1. Resolves YouTube oEmbed metadata for real author & title.
 * 2. If genuine text evidence (user context, caption, or readable article) is present,
 *    calls remote Asisten Heru AI Gateway (/api/petalife/summarize-link) powered by Gemini & Groq.
 * 3. Never hallucinates fake 4-layer notes if source text is not genuinely available.
 * 4. Honest error propagation: distinguishes between missing transcript, auth failure (401),
 *    rate limit (429), server error (502/503), timeout, and network/DNS failures.
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

  let gatewayErrorType: GatewayErrorType | undefined;
  let gatewayErrorMessage: string | undefined;
  let gatewayErrorAction: string | undefined;
  let gatewayHttpStatus: number | undefined;

  if (apiUrl) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      const isVideoPlatform = platform === 'youtube' || platform === 'instagram' || platform === 'tiktok';
      timeout = setTimeout(() => controller.abort(), options.timeoutMs || (isVideoPlatform ? 90000 : 14000));

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
          context: userContext || (meta.isRealMetadata ? `Judul asli: ${meta.title} oleh ${meta.author || ''}` : '')
        }),
        signal: controller.signal,
      });

      gatewayHttpStatus = res.status;

      if (res.ok) {
        let json: any = null;
        try {
          json = await res.json();
        } catch {
          gatewayErrorType = 'invalid_response';
          gatewayErrorMessage = 'Respons Brain Gateway bukan JSON valid.';
          gatewayErrorAction = 'Periksa respon backend lalu coba lagi.';
        }

        if (json) {
          if (json.success && json.data && json.data.title) {
            const d = json.data;

            // Check if server indicated missing transcript
            if (d.qualityStatus === 'needs_context' && !d.notes) {
              gatewayErrorMessage = 'Transkrip video belum tersedia.';
              gatewayErrorAction = 'Tambah caption atau cuplikan teks materi.';
              const localSmart = generateSmartVaultContent(
                cleanUrl,
                platform,
                domain,
                d.title || meta.title,
                meta.author || d.author,
                userContext
              );
              return {
                content: { ...localSmart, thumbnailUrl: meta.thumbnailUrl },
                isFromRemoteAI: true,
                evidenceLevel: 'metadata_only',
                qualityStatus: 'needs_context',
                provenance: d.provenance || 'none',
                captureMethod,
                sourceExcerpt: userContext ? userContext.slice(0, 300) : undefined,
                gatewayErrorMessage,
                gatewayErrorAction,
                gatewayHttpStatus: 200,
              };
            }

            // Render from the verified structured fields. Backend freeform notes can
            // contain duplicated headings, emoji and extra claims outside these fields.
            const readableTakeaways = Array.isArray(d.keyTakeaways)
              ? d.keyTakeaways.filter((item: unknown): item is { concept: string; explanation: string } =>
                  typeof item === 'object' && item !== null &&
                  typeof (item as { concept?: unknown }).concept === 'string' &&
                  typeof (item as { explanation?: unknown }).explanation === 'string')
              : [];
            const readableActions = Array.isArray(d.actionableInsights)
              ? d.actionableInsights.filter((item: unknown): item is string => typeof item === 'string')
              : [];
            const hasSubstantiveContent = Boolean(typeof d.coreThesis === 'string' && d.coreThesis.trim() &&
              readableTakeaways.length && readableActions.length);
            const formattedNotes = hasSubstantiveContent
              ? formatStructuredNotes({
                  coreThesis: d.coreThesis,
                  keyTakeaways: readableTakeaways,
                  actionableInsights: readableActions,
                  reflectionPrompt: d.reflectionPrompt,
                })
              : (typeof d.notes === 'string' ? d.notes : '');
            const evidenceLevel: EvidenceLevel = d.evidenceLevel === 'full_text' || d.evidenceLevel === 'excerpt'
              ? d.evidenceLevel
              : (userContext ? 'excerpt' : (meta.isRealMetadata ? 'metadata_only' : 'url_only'));
            const qualityStatus: LinkQualityStatus = d.qualityStatus === 'grounded' && hasSubstantiveContent &&
              (evidenceLevel === 'full_text' || evidenceLevel === 'excerpt') ? 'grounded' : 'needs_context';

            const provenance: LinkProvenance = d.provenance || (
              platform === 'youtube'
                ? 'youtube_transcript'
                : (platform === 'instagram' || platform === 'tiktok'
                    ? (d.qualityStatus === 'grounded' ? 'video_analysis' : 'none')
                    : (userContext ? 'manual_context' : 'none'))
            );

            return {
              content: {
                title: d.title,
                category: d.category || 'Umum',
                coreThesis: d.coreThesis || d.summary || '',
                keyTakeaways: readableTakeaways,
                actionableInsights: readableActions,
                reflectionPrompt: d.reflectionPrompt || '',
                notes: formattedNotes,
                summary: d.coreThesis || d.summary || '',
                tags: Array.isArray(d.tags) ? d.tags : ['#wawasan', '#vault'],
                author: meta.author || d.author,
                thumbnailUrl: typeof d.thumbnailUrl === 'string' && /^https:\/\//i.test(d.thumbnailUrl)
                  ? d.thumbnailUrl : meta.thumbnailUrl,
              },
              isFromRemoteAI: true,
              evidenceLevel,
              qualityStatus,
              provenance,
              captureMethod,
              sourceExcerpt: userContext ? userContext.slice(0, 300) : (d.sourceExcerpt || undefined),
              synthesizedAt: qualityStatus === 'grounded' ? Date.now() : undefined,
              gatewayHttpStatus: res.status,
            };
          } else {
            gatewayErrorType = 'invalid_response';
            gatewayErrorMessage = json.message || json.error || 'AI menghasilkan format respons yang tidak valid.';
            gatewayErrorAction = 'Tekan Sintesis Ulang untuk mencoba kembali.';
          }
        }
      } else if (res.status === 401) {
        gatewayErrorType = 'unauthorized';
        gatewayErrorMessage = 'Sesi AI belum valid.';
        gatewayErrorAction = 'Buka lewat Telegram Mini App atau masuk ulang.';
      } else if (res.status === 429) {
        gatewayErrorType = 'rate_limited';
        gatewayErrorMessage = 'Mochi sedang sibuk.';
        gatewayErrorAction = 'Coba lagi setelah jeda; kuota batas permintaan tercapai.';
      } else if (res.status === 502 || res.status === 503 || res.status === 504) {
        gatewayErrorType = 'server_error';
        gatewayErrorMessage = 'Sintesis server belum tersedia.';
        gatewayErrorAction = 'Simpan bookmark, lalu Sintesis ulang.';
      } else {
        gatewayErrorType = 'invalid_response';
        gatewayErrorMessage = `Server mengembalikan status HTTP ${res.status}.`;
        gatewayErrorAction = 'Periksa konfigurasi gateway atau coba lagi.';
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        gatewayErrorType = 'timeout';
        gatewayErrorMessage = 'Pemrosesan terlalu lama (timeout).';
        gatewayErrorAction = 'Coba lagi.';
      } else {
        gatewayErrorType = 'network_error';
        gatewayErrorMessage = 'Browser belum dapat menghubungi Brain Gateway.';
        gatewayErrorAction = 'Periksa koneksi dan URL; Coba lagi.';
      }
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  // Tier 3: Client-side ADR-001 compliant synthesizer
  const localSmart = generateSmartVaultContent(
    cleanUrl,
    platform,
    domain,
    meta.title,
    meta.author,
    userContext,
    gatewayErrorType
      ? {
          type: gatewayErrorType,
          message: gatewayErrorMessage || '',
          action: gatewayErrorAction || '',
          status: gatewayHttpStatus,
        }
      : undefined
  );
  
  // Sol ADR-001 & ADR-002: Distinguish between missing context and genuine gateway errors
  const evidenceLevel: EvidenceLevel = userContext
    ? 'excerpt'
    : (meta.isRealMetadata ? 'metadata_only' : 'url_only');

  const qualityStatus: LinkQualityStatus = gatewayErrorType
    ? 'gateway_error'
    : (userContext ? 'draft' : 'needs_context');

  return {
    content: { ...localSmart, thumbnailUrl: meta.thumbnailUrl },
    isFromRemoteAI: false,
    evidenceLevel,
    qualityStatus,
    provenance: userContext ? 'manual_context' : 'none',
    captureMethod,
    sourceExcerpt: userContext ? userContext.slice(0, 300) : undefined,
    synthesizedAt: userContext ? Date.now() : undefined,
    gatewayErrorType,
    gatewayErrorMessage,
    gatewayErrorAction,
    gatewayHttpStatus,
  };
}
