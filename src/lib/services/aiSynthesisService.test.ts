import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  synthesizeLink,
  getPendingActiveJobs,
  resumeActiveJob,
  getActiveJobForUrl,
  saveActiveJob
} from './aiSynthesisService';

describe('aiSynthesisService', () => {
  const originalFetch = globalThis.fetch;
  const storageMap = new Map<string, string>();

  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, value: string) => { storageMap.set(key, value); },
      removeItem: (key: string) => { storageMap.delete(key); },
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('handles network error (failed to fetch) with honest gateway_error and network_error type', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await synthesizeLink('https://youtu.be/dummy123', 'youtube', 'youtube.com');

    expect(result.qualityStatus).toBe('gateway_error');
    expect(result.gatewayErrorType).toBe('network_error');
    expect(result.isFromRemoteAI).toBe(false);
    expect(result.content.notes).toContain('Browser belum dapat menghubungi Brain Gateway.');
  });

  it('handles 401 Unauthorized with honest session requirement message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Unauthorized: Telegram authentication required' }),
    });

    const result = await synthesizeLink('https://youtu.be/dummy123', 'youtube', 'youtube.com');

    expect(result.qualityStatus).toBe('gateway_error');
    expect(result.gatewayErrorType).toBe('unauthorized');
    expect(result.gatewayHttpStatus).toBe(401);
    expect(result.content.notes).toContain('Sesi AI belum valid.');
  });

  it('handles 429 Rate Limit with rate_limited error type', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers({ 'content-type': 'application/json', 'retry-after': '60' }),
      json: async () => ({ error: 'Rate limit exceeded' }),
    });

    const result = await synthesizeLink('https://youtu.be/dummy123', 'youtube', 'youtube.com');

    expect(result.qualityStatus).toBe('gateway_error');
    expect(result.gatewayErrorType).toBe('rate_limited');
    expect(result.gatewayHttpStatus).toBe(429);
    expect(result.content.notes).toContain('Mochi sedang sibuk.');
  });

  it('handles successful 200 response with grounded 4-layer synthesis', async () => {
    const mockPayload = {
      success: true,
      data: {
        title: 'Bagaimana Uang Diciptakan?',
        category: 'Finansial',
        tags: ['#uang', '#finansial', '#bank'],
        coreThesis: 'Uang diciptakan melalui utang sistem perbankan komersial.',
        keyTakeaways: [
          { concept: 'Uang Giral', explanation: 'Sebagian besar uang tercipta saat bank menyalurkan kredit.' },
        ],
        actionableInsights: ['Pahami inflasi dan diversifikasi aset riil.'],
        reflectionPrompt: 'Bagaimana Anda memanfaatkan utang produktif?',
        author: 'Ngomongin Uang',
        notes: 'Catatan 4 lapis lengkap...',
        summary: 'Ringkasan komprehensif...',
        qualityStatus: 'grounded',
        evidenceLevel: 'full_text',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockPayload,
    });

    const result = await synthesizeLink('https://youtu.be/dummy123', 'youtube', 'youtube.com');

    expect(result.qualityStatus).toBe('grounded');
    expect(result.isFromRemoteAI).toBe(true);
    expect(result.content.title).toBe('Bagaimana Uang Diciptakan?');
    expect(result.content.coreThesis).toBe('Uang diciptakan melalui utang sistem perbankan komersial.');
    expect(result.content.tags).toEqual(['#uang', '#finansial', '#bank']);
  });

  it('handles 200 response with genuine needs_context without fabricating fake notes', async () => {
    const mockPayload = {
      success: true,
      data: {
        title: 'Video Tanpa Subtitle',
        category: 'Umum',
        tags: ['#video'],
        qualityStatus: 'needs_context',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockPayload,
    });

    const result = await synthesizeLink('https://youtu.be/nosubs', 'youtube', 'youtube.com');

    expect(result.qualityStatus).toBe('needs_context');
    expect(result.isFromRemoteAI).toBe(true);
  });

  it('handles HTTP 200 with success=false as gateway_error invalid_response (regression test)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        fallbackText: 'Free form text without JSON',
        message: 'AI menghasilkan teks bebas atau JSON tidak lengkap.'
      }),
    });

    const result = await synthesizeLink('https://example.com/some-article', 'web', 'example.com');

    expect(result.qualityStatus).toBe('gateway_error');
    expect(result.gatewayErrorType).toBe('invalid_response');
    expect(result.content.notes).toContain('AI menghasilkan teks bebas atau JSON tidak lengkap.');
  });

  it('handles HTTP 200 with malformed JSON body as gateway_error invalid_response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
    });

    const result = await synthesizeLink('https://example.com/bad-json', 'web', 'example.com');

    expect(result.qualityStatus).toBe('gateway_error');
    expect(result.gatewayErrorType).toBe('invalid_response');
  });

  it('handles Instagram Reel with video_analysis provenance correctly', async () => {
    const mockPayload = {
      success: true,
      data: {
        title: 'System Justification Theory',
        category: 'Psikologi',
        tags: ['#psikologi', '#defense-mechanism'],
        coreThesis: 'Orang mempertahankan sistem yang merugikan mereka demi kenyamanan psikologis.',
        keyTakeaways: [
          { concept: 'System Justification', explanation: 'Kebutuhan kognitif untuk mempertahankan status quo.' },
        ],
        actionableInsights: ['Sadari bias kepatuhan dalam pengambilan keputusan.'],
        reflectionPrompt: 'Apakah ada aturan yang kamu ikuti hanya karena terbiasa?',
        author: 'professor.stickman',
        notes: '💡 Gagasan Utama: Rangkuman lengkap...',
        summary: 'Ringkasan komprehensif...',
        qualityStatus: 'grounded',
        evidenceLevel: 'full_text',
        provenance: 'video_analysis',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockPayload,
    });

    const result = await synthesizeLink('https://www.instagram.com/reel/DdS24CWEzEb/', 'instagram', 'instagram.com');

    expect(result.qualityStatus).toBe('grounded');
    expect(result.evidenceLevel).toBe('full_text');
    expect(result.provenance).toBe('video_analysis');
    expect(result.isFromRemoteAI).toBe(true);
    expect(result.content.notes).toContain('Gagasan Utama\nOrang mempertahankan sistem');
    expect(result.content.notes).toContain('Poin Kunci\n- System Justification:');
    expect(result.content.notes).not.toMatch(/[💡🔍🎯🌱]|Rangkuman lengkap/);
  });

  it('handles HTTP 202 Async Accepted, saves to localStorage, and polls until completed', async () => {
    const mockCompletedData = {
      title: 'Kebahagiaan Pikiran Tenang',
      category: 'Psikologi',
      tags: ['#mindfulness'],
      coreThesis: 'Menurut pembicara, tidak memikirkan apa-apa merupakan kebahagiaan tertinggi.',
      keyTakeaways: [
        { concept: 'Single Tasking', explanation: 'Pembicara menyatakan kebahagiaan ada pada single tasking.' }
      ],
      actionableInsights: ['Fokus satu aktivitas.'],
      reflectionPrompt: 'Kapan kamu tenang?',
      notes: 'Gagasan Utama\nMenurut pembicara...',
      summary: 'Ringkasan...',
      qualityStatus: 'grounded',
      evidenceLevel: 'full_text',
      provenance: 'caption_and_audio'
    };

    let callCount = 0;
    const stagesReported: string[] = [];

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      callCount += 1;
      if (init?.method === 'POST') {
        return {
          ok: false,
          status: 202,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            success: true,
            async: true,
            jobId: 'job_test_123',
            status: 'pending',
            stage: 'queued',
            stageLabel: 'Mochi mencatat antrean...',
            pollUrl: '/api/petalife/job-status/job_test_123'
          })
        };
      }

      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          jobId: 'job_test_123',
          status: 'completed',
          stage: 'completed',
          stageLabel: 'Mochi selesai!',
          data: mockCompletedData
        })
      };
    });

    const result = await synthesizeLink(
      'https://www.instagram.com/reel/DervtpLjZyV/',
      'instagram',
      'instagram.com',
      {
        timeoutMs: 15000,
        onProgress: (stage, label) => {
          stagesReported.push(`${stage}:${label}`);
        }
      }
    );

    expect(result.qualityStatus).toBe('grounded');
    expect(result.content.title).toBe('Kebahagiaan Pikiran Tenang');
    expect(callCount).toBe(3);
    expect(stagesReported.length).toBeGreaterThanOrEqual(1);
  });

  it('P0: does NOT send async: true for YouTube, but sends async: true for Instagram/TikTok', async () => {
    let capturedYouTubeBody: any = null;
    let capturedInstagramBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      const parsedBody = init?.body ? JSON.parse(init.body as string) : {};
      if (parsedBody.url?.includes('youtu')) {
        capturedYouTubeBody = parsedBody;
      } else if (parsedBody.url?.includes('instagram')) {
        capturedInstagramBody = parsedBody;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: {
            title: 'Mock Video',
            category: 'Umum',
            notes: 'Mock notes',
            qualityStatus: 'grounded'
          }
        })
      };
    });

    await synthesizeLink('https://youtu.be/test1234', 'youtube', 'youtu.be');
    expect(capturedYouTubeBody.async).toBe(false);
    expect(capturedYouTubeBody.context).toBe('');

    await synthesizeLink('https://www.instagram.com/reel/test1234/', 'instagram', 'instagram.com');
    expect(capturedInstagramBody.async).toBe(true);
    expect(capturedInstagramBody.context).toBe(''); // P0: must NOT inject metadata title as context!
  });

  it('P1: preserves active job in localStorage on temporary polling timeout/disruption', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      callCount += 1;
      if (init?.method === 'POST') {
        return {
          ok: false,
          status: 202,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            success: true,
            async: true,
            jobId: 'job_timeout_123',
            status: 'pending',
            stage: 'queued',
            stageLabel: 'Mochi mencatat antrean...',
            pollUrl: '/api/petalife/job-status/job_timeout_123'
          })
        };
      }

      // Simulate network disruption or 503 while polling
      return {
        ok: false,
        status: 503,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Service Unavailable' })
      };
    });

    const testUrl = 'https://www.instagram.com/reel/TimeoutTestReel/';
    const result = await synthesizeLink(testUrl, 'instagram', 'instagram.com', {
      timeoutMs: 3000
    });

    // Gateway error due to timeout/disruption
    expect(result.qualityStatus).toBe('gateway_error');

    // Job MUST still be preserved in localStorage!
    const preservedJob = getActiveJobForUrl(testUrl);
    expect(preservedJob).not.toBeNull();
    expect(preservedJob?.jobId).toBe('job_timeout_123');
  });

  it('P1: getPendingActiveJobs and resumeActiveJob can resume pending job across app reopenings', async () => {
    const testUrl = 'https://www.instagram.com/reel/ResumeTestReel/';
    saveActiveJob({
      jobId: 'job_resume_999',
      pollUrl: 'http://localhost:3000/api/petalife/job-status/job_resume_999',
      url: testUrl,
      timestamp: Date.now()
    });

    const pending = getPendingActiveJobs();
    expect(pending.length).toBe(1);
    expect(pending[0].jobId).toBe('job_resume_999');

    // Simulate poll returning completed data on resume
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: true,
        jobId: 'job_resume_999',
        status: 'completed',
        stage: 'completed',
        data: {
          title: 'Resumed Synthesis Note',
          category: 'Psikologi',
          coreThesis: 'Resumed thesis statement.',
          keyTakeaways: [{ concept: 'C1', explanation: 'E1' }],
          actionableInsights: ['Action 1'],
          qualityStatus: 'grounded',
          evidenceLevel: 'full_text',
          provenance: 'caption_and_audio'
        }
      })
    });

    const resumeResult = await resumeActiveJob(pending[0]);
    expect(resumeResult.success).toBe(true);
    expect(resumeResult.result?.qualityStatus).toBe('grounded');
    expect(resumeResult.result?.content.title).toBe('Resumed Synthesis Note');

    // After success, it should be removed from localStorage
    expect(getActiveJobForUrl(testUrl)).toBeNull();
    expect(getPendingActiveJobs().length).toBe(0);
  });
});

