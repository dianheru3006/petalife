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
    expect(result.notes).toContain('💡 **Gagasan Utama:**');
    expect(result.notes).toContain('🔍 **Analisis Mendalam & Poin Kunci:**');
    expect(result.notes).toContain('🎯 **Aksi Praktis:**');
    expect(result.notes).toContain('🌱 **Refleksi Diri:**');

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
});
