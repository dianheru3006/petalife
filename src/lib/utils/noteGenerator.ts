import type { PlatformType } from '../types';

export interface KeyTakeaway {
  concept: string;
  explanation: string;
}

export interface SmartVaultQuiz {
  question: string;
  options: [string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface SmartVaultContent {
  title: string;
  category: 'Bisnis' | 'Tech' | 'Finansial' | 'Kuliner' | 'Psikologi' | 'Produktivitas' | 'Kreatif' | 'Umum';
  coreThesis: string;
  keyTakeaways: KeyTakeaway[];
  reflectionPrompt: string;
  quiz: SmartVaultQuiz;
  notes: string;
  summary: string;
  tags: string[];
  author?: string;
}

/**
 * 5-Layer Second Brain Synthesizer for Petalife.
 * Synthesizes links into structured, high-signal knowledge with active recall quizzes.
 */
export function generateSmartVaultContent(
  url: string,
  platform: PlatformType,
  domain: string,
  rawTitle?: string,
  author?: string
): SmartVaultContent {
  const lowerUrl = (url + ' ' + (rawTitle || '')).toLowerCase();

  // 1. Tech, AI, Coding, Architecture
  if (
    lowerUrl.includes('code') ||
    lowerUrl.includes('dev') ||
    lowerUrl.includes('tech') ||
    lowerUrl.includes('ai') ||
    lowerUrl.includes('program') ||
    lowerUrl.includes('software') ||
    lowerUrl.includes('python') ||
    lowerUrl.includes('react') ||
    lowerUrl.includes('clean code')
  ) {
    const title = rawTitle || `Prinsip Arsitektur & Efisiensi Sistem (${domain})`;
    const coreThesis = 'Sistem perangkat lunak yang tangguh dibangun di atas pemisahan modular dan kemudahan pemeliharaan jangka panjang.';
    const takeaways: KeyTakeaway[] = [
      {
        concept: 'Prinsip Modular',
        explanation: 'Pisahkan antarmuka (UI) dari logika penyimpanan data agar sistem mudah diuji dan tahan banting saat skala membesar.',
      },
      {
        concept: 'Offline-First & Keandalan',
        explanation: 'Prioritaskan ketersediaan data lokal (IndexedDB) sebelum sinkronisasi jaringan untuk menjamin pengalaman pengguna instan tanpa jeda.',
      },
      {
        concept: 'Refactoring Bertahap',
        explanation: 'Perbaiki kualitas kode secara inkremental setelah fungsi bekerja dan memiliki pengujian yang lulus.',
      },
    ];
    const reflection = 'Komponen apa dalam proyekmu yang saat ini paling butuh disederhanakan arsitekturnya?';
    const quiz: SmartVaultQuiz = {
      question: 'Kapan momen terbaik melakukan refactoring arsitektur kode?',
      options: [
        'Secara bertahap setelah fitur dasar bekerja dan teruji',
        'Menunggu sampai seluruh aplikasi crash total',
        'Tidak perlu refactor selama aplikasi masih bisa jalan',
      ],
      correctIndex: 0,
      explanation: 'Refactoring terbaik dilakukan secara bertahap dengan panduan pengujian yang sudah ada.',
    };
    const tags = ['#tech', '#arsitektur', '#coding', '#vault'];

    return formatPayload(title, 'Tech', coreThesis, takeaways, reflection, quiz, tags, author);
  }

  // 2. Psychology, Mindset, Habit, Mental Model
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
    const title = rawTitle || 'Mengapa Orang Sulit Menerima Kebenaran';
    const coreThesis = 'Penolakan terhadap fakta logis sering kali bukan karena kekurangan kecerdasan, melainkan mekanisme perlindungan rasa aman mental.';
    const takeaways: KeyTakeaway[] = [
      {
        concept: 'System Justification',
        explanation: 'Kecenderungan alami manusia mempertahankan status quo demi menjaga stabilitas psikologis mereka.',
      },
      {
        concept: 'Confirmation Bias',
        explanation: 'Pikiran kita otomatis menyaring dan menerima bukti baru yang hanya mendukung keyakinan lama.',
      },
      {
        concept: 'Komunikasi Empatis',
        explanation: 'Beri ruang aman emosional sebelum menyampaikan fakta yang menentang pandangan orang lain.',
      },
    ];
    const reflection = 'Keyakinan lama apa yang akhir-akhir ini menahanmu untuk belajar sudut pandang baru?';
    const quiz: SmartVaultQuiz = {
      question: 'Apa pendorong utama seseorang menolak fakta logis menurut psikologi?',
      options: [
        'Mekanisme defensif menjaga rasa aman psikologis',
        'Kurangnya informasi numerik statistik',
        'Ketidakmampuan membaca data',
      ],
      correctIndex: 0,
      explanation: 'Manusia cenderung melindungi identitas dan keyakinan lamanya demi rasa aman psikologis.',
    };
    const tags = ['#psikologi', '#mindset', '#edukasi', '#vault'];

    return formatPayload(title, 'Psikologi', coreThesis, takeaways, reflection, quiz, tags, author);
  }

  // 3. Business, Finance, Passive Income, DePIN
  if (
    lowerUrl.includes('bisnis') ||
    lowerUrl.includes('uang') ||
    lowerUrl.includes('finance') ||
    lowerUrl.includes('finansial') ||
    lowerUrl.includes('depin') ||
    lowerUrl.includes('passive') ||
    lowerUrl.includes('invest') ||
    lowerUrl.includes('omzet')
  ) {
    const title = rawTitle || `Strategi Alokasi & Efisiensi Finansial (${domain})`;
    const coreThesis = 'Keberlanjutan finansial ditentukan oleh penguasaan alokasi arus kas dan minimnya biaya tetap yang tidak produktif.';
    const takeaways: KeyTakeaway[] = [
      {
        concept: 'Prinsip Arus Kas Positif',
        explanation: 'Prioritaskan mempertahankan margin bersih daripada mengejar omzet besar namun berisiko tinggi.',
      },
      {
        concept: 'Alokasi Proporsional',
        explanation: 'Terapkan pembagian teratur: 50% kebutuhan pokok, 30% fleksibilitas, dan minimal 20% tabungan produktif.',
      },
      {
        concept: 'Pemanfaatan Aset Idle',
        explanation: 'Ubah bandwidth atau aset yang tidak terpakai menjadi pendapatan pasif tambahan.',
      },
    ];
    const reflection = 'Pengeluaran rutin mana yang bisa dialokasikan kembali untuk investasi keterampilan barumu?';
    const quiz: SmartVaultQuiz = {
      question: 'Berapa persen alokasi tabungan ideal dalam aturan pengelolaan keuangan dasar?',
      options: ['50%', '30%', '20%'],
      correctIndex: 2,
      explanation: 'Aturan 50-30-20 merekomendasikan minimal 20% pendapatan dialokasikan untuk tabungan dan investasi.',
    };
    const tags = ['#finansial', '#bisnis', '#aset', '#vault'];

    return formatPayload(title, 'Finansial', coreThesis, takeaways, reflection, quiz, tags, author);
  }

  // 4. Culinary / Cooking
  if (
    lowerUrl.includes('resep') ||
    lowerUrl.includes('masak') ||
    lowerUrl.includes('cook') ||
    lowerUrl.includes('makan') ||
    lowerUrl.includes('steak') ||
    lowerUrl.includes('kopi')
  ) {
    const title = rawTitle || `Tips & Teknik Memasak Berkualitas (${domain})`;
    const coreThesis = 'Kelezatan hidangan terbaik berakar pada pemahaman suhu, waktu resting, dan kesegaran bahan baku utama.';
    const takeaways: KeyTakeaway[] = [
      {
        concept: 'Resting Daging',
        explanation: 'Biarkan daging beristirahat 5 menit setelah dimasak agar saripati jus meresap merata ke seluruh serat.',
      },
      {
        concept: 'Pengontrolan Suhu Ruang',
        explanation: 'Keluarkan bahan baku dari pendingin 15 menit sebelum diolah agar panas merata hingga ke bagian tengah.',
      },
      {
        concept: 'Keseimbangan Rasa',
        explanation: 'Gunakan garam secukupnya di awal proses untuk mempertegas aroma alami bahan baku.',
      },
    ];
    const reflection = 'Teknik memasak sederhana apa yang ingin kamu coba akhir pekan ini?';
    const quiz: SmartVaultQuiz = {
      question: 'Mengapa daging steak perlu di-resting beberapa menit setelah matang?',
      options: [
        'Agar cairan jus meresap kembali ke dalam serat daging',
        'Supaya daging cepat dingin dan kering',
        'Tidak ada alasan khusus selain tradisi',
      ],
      correctIndex: 0,
      explanation: 'Resting memungkinkan serat daging relaks dan jus menyebar kembali secara merata.',
    };
    const tags = ['#kuliner', '#resep', '#tips', '#vault'];

    return formatPayload(title, 'Kuliner', coreThesis, takeaways, reflection, quiz, tags, author);
  }

  // 5. Default General Educational / Web Articles / Threads
  const title = rawTitle || `Intisari Pembelajaran Baru (${domain})`;
  const coreThesis = `Eksplorasi wawasan baru dari ${domain} untuk memperkaya bank pengetahuan Second Brain kamu.`;
  const takeaways: KeyTakeaway[] = [
    {
      concept: 'Penyaringan Informasi',
      explanation: 'Pilih ide utama yang relevan dengan tujuan belajarmu dan abaikan kebisingan yang tidak aplikatif.',
    },
    {
      concept: 'Koneksi Konseptual',
      explanation: 'Hubungkan wawasan dari materi ini dengan catatan atau referensi lain yang sudah tersimpan di Vault.',
    },
    {
      concept: 'Aksi Praktis',
      explanation: 'Terapkan minimal satu poin kecil hari ini untuk memperkuat daya ingat dan pemahaman jangka panjang.',
    },
  ];
  const reflection = 'Bagaimana satu ide dari materi ini bisa membantumu menyelesaikan tantangan hari ini?';
  const quiz: SmartVaultQuiz = {
    question: 'Apa langkah paling efektif setelah menyimak materi atau wawasan baru?',
    options: [
      'Uji coba dan terapkan poin kecilnya secara konsisten',
      'Cukup simpan tanpa pernah membacanya lagi',
      'Menunggu sampai waktu terasa 100% sempurna',
    ],
    correctIndex: 0,
    explanation: 'Mempraktikkan poin kecil secara konsisten adalah kunci utama retensi memori jangka panjang.',
  };
  const tags = [`#${platform}`, '#wawasan', '#edukasi', '#vault'];

  return formatPayload(title, 'Umum', coreThesis, takeaways, reflection, quiz, tags, author);
}

function formatPayload(
  title: string,
  category: SmartVaultContent['category'],
  coreThesis: string,
  keyTakeaways: KeyTakeaway[],
  reflectionPrompt: string,
  quiz: SmartVaultQuiz,
  tags: string[],
  author?: string
): SmartVaultContent {
  const formattedBullets = keyTakeaways
    .map(t => `* **${t.concept}**: ${t.explanation}`)
    .join('\n\n');

  const formattedNotes = `💡 **Gagasan Utama:**\n${coreThesis}\n\n🔑 **Poin Kunci & Tindakan:**\n${formattedBullets}\n\n🌱 **Refleksi Diri:**\n${reflectionPrompt}`;

  return {
    title,
    category,
    coreThesis,
    keyTakeaways,
    reflectionPrompt,
    quiz,
    notes: formattedNotes,
    summary: coreThesis,
    tags,
    author,
  };
}
