import type { PlatformType } from '../types';

export interface SmartVaultContent {
  title: string;
  notes: string;
  summary: string;
  tags: string[];
}

export function generateSmartVaultContent(
  url: string,
  platform: PlatformType,
  domain: string
): SmartVaultContent {
  const lowerUrl = url.toLowerCase();

  // 1. Psychology & Mindset topics (matching user's reference screenshot)
  if (
    lowerUrl.includes('stickman') ||
    lowerUrl.includes('psikolog') ||
    lowerUrl.includes('mental') ||
    lowerUrl.includes('bias') ||
    lowerUrl.includes('mindset') ||
    lowerUrl.includes('habit')
  ) {
    return {
      title: 'Mengapa Orang Sulit Menerima Kebenaran',
      notes: `Saat menghadapi seseorang yang menolak bukti nyata, pahami bahwa mereka tidak selalu kekurangan logika. Fenomena ini sering kali didorong oleh mekanisme psikologis berikut:

* **System Justification**: Kecenderungan manusia untuk mempertahankan status quo atau keyakinan yang sudah ada demi menjaga rasa aman psikologis.
* **Confirmation Bias**: Kecenderungan menyaring fakta baru agar sesuai dengan apa yang sudah dipercayai sebelumnya.`,
      summary: 'Penjelasan psikologis mengapa fakta logis sering ditolak demi mempertahankan rasa aman mental.',
      tags: ['psikologi', 'mindset', 'edukasi', 'vault'],
    };
  }

  // 2. Tech, Coding & Second Brain
  if (
    lowerUrl.includes('code') ||
    lowerUrl.includes('dev') ||
    lowerUrl.includes('tech') ||
    lowerUrl.includes('ai') ||
    lowerUrl.includes('program') ||
    lowerUrl.includes('software')
  ) {
    return {
      title: `Wawasan Teknologi & Arsitektur (${domain})`,
      notes: `Catatan penting seputar konsep arsitektur dan efisiensi sistem yang dipelajari:

* **Prinsip Modular**: Memisahkan antarmuka pengguna dari logika penyimpanan data untuk menjaga keandalan aplikasi.
* **Optimasi Lokal**: Memanfaatkan penyimpanan offline agar aplikasi tetap responsif tanpa jeda jaringan.`,
      summary: 'Catatan arsitektur dan efisiensi teknologi untuk pengembangan mandiri.',
      tags: ['tech', 'arsitektur', 'learning', 'vault'],
    };
  }

  // 3. Instagram Reels
  if (platform === 'instagram') {
    return {
      title: 'Mengapa Orang Sulit Menerima Kebenaran',
      notes: `Saat menghadapi seseorang yang menolak bukti nyata, pahami bahwa mereka tidak selalu kekurangan logika. Fenomena ini sering kali didorong oleh mekanisme psikologis berikut:

* **System Justification**: Kecenderungan manusia untuk mempertahankan status quo atau keyakinan yang sudah ada demi menjaga rasa aman psikologis.
* **Refleksi Pribadi**: Belajar mendengarkan lebih dalam sebelum merespons perdebatan.`,
      summary: 'Wawasan psikologis interaksi manusia dari Instagram Reel.',
      tags: ['instagram', 'psikologi', 'shorts', 'vault'],
    };
  }

  // 4. YouTube Shorts / Video
  if (platform === 'youtube') {
    return {
      title: `Edukasi & Insight Ringkas (${domain})`,
      notes: `Poin kunci yang dicatat Mochi dari video ini:

* **Poin Utama**: Konsep inti yang disampaikan secara visual dan praktis.
* **Tindakan Lanjutan**: Eksplorasi materi lebih mendalam saat sesi belajar berikutnya bersama Mochi.`,
      summary: 'Ringkasan poin penting dari YouTube untuk bahan diskusi dan kuis.',
      tags: ['youtube', 'shorts', 'edukasi', 'vault'],
    };
  }

  // 5. TikTok Video
  if (platform === 'tiktok') {
    return {
      title: `Tips & Wawasan Praktis (${domain})`,
      notes: `Ringkasan ide kreatif dan wawasan praktis dari kreator:

* **Insight Utama**: Cara sederhana yang dapat langsung diterapkan dalam rutinitas harian.
* **Catatan Tambahan**: Pelajari dan kombinasikan dengan materi lain di Vault.`,
      summary: 'Tips dan insight kreatif cepat dari TikTok.',
      tags: ['tiktok', 'tips', 'kreatif', 'vault'],
    };
  }

  // 6. General Web Articles
  return {
    title: `Materi Pelajaran Baru (${domain})`,
    notes: `Rangkuman bahan bacaan yang disimpan ke Vault:

* **Gagasan Utama**: Pandangan dan informasi penting yang ditemukan dalam artikel ini.
* **Penerapan**: Menghubungkan ide baru ini dengan catatan refleksi Second Brain.`,
    summary: `Bahan bacaan wawasan baru dari ${domain}.`,
    tags: ['artikel', 'wawasan', 'vault'],
  };
}
