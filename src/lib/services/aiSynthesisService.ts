import type { PlatformType, EvidenceLevel, LinkQualityStatus, CaptureMethod, GatewayErrorType, LinkProvenance } from '../types';
import { detectPlatform } from '../utils';
import { generateSmartVaultContent, type SmartVaultContent } from '../utils/noteGenerator';
import { formatStructuredNotes } from '../utils/noteView';
import { resolveLinkMetadata } from './linkMetadataService';
import { getBrainGatewayUrl, DEFAULT_BRAIN_GATEWAY_URL } from './brainGatewaySettings';

export interface AISynthesizeOptions {
  context?: string;
  timeoutMs?: number;
  captureMethod?: CaptureMethod;
  onProgress?: (stage: string, stageLabel: string) => void;
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

const ACTIVE_JOB_STORAGE_KEY = 'petalife_active_async_jobs';

export interface ActiveJobRecord {
  jobId: string;
  pollUrl: string;
  url: string;
  timestamp: number;
}

export function saveActiveJob(record: ActiveJobRecord): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const existing = getActiveJobs();
    existing[record.url] = record;
    localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, JSON.stringify(existing));
  } catch (_) {}
}

export function getActiveJobForUrl(url: string): ActiveJobRecord | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const existing = getActiveJobs();
    const record = existing[url];
    if (!record) return null;
    if (Date.now() - record.timestamp > 2 * 60 * 60 * 1000) {
      clearActiveJob(url);
      return null;
    }
    return record;
  } catch (_) {
    return null;
  }
}

export function clearActiveJob(url: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const existing = getActiveJobs();
    delete existing[url];
    localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, JSON.stringify(existing));
  } catch (_) {}
}

export function getPendingActiveJobs(): ActiveJobRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const existing = getActiveJobs();
    const now = Date.now();
    const activeList: ActiveJobRecord[] = [];
    for (const [url, record] of Object.entries(existing)) {
      if (!record || typeof record !== 'object') continue;
      if (now - (record.timestamp || 0) > 2 * 60 * 60 * 1000) {
        clearActiveJob(url);
      } else {
        activeList.push(record);
      }
    }
    return activeList;
  } catch (_) {
    return [];
  }
}

function getActiveJobs(): Record<string, ActiveJobRecord> {
  try {
    const raw = localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

export function formatSynthesizedData(
  d: any,
  cleanUrl: string,
  platform: PlatformType,
  domain: string,
  meta: { title?: string; author?: string; thumbnailUrl?: string; isRealMetadata?: boolean },
  userContext: string = '',
  captureMethod: CaptureMethod = 'manual_paste',
  httpStatus: number = 200
): SynthesizedLinkResult {
  if (d.qualityStatus === 'needs_context' && !d.notes) {
    const gatewayErrorMessage = 'Transkrip video belum tersedia.';
    const gatewayErrorAction = 'Tambah caption atau cuplikan teks materi.';
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
      gatewayHttpStatus: httpStatus,
    };
  }

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
    gatewayHttpStatus: httpStatus,
  };
}

async function pollJobUntilFinished(
  pollUrl: string,
  headers: Record<string, string>,
  onProgress?: (stage: string, stageLabel: string) => void,
  signal?: AbortSignal
): Promise<{ success: boolean; data?: any; error?: string; errorCode?: string; retryable?: boolean }> {
  const startTime = Date.now();
  // 150s buffer to cover server 120s worker deadline + queue wait
  const MAX_POLL_DURATION_MS = 150000;

  while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
    if (signal?.aborted) {
      const err = new Error('AbortError');
      err.name = 'AbortError';
      throw err;
    }

    const elapsed = Date.now() - startTime;
    const intervalMs = elapsed < 20000 ? 2500 : 4000;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    if (signal?.aborted) {
      const err = new Error('AbortError');
      err.name = 'AbortError';
      throw err;
    }

    let pollRes: Response;
    try {
      pollRes = await fetch(pollUrl, {
        method: 'GET',
        headers,
        signal
      });
    } catch (netErr: any) {
      if (netErr?.name === 'AbortError') throw netErr;
      // Temporary network drop: retry next loop
      continue;
    }

    if (!pollRes.ok) {
      if (pollRes.status === 401 || pollRes.status === 403) {
        return { success: false, error: 'Sesi atau otorisasi tidak valid.', errorCode: 'AUTH_ERROR', retryable: false };
      }
      return { success: false, error: `Status HTTP ${pollRes.status} saat memeriksa job.`, errorCode: 'HTTP_ERROR', retryable: true };
    }

    let pollJson: any = null;
    try {
      pollJson = await pollRes.json();
    } catch {
      return { success: false, error: 'Format status respons bukan JSON valid.', errorCode: 'INVALID_JSON', retryable: true };
    }

    if (!pollJson || !pollJson.success) {
      return { success: false, error: 'Respons status tidak valid.', errorCode: 'INVALID_STATUS', retryable: true };
    }

    if (onProgress && pollJson.stage) {
      onProgress(pollJson.stage, pollJson.stageLabel || 'Mochi sedang memproses...');
    }

    if (pollJson.status === 'completed') {
      return { success: true, data: pollJson.data };
    }

    if (pollJson.status === 'failed') {
      return {
        success: false,
        error: pollJson.errorMessage || 'Gagal memproses materi.',
        errorCode: pollJson.errorCode,
        retryable: Boolean(pollJson.retryable)
      };
    }
  }

  return { success: false, error: 'Batas waktu pemantauan status terlampaui.', errorCode: 'POLL_TIMEOUT', retryable: true };
}

export async function resumeActiveJob(
  record: ActiveJobRecord,
  onProgress?: (stage: string, stageLabel: string) => void
): Promise<{ success: boolean; result?: SynthesizedLinkResult; retryable?: boolean; error?: string }> {
  const initData = typeof window !== 'undefined'
    ? (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData || ''
    : '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  }

  const pollResult = await pollJobUntilFinished(
    record.pollUrl,
    headers,
    onProgress
  );

  if (pollResult.success && pollResult.data) {
    clearActiveJob(record.url);
    const { platform, domain } = detectPlatform(record.url);
    const meta = await resolveLinkMetadata(record.url, platform, domain);
    const result = formatSynthesizedData(pollResult.data, record.url, platform, domain, meta, '', 'manual_paste', 200);
    return { success: true, result };
  }

  if (!pollResult.retryable) {
    clearActiveJob(record.url);
    return { success: false, retryable: false, error: pollResult.error };
  }

  return { success: false, retryable: true, error: pollResult.error };
}

/**
 * Mochi Second Brain Comprehensive AI Synthesizer Service (Sol ADR-001 / ADR-002 / ADR-003).
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
      const isShortVideo = platform === 'instagram' || platform === 'tiktok';
      // P1: Client timeout >= 150s for async short videos to respect 120s worker deadline + queue
      // YouTube uses 75s (synchronous server 65s deadline)
      const defaultTimeout = isShortVideo ? 150000 : (platform === 'youtube' ? 75000 : 14000);
      timeout = setTimeout(() => controller.abort(), options.timeoutMs || defaultTimeout);

      const initData = typeof window !== 'undefined'
        ? (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData || ''
        : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
      }

      let json: any = null;

      // Syarat 4: Cek apakah ada job yang sedang berjalan di penyimpanan persisten localStorage
      const existingJob = getActiveJobForUrl(cleanUrl);
      if (existingJob) {
        if (options.onProgress) {
          options.onProgress('queued', 'Melanjutkan pemantauan proses Mochi...');
        }
        try {
          const pollResult = await pollJobUntilFinished(
            existingJob.pollUrl,
            headers,
            options.onProgress,
            controller.signal
          );
          if (pollResult.success && pollResult.data) {
            clearActiveJob(cleanUrl);
            json = { success: true, data: pollResult.data };
          } else if (!pollResult.retryable) {
            clearActiveJob(cleanUrl);
            gatewayErrorType = 'server_error';
            gatewayErrorMessage = pollResult.error || 'Sintesis video belum berhasil.';
            gatewayErrorAction = 'Tempelkan cuplikan teks materi.';
          } else {
            // Transient or timeout: do not clear, preserve active job for retry / auto-resume
            gatewayErrorType = 'server_error';
            gatewayErrorMessage = pollResult.error || 'Proses sedang berlangsung di latar belakang.';
            gatewayErrorAction = 'Mochi masih melanjutkan proses ini. Kamu bisa menunggu atau coba lagi.';
          }
        } catch (pollErr: any) {
          // If aborted or network dropped, DO NOT clear active job!
          if (pollErr?.name === 'AbortError') throw pollErr;
          gatewayErrorType = 'server_error';
          gatewayErrorMessage = 'Pemantauan status proses terputus.';
          gatewayErrorAction = 'Proses tetap berjalan di backend. Buka kembali aplikasi untuk melihat hasil.';
        }
      }

      if (!json) {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: cleanUrl,
            context: userContext || (meta.isRealMetadata ? `Judul asli: ${meta.title} oleh ${meta.author || ''}` : ''),
            // P0: strictly only true for supported short video platforms!
            async: isShortVideo
          }),
          signal: controller.signal,
        });

        gatewayHttpStatus = res.status;

        if (res.status === 202) {
          let jobPayload: any = null;
          try {
            jobPayload = await res.json();
          } catch {
            gatewayErrorType = 'invalid_response';
            gatewayErrorMessage = 'Respons antrean bukan JSON valid.';
          }

          if (jobPayload && jobPayload.jobId) {
            const pollUrl = `${gatewayUrl.replace(/\/$/, '')}${jobPayload.pollUrl || `/api/petalife/job-status/${jobPayload.jobId}`}`;
            saveActiveJob({
              jobId: jobPayload.jobId,
              pollUrl,
              url: cleanUrl,
              timestamp: Date.now()
            });

            if (options.onProgress && jobPayload.stage) {
              options.onProgress(jobPayload.stage, jobPayload.stageLabel || 'Mochi mencatat antrean...');
            }

            try {
              const pollResult = await pollJobUntilFinished(
                pollUrl,
                headers,
                options.onProgress,
                controller.signal
              );

              if (pollResult.success && pollResult.data) {
                clearActiveJob(cleanUrl);
                json = { success: true, data: pollResult.data };
              } else if (!pollResult.retryable) {
                clearActiveJob(cleanUrl);
                gatewayErrorType = 'server_error';
                gatewayErrorMessage = pollResult.error || 'Sintesis video belum berhasil.';
                gatewayErrorAction = 'Tempelkan cuplikan teks materi.';
              } else {
                // P1: Transient error or timeout: DO NOT delete active job!
                gatewayErrorType = 'server_error';
                gatewayErrorMessage = pollResult.error || 'Sintesis video memerlukan waktu lebih lama.';
                gatewayErrorAction = 'Mochi tetap memproses di latar belakang. Tekan Sintesis Ulang untuk memeriksa status.';
              }
            } catch (pollErr: any) {
              // P1: Network disconnect or timeout: DO NOT delete active job!
              if (pollErr?.name === 'AbortError') throw pollErr;
              gatewayErrorType = 'server_error';
              gatewayErrorMessage = 'Pemantauan status proses terputus.';
              gatewayErrorAction = 'Proses tetap berjalan di backend. Buka kembali aplikasi untuk memeriksa status.';
            }
          }
        } else if (res.ok) {
          try {
            json = await res.json();
          } catch {
            gatewayErrorType = 'invalid_response';
            gatewayErrorMessage = 'Respons Brain Gateway bukan JSON valid.';
            gatewayErrorAction = 'Periksa respon backend lalu coba lagi.';
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

        if (json) {
          if (json.success && json.data && json.data.title) {
            return formatSynthesizedData(
              json.data,
              cleanUrl,
              platform,
              domain,
              meta,
              userContext,
              captureMethod,
              res?.status || 200
            );
          } else {
            gatewayErrorType = 'invalid_response';
            gatewayErrorMessage = json.message || json.error || 'AI menghasilkan format respons yang tidak valid.';
            gatewayErrorAction = 'Tekan Sintesis Ulang untuk mencoba kembali.';
          }
        }
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
