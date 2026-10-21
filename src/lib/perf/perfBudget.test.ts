import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';

/**
 * R5-PERF-03: anggaran performa sebagai test, bukan sebagai ingatan.
 *
 * Bug precache Service Worker (fase audit sebelumnya) gagal tanpa satu pun test
 * merah: cache shell kosong, offline mati, semuanya "sukses". Anggaran yang
 * hanya hidup di kepala auditor akan hilang di commit berikutnya. Test ini
 * mengunci keputusan yang mahal untuk diulang:
 *   1. tipografi tidak boleh kembali ke origin pihak ketiga,
 *   2. font wajib variabel (bukan 10 face statis) dan muat anggaran byte,
 *   3. boot frame wajib ada, murni CSS lepas, dan tidak boleh menambah request.
 */

const rootUrl = new URL('../../../', import.meta.url);
const readText = (relativePath: string) => readFileSync(new URL(relativePath, rootUrl), 'utf-8');

const indexHtml = readText('index.html');
const indexCss = readText('src/index.css');

const FONT_BUDGET_BYTES = 90_000;

describe('perf budget: tipografi self-hosted', () => {
  it('tidak lagi memuat Google Fonts dari origin pihak ketiga', () => {
    expect(indexHtml).not.toContain('fonts.googleapis.com');
    expect(indexHtml).not.toContain('fonts.gstatic.com');
  });

  it('mempreload tepat dua file font lokal (bukan nol, bukan belasan)', () => {
    const preloads = [...indexHtml.matchAll(/<link\b[^>]*rel="preload"[^>]*as="font"[^>]*>/g)].map(m => m[0]);
    expect(preloads).toHaveLength(2);
    for (const tag of preloads) {
      expect(tag).toContain('type="font/woff2"');
      expect(tag).toContain('crossorigin');
      expect(tag).toMatch(/href="\.\/src\/assets\/fonts\/[a-z0-9-]+\.woff2"/);
    }
  });

  it('mendeklarasikan dua @font-face variabel dengan font-display swap', () => {
    const faces = [...indexCss.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)].map(m => m[1]);
    expect(faces).toHaveLength(2);

    const ranges = faces.map(body => body.match(/font-weight:\s*(\d+)\s+(\d+);/)).filter(Boolean);
    expect(ranges).toHaveLength(2);
    for (const face of faces) {
      expect(face).toMatch(/font-display:\s*swap;/);
      expect(face).toMatch(/format\('woff2'\)/);
      expect(face).toMatch(/unicode-range:/);
    }

    const names = faces.map(body => body.match(/font-family:\s*'([^']+)'/)?.[1]);
    expect(names.sort()).toEqual(['Nunito', 'Plus Jakarta Sans']);
  });

  it('memuat setiap file font di disk dan total byte masih dalam anggaran', () => {
    const files = [...indexCss.matchAll(/url\('\.\/(assets\/fonts\/[^']+\.woff2)'\)/g)].map(m => m[1]);
    expect(files).toHaveLength(2);

    const sizes = files.map(relativePath => statSync(new URL(`src/${relativePath}`, rootUrl)).size);
    for (const size of sizes) expect(size).toBeGreaterThan(1_000);

    const total = sizes.reduce((sum, size) => sum + size, 0);
    // Baseline lama: 10 face statis subset latin = 332.120 byte.
    expect(total).toBeLessThanOrEqual(FONT_BUDGET_BYTES);
  });
});

describe('perf budget: boot frame sebelum React', () => {
  it('ada di index.html dan disembunyikan murni oleh CSS saat #root terisi', () => {
    expect(indexHtml).toContain('id="boot-frame"');
    expect(indexHtml).toMatch(/#root:not\(:empty\)\s*~\s*#boot-frame\s*\{[^}]*visibility:\s*hidden/);
  });

  it('tidak menambah satu pun request jaringan', () => {
    const styleBlock = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
    expect(styleBlock.length).toBeGreaterThan(500);
    expect(styleBlock).not.toMatch(/url\(/);
    expect(styleBlock).not.toMatch(/https?:\/\//);
    // Font sistem: frame dicat tanpa menunggu byte font merek.
    expect(styleBlock).not.toMatch(/@font-face/);
  });

  it('memakai geometri yang sama dengan kartu diorama asli', () => {
    const styleBlock = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
    expect(styleBlock).toMatch(/aspect-ratio:\s*9\s*\/\s*13/);
    expect(styleBlock).toMatch(/border-radius:\s*32px/);
    expect(styleBlock).toMatch(/max-width:\s*348px/);
  });

  it('tidak menangkap klik saat masih terlihat', () => {
    const styleBlock = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
    expect(styleBlock).toMatch(/pointer-events:\s*none/);
  });
});
