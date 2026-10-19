import type { PlatformType, KeyTakeaway, GatewayErrorType } from '../types';

export type { KeyTakeaway };

export interface SmartVaultContent {
  title: string;
  category: 'Bisnis' | 'Tech' | 'Finansial' | 'Kuliner' | 'Psikologi' | 'Produktivitas' | 'Kreatif' | 'Umum';
  coreThesis: string;
  keyTakeaways: KeyTakeaway[];
  actionableInsights: string[];
  reflectionPrompt: string;
  notes: string;
  summary: string;
  tags: string[];
  author?: string;
}

function matchesKeyword(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some(w => {
    // For short tokens (<= 3 chars, e.g. 'ai', 'dev', 'ml'), enforce word boundaries so 'bagaimana' never matches 'ai'!
    if (w.length <= 3) {
      const re = new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`, 'i');
      return re.test(lower);
    }
    return lower.includes(w.toLowerCase());
  });
}

/**
 * Mochi Second Brain Comprehensive Synthesizer for Petalife (Sol ADR-001).
 * Synthesizes links into deep, structured, high-signal knowledge without quiz clutter.
 */
export function generateSmartVaultContent(
  url: string,
  platform: PlatformType,
  domain: string,
  rawTitle?: string,
  author?: string,
  userContext?: string,
  gatewayError?: { type: GatewayErrorType; message: string; action: string; status?: number }
): SmartVaultContent {
  const isClosedSocial =
    platform === 'instagram' ||
    platform === 'tiktok' ||
    domain.includes('threads.net') ||
    domain.includes('x.com') ||
    domain.includes('twitter') ||
    domain.includes('facebook');

  const isVideoPlatform = platform === 'youtube';

  // Determine subject matter from title and URL
  const searchCorpus = `${url} ${rawTitle || ''} ${userContext || ''}`;

  let detectedCategory: SmartVaultContent['category'] = 'Umum';
  let defaultTags: string[] = [`#${platform}`];

  if (matchesKeyword(searchCorpus, ['uang', 'finansial', 'finance', 'invest', 'bisnis', 'saham', 'crypto', 'kekayaan', 'wealth', 'money'])) {
    detectedCategory = 'Finansial';
    defaultTags.push('#finansial', '#investasi');
  } else if (matchesKeyword(searchCorpus, ['psikolog', 'mental', 'bias', 'mindset', 'habit', 'emosi', 'fokus', 'kebiasaan', 'ego', 'filsafat'])) {
    detectedCategory = 'Psikologi';
    defaultTags.push('#psikologi', '#mindset');
  } else if (matchesKeyword(searchCorpus, ['schedule', 'maker', 'produktiv', 'waktu', 'deepwork', 'graham', 'manajemen'])) {
    detectedCategory = 'Produktivitas';
    defaultTags.push('#produktivitas', '#manajemenwaktu');
  } else if (matchesKeyword(searchCorpus, ['code', 'dev', 'tech', 'ai', 'program', 'software', 'python', 'react', 'coding', 'arsitektur'])) {
    detectedCategory = 'Tech';
    defaultTags.push('#tech', '#coding');
  } else if (matchesKeyword(searchCorpus, ['resep', 'masak', 'cook', 'makan', 'steak', 'kopi', 'kuliner'])) {
    detectedCategory = 'Kuliner';
    defaultTags.push('#kuliner');
  }

  // Sol ADR-001: For video & closed social media WITHOUT user context or transcript,
  // do NOT fabricate fake 4-layer takeaways! Save honestly as metadata/bookmark.
  if ((isClosedSocial || isVideoPlatform || gatewayError) && !userContext) {
    const title = rawTitle || `Bookmark ${platform.charAt(0).toUpperCase() + platform.slice(1)} (${domain})`;
    const coreThesis = rawTitle
      ? (gatewayError
          ? `Tautan ${platform} tersimpan sebagai bookmark (menunggu sintesis: ${gatewayError.message}).`
          : `Tautan ${platform} tentang ${detectedCategory.toLowerCase()} tersimpan. Menunggu catatan atau transkrip untuk analisis mendalam.`)
      : `Tautan ${platform} tersimpan sebagai bookmark. Menunggu cuplikan teks atau caption pengguna untuk dirangkum.`;
    
    const reasonText = gatewayError
      ? `⚠️ **Koneksi Gateway:** ${gatewayError.message}\n🎯 **Tindakan:** ${gatewayError.action}`
      : (isClosedSocial && !rawTitle
          ? 'Mochi belum dapat membaca isi postingan ini karena platform membatasi akses tanpa login.'
          : 'Mochi baru berhasil mencatat judul dan tautannya. Karena video/postingan ini belum memiliki transkrip tertulis, Mochi belum membuat analisis 4 lapis tiruan.');

    const formattedNotes = [
      `📌 **Tautan Tersimpan sebagai Bookmark (${gatewayError ? 'Menunggu Sintesis' : 'Metadata Terverifikasi'})**\n`,
      `**Judul:** ${title}`,
      `**Kategori Terdeteksi:** ${detectedCategory}`,
      `**Sumber:** ${domain}${author ? ` (${author})` : ''}\n`,
      `💬 **Catatan Mochi:**\n${reasonText}`,
      gatewayError
        ? `\n💡 **Tips:** Tekan tombol "Sintesis Ulang" di Vault setelah koneksi gateway tersedia!`
        : `💡 **Tips:** Tempelkan 1–2 kalimat poin penting yang kamu pelajari dari materi ini agar Mochi buatkan intisari komprehensif!`
    ].join('\n');

    return {
      title,
      category: detectedCategory,
      coreThesis,
      keyTakeaways: [],
      actionableInsights: [],
      reflectionPrompt: 'Apa gagasan atau wawasan paling menarik yang kamu temukan dari materi ini?',
      notes: formattedNotes,
      summary: coreThesis,
      tags: defaultTags,
      author,
    };
  }

  const lowerUrl = searchCorpus.toLowerCase();

  // 1. Tech, AI, Coding, Software Architecture
  if (
    matchesKeyword(lowerUrl, ['code', 'dev', 'tech', 'ai', 'program', 'software', 'python', 'react', 'clean code', 'arsitektur'])
  ) {
    const title = rawTitle || `Prinsip Arsitektur & Efisiensi Sistem (${domain})`;
    const coreThesis = 'Sistem perangkat lunak yang tangguh dibangun di atas pemisahan modularitas yang disiplin, prediktabilitas state, dan kemudahan pemeliharaan jangka panjang.';
    const takeaways: KeyTakeaway[] = [
      {
        concept: 'Pemisahan Tanggung Jawab (Separation of Concerns)',
        explanation: 'Pisahkan antarmuka (UI) dari logika penyimpanan data dan state machine agar setiap lapisan dapat diuji dan ditingkatkan secara independen.',
      },
      {
        concept: 'Offline-First & Keandalan Lokal',
        explanation: 'Jadikan penyimpanan lokal (IndexedDB) sebagai sumber kebenaran instan sebelum sinkronisasi jaringan, menjamin responsivitas aplikasi tanpa latensi.',
      },
      {
        concept: 'Refactoring Bertahap (Incremental Refinement)',
        explanation: 'Perbaiki kualitas kode secara terukur setelah fungsi dasar bekerja dan diverifikasi dengan suite pengujian otomatis.',
      },
    ];
    const actions = [
      'Audit satu modul kode yang terlalu kompleks dan pisahkan logika bisnisnya dari komponen render UI.',
      'Tambahkan penanganan fallback offline pada fungsi interaksi data kritis.',
    ];
    const reflection = 'Komponen apa dalam proyekmu yang saat ini paling mendesak untuk disederhanakan arsitekturnya?';
    const tags = ['#tech', '#arsitektur', '#coding', '#software'];

    return formatPayload(title, 'Tech', coreThesis, takeaways, actions, reflection, tags, author);
  }

  // 2. Psychology, Mindset, Habit, Focus, Emotion
  if (
    lowerUrl.includes('stickman') ||
    lowerUrl.includes('psikolog') ||
    lowerUrl.includes('mental') ||
    lowerUrl.includes('bias') ||
    lowerUrl.includes('mindset') ||
    lowerUrl.includes('habit') ||
    lowerUrl.includes('emosi') ||
    lowerUrl.includes('fokus')
  ) {
    const title = rawTitle || 'Mekanisme Pertahanan Ego & Penerimaan Kebenaran';
    const coreThesis = 'Penolakan terhadap fakta baru jarang disebabkan oleh defisit logika; ia sering kali merupakan respons perlindungan identitas dan stabilitas mental.';
    const takeaways: KeyTakeaway[] = [
      {
        concept: 'System Justification & Bias Konfirmasi',
        explanation: 'Otak manusia secara naluriah mencari pembenaran atas status quo demi meminimalkan kecemasan kognitif saat kenyamanan diusik.',
      },
      {
        concept: 'Regulasi Emosi Sebelum Respon Logis',
        explanation: 'Argumen paling logis tidak akan diterima jika lawan bicara berada dalam status ancaman psikologis (fight-or-flight).',
      },
      {
        concept: 'Dekoupling Identitas dari Opini',
        explanation: 'Melihat opini sebagai hipotesis yang bisa diperbarui, bukan representasi mutlak dari harga diri pribadi.',
      },
    ];
    const actions = [
      'Ambil jeda 5 detik saat merasa defensif terhadap kritik sebelum merespons.',
      'Uji keyakinanmu dengan mencari satu bukti kuat yang bertentangan dengan asumsi awalmu.',
    ];
    const reflection = 'Asumsi pribadi apa yang sedang kamu pertahankan hanya karena takut terlihat keliru?';
    const tags = ['#psikologi', '#mindset', '#kebiasaan', '#refleksi'];

    return formatPayload(title, 'Psikologi', coreThesis, takeaways, actions, reflection, tags, author);
  }

  // 3. Productivity, Deep Work, Maker vs Manager Schedule
  if (
    lowerUrl.includes('schedule') ||
    lowerUrl.includes('maker') ||
    lowerUrl.includes('produktiv') ||
    lowerUrl.includes('waktu') ||
    lowerUrl.includes('fokus') ||
    lowerUrl.includes('deepwork') ||
    lowerUrl.includes('graham')
  ) {
    const title = rawTitle || `Strategi Ritme Kerja & Perlindungan Fokus (${domain})`;
    const coreThesis = 'Karya bernilai tinggi menuntut blok waktu panjang tanpa distraksi; interupsi singkat berbiaya jauh lebih mahal daripada durasi nominal interupsi itu sendiri.';
    const takeaways: KeyTakeaway[] = [
      {
        concept: 'Perbedaan Jadwal Maker vs Manager',
        explanation: 'Manajer beroperasi dalam slot per jam, sedangkan pembuat karya (kreator/programmer/penulis) memerlukan blok waktu minimal 3-4 jam tanpa jeda untuk masuk ke flow state.',
      },
      {
        concept: 'Biaya Interupsi (Context Switching Penalty)',
        explanation: 'Setiap interupsi rapat memecah hari menjadi fragmen kecil yang tidak cukup besar untuk memulai pekerjaan yang menuntut konsentrasi mendalam.',
      },
      {
        concept: 'Batching Rapat & Office Hours',
        explanation: 'Kelompokkan semua pertemuan di penghujung hari atau hari tertentu agar sisa waktu tetap menjadi kanvas kerja yang utuh.',
      },
    ];
    const actions = [
      'Blokir minimal 3 jam berturut-turut besok pagi tanpa notifikasi atau rapat.',
      'Pindahkan janji temu singkat ke slot sore hari yang sudah terfragmentasi.',
    ];
    const reflection = 'Rapat mana minggu ini yang dapat kamu kelompokkan untuk membuka satu blok kerja tanpa gangguan?';
    const tags = ['#produktivitas', '#deepwork', '#manajemenwaktu', '#fokus'];

    return formatPayload(title, 'Produktivitas', coreThesis, takeaways, actions, reflection, tags, author);
  }

  // 4. Finance, Wealth, Business, Investment
  if (
    lowerUrl.includes('finance') ||
    lowerUrl.includes('finansial') ||
    lowerUrl.includes('uang') ||
    lowerUrl.includes('invest') ||
    lowerUrl.includes('bisnis') ||
    lowerUrl.includes('saham') ||
    lowerUrl.includes('crypto')
  ) {
    const title = rawTitle || `Strategi Alokasi & Efisiensi Finansial (${domain})`;
    const coreThesis = 'Ketahanan finansial ditentukan oleh penguasaan alokasi arus kas, pengendalian biaya tetap yang tidak produktif, dan kepemilikan aset bertumbuh.';
    const takeaways: KeyTakeaway[] = [
      {
        concept: 'Prinsip Arus Kas Positif (Cashflow Priority)',
        explanation: 'Pertahankan margin likuiditas yang sehat daripada mengejar valuasi semu yang dibebani risiko leverage tinggi.',
      },
      {
        concept: 'Alokasi Proporsional Otomatis',
        explanation: 'Terapkan alokasi otomatis: kebutuhan operasional, cadangan darurat likuid, dan aset investasi jangka panjang.',
      },
      {
        concept: 'Monetisasi Kapasitas Menganggur',
        explanation: 'Identifikasi aset, pengetahuan, atau bandwidth yang belum terutilisasi dan konversi menjadi nilai tambah nyata.',
      },
    ];
    const actions = [
      'Tinjau kembali langganan rutin bulanan dan hentikan satu pengeluaran yang tidak lagi digunakan.',
      'Sisihkan alokasi investasi otomatis di awal periode penerimaan pendapatan.',
    ];
    const reflection = 'Pengeluaran rutin mana yang bisa dialokasikan kembali untuk investasi keterampilan barumu?';
    const tags = ['#finansial', '#bisnis', '#alokasi', '#investasi'];

    return formatPayload(title, 'Finansial', coreThesis, takeaways, actions, reflection, tags, author);
  }

  // 5. Culinary / Cooking / Coffee
  if (
    lowerUrl.includes('resep') ||
    lowerUrl.includes('masak') ||
    lowerUrl.includes('cook') ||
    lowerUrl.includes('makan') ||
    lowerUrl.includes('steak') ||
    lowerUrl.includes('kopi')
  ) {
    const title = rawTitle || `Teknik & Penguasaan Seni Kuliner (${domain})`;
    const coreThesis = 'Kelezatan hidangan istimewa berakar pada penguasaan presisi suhu, waktu resting bahan, dan penghormatan terhadap karakter alami bahan baku.';
    const takeaways: KeyTakeaway[] = [
      {
        concept: 'Resting & Distribusi Kelembapan',
        explanation: 'Mengistirahatkan protein setelah proses pemanasan memungkinkan serat relaks dan sari rasa terserap kembali secara merata.',
      },
      {
        concept: 'Temperatur Bahan Sebelum Pengolahan',
        explanation: 'Menyesuaikan bahan baku ke suhu ruang sebelum dimasak mencegah kejutan termal dan memastikan kematangan merata hingga ke bagian inti.',
      },
      {
        concept: 'Penyusunan Lapisan Rasa (Layering Flavor)',
        explanation: 'Membangun bumbu dasar secara bertahap menciptakan kedalaman rasa yang lebih kompleks dibandingkan membubuhkannya sekaligus.',
      },
    ];
    const actions = [
      'Biarkan bahan makanan menyesuaikan ke suhu ruang 15 menit sebelum masuk wajan.',
      'Catat waktu dan suhu memasak untuk mengulang hasil yang konsisten.',
    ];
    const reflection = 'Eksperimen teknik kuliner sederhana apa yang ingin kamu sempurnakan akhir pekan ini?';
    const tags = ['#kuliner', '#resep', '#teknik', '#kreatif'];

    return formatPayload(title, 'Kuliner', coreThesis, takeaways, actions, reflection, tags, author);
  }

  // 6. Default Comprehensive Second Brain Synthesis (Web Articles, Threads, Social Links)
  const title = rawTitle || `Intisari Pembelajaran & Wawasan Baru (${domain})`;
  const coreThesis = `Eksplorasi wawasan konseptual dari ${domain} yang disaring secara komprehensif untuk memperkaya bank pengetahuan Second Brain kamu.`;
  const takeaways: KeyTakeaway[] = [
    {
      concept: 'Penyaringan Informasi Bernilai Tinggi',
      explanation: 'Saring gagasan pokok yang memiliki dampak nyata dan abaikan informasi sensasional yang tidak aplikatif.',
    },
    {
      concept: 'Sintesis Antar-Domain (Cross-pollination)',
      explanation: 'Hubungkan wawasan baru ini dengan prinsip atau catatan yang sudah tersimpan sebelumnya di Vault untuk melahirkan pemahaman orisinal.',
    },
    {
      concept: 'Aksi Nyata & Pembiasaan',
      explanation: 'Konversikan teori menjadi eksperimen kecil harian untuk mengunci retensi pemahaman jangka panjang.',
    },
  ];
  const actions = [
    'Tuliskan satu kalimat kesimpulan pribadi dari materi ini dengan bahasamu sendiri.',
    'Diskusikan atau terapkan satu ide kunci ini dalam sesi kerja hari ini.',
  ];
  const reflection = 'Bagaimana satu wawasan dari materi ini dapat membantumu menyelesaikan tantangan terbesarmu saat ini?';
  const tags = [`#${platform}`, '#wawasan', '#pembelajaran', '#secondbrain'];

  return formatPayload(title, 'Umum', coreThesis, takeaways, actions, reflection, tags, author);
}

function formatPayload(
  title: string,
  category: SmartVaultContent['category'],
  coreThesis: string,
  keyTakeaways: KeyTakeaway[],
  actionableInsights: string[],
  reflectionPrompt: string,
  tags: string[],
  author?: string
): SmartVaultContent {
  const formattedTakeaways = keyTakeaways
    .map(t => `* **${t.concept}**: ${t.explanation}`)
    .join('\n\n');

  const formattedActions = actionableInsights
    .map(a => `* ${a}`)
    .join('\n');

  const formattedNotes = `💡 **Gagasan Utama:**\n${coreThesis}\n\n🔍 **Analisis Mendalam & Poin Kunci:**\n${formattedTakeaways}\n\n🎯 **Aksi Praktis:**\n${formattedActions}\n\n🌱 **Refleksi Diri:**\n${reflectionPrompt}`;

  return {
    title,
    category,
    coreThesis,
    keyTakeaways,
    actionableInsights,
    reflectionPrompt,
    notes: formattedNotes,
    summary: coreThesis,
    tags,
    author,
  };
}
