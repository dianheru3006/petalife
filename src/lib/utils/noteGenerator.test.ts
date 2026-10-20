import { describe, it, expect } from 'vitest';
import { generateSmartVaultContent } from './noteGenerator';

describe('Sol ADR-001 Note Generator & Knowledge Synthesizer', () => {
  it('generates comprehensive 4-layer Second Brain notes without any quiz for open articles', () => {
    const result = generateSmartVaultContent(
      'https://paulgraham.com/makersschedule.html',
      'web',
      'paulgraham.com',
      'Maker Schedule vs Manager Schedule'
    );

    expect(result.title).toBe('Maker Schedule vs Manager Schedule');
    expect(result.coreThesis).toBeDefined();
    expect(result.keyTakeaways.length).toBeGreaterThan(0);
    expect(result.actionableInsights.length).toBeGreaterThan(0);
    expect(result.reflectionPrompt).toBeDefined();
    expect(result.notes).toContain('Gagasan Utama\n');
    expect(result.notes).toContain('Poin Kunci\n');
    expect(result.notes).toContain('Aksi Praktis\n');
    expect(result.notes).toContain('Refleksi Diri\n');
    expect(result.notes).not.toMatch(/[💡🔍🎯🌱]|\*\*/);

    // STRICT CHECK: NO QUIZ ALLOWED
    expect((result as any).quiz_question).toBeUndefined();
    expect((result as any).quiz_options).toBeUndefined();
    expect((result as any).quiz_answer).toBeUndefined();
    expect(result.notes).not.toContain('Kuis Camilan Mochi');
  });

  it('honors ADR-001 for closed social platforms (Instagram/Threads/X) without text: does NOT hallucinate fake takeaways', () => {
    const instagramResult = generateSmartVaultContent(
      'https://instagram.com/p/C_abc123',
      'instagram',
      'instagram.com'
    );

    // Must be marked as honest bookmark waiting for context
    expect(instagramResult.title).toContain('Bookmark Instagram');
    expect(instagramResult.keyTakeaways).toHaveLength(0);
    expect(instagramResult.actionableInsights).toHaveLength(0);
    expect(instagramResult.notes).toContain('Tautan Tersimpan sebagai Bookmark');
    expect(instagramResult.notes).toContain('Mochi belum dapat membaca isi postingan ini karena platform membatasi akses tanpa login');
  });

  it('does not turn a gateway outage into canned takeaways, even with source context', () => {
    const result = generateSmartVaultContent(
      'https://example.com/article', 'web', 'example.com', 'Fokus kerja', undefined,
      'Artikel ini membahas cara mengurangi notifikasi ketika bekerja.',
      { type: 'network_error', message: 'Tidak terhubung.', action: 'Coba lagi.' },
    );
    expect(result.keyTakeaways).toEqual([]);
    expect(result.actionableInsights).toEqual([]);
    expect(result.notes).toContain('Koneksi gateway: Tidak terhubung.');
    expect(result.notes).not.toMatch(/[💡🔍🎯🌱]/);
  });

  it('synthesizes comprehensive notes when user provides caption context for closed platforms', () => {
    const userCaption = 'Belajar prinsip deep work dan fokus bebas distraksi';
    const threadsResult = generateSmartVaultContent(
      'https://threads.net/@user/post/12345',
      'web',
      'threads.net',
      undefined,
      undefined,
      userCaption
    );

    expect(threadsResult.keyTakeaways.length).toBeGreaterThan(0);
    expect(threadsResult.actionableInsights.length).toBeGreaterThan(0);
    expect(threadsResult.notes).not.toContain('Mochi belum dapat membaca');
  });

  it('correctly categorizes YouTube video "Bagaimana Uang Bisa Jadi Segalanya?" as Finansial (not Tech) and avoids fake takeaways without transcript', () => {
    const youtubeResult = generateSmartVaultContent(
      'https://youtu.be/z5rgIeCg0FU?si=g-cRpEt7gXPLQY70',
      'youtube',
      'youtu.be',
      'Bagaimana Uang Bisa Jadi Segalanya?'
    );

    // 1. Must NEVER be categorized as Tech (due to substring "ai" in "Bagaimana")
    expect(youtubeResult.category).toBe('Finansial');
    expect(youtubeResult.tags).toContain('#finansial');
    expect(youtubeResult.tags).not.toContain('#tech');
    expect(youtubeResult.tags).not.toContain('#coding');

    // 2. Sol ADR-001: Without transcript/user context, must NOT hallucinate software takeaways
    expect(youtubeResult.keyTakeaways).toHaveLength(0);
    expect(youtubeResult.actionableInsights).toHaveLength(0);
    expect(youtubeResult.notes).not.toContain('Separation of Concerns');
    expect(youtubeResult.notes).not.toContain('Offline-First');
    expect(youtubeResult.notes).toContain('Mochi baru berhasil mencatat judul');
  });
});
