// Keyword -> jawaban (auto reply sederhana ala customer service)
// Tambahkan / ubah teks sesuai kebutuhan bisnis.

export const KEYWORDS = [
  {
    key: ['harga', 'bibit', 'leles', 'ukuran'],
    matchPriority: 80,
    matchedLabel: 'harga/bibit',
    replyText: (nama) =>
      `Halo ${nama || 'Pak/Bu'},\n\n` +
      `Harga bibit lele ukuran 5–7 cm mulai Rp120 per ekor.\n` +
      `Untuk ketersediaan stok dan estimasi panen, silakan jelaskan kebutuhan ukuran/umur bibit Anda.`
  },
  {
    key: ['pengiriman', 'kirim', 'luar kota', 'luar-kota'],
    matchPriority: 75,
    matchedLabel: 'pengiriman',
    replyText: (nama) =>
      `Halo ${nama || 'Pak/Bu'},\n\n` +
      `Kami melayani pengiriman luar kota menggunakan sistem packing oksigen, sehingga kualitas ikan tetap terjaga selama perjalanan.`
  },
  {
    key: ['jam operasional', 'jam', 'operasional'],
    matchPriority: 70,
    matchedLabel: 'jam operasional',
    replyText: (nama) =>
      `Halo ${nama || 'Pak/Bu'},\n\n` +
      `Jam operasional kami Senin–Sabtu pukul 08.00–17.00 WIB.`
  },
  {
    key: ['alamat', 'lokasi', 'domisili'],
    matchPriority: 65,
    matchedLabel: 'alamat',
    replyText: (nama) =>
      `Halo ${nama || 'Pak/Bu'},\n\n` +
      `Silakan cek informasi alamat di halaman Kontak website kami. Jika Anda butuh detail alamat lengkap, balas email ini dan kami kirimkan.`
  },
  {
    key: ['stok'],
    matchPriority: 60,
    matchedLabel: 'stok',
    replyText: (nama) =>
      `Halo ${nama || 'Pak/Bu'},\n\n` +
      `Stok bibit/panen kami menyesuaikan permintaan. Mohon info kebutuhan Anda (ukuran/umur & jumlah) agar kami bisa cek ketersediaan terbaru.`
  },
  {
    key: ['pakan'],
    matchPriority: 55,
    matchedLabel: 'pakan',
    replyText: (nama) =>
      `Halo ${nama || 'Pak/Bu'},\n\n` +
      `Kami menggunakan manajemen pakan yang terukur. Untuk rekomendasi pakan terbaik, mohon sebutkan fase pemeliharaan (umur/ukuran) ikan Anda.`
  },
  {
    key: ['kolam'],
    matchPriority: 52,
    matchedLabel: 'kolam',
    replyText: (nama) =>
      `Halo ${nama || 'Pak/Bu'},\n\n` +
      `Kami bantu konsultasi persiapan kolam (kualitas air, kepadatan, dan manajemen pemeliharaan) agar pertumbuhan ikan lebih optimal.`
  },
  {
    key: ['kerjasama', 'kemitraan', 'mitra', 'kolaborasi'],
    matchPriority: 50,
    matchedLabel: 'kerjasama',
    replyText: (nama) =>
      `Halo ${nama || 'Pak/Bu'},\n\n` +
      `Kami membuka peluang kerjasama/kemitraan. Silakan jelaskan rencana Anda (target lokasi, perkiraan jumlah, dan timeline) agar kami bisa menyiapkan skema terbaik.`
  },
  {
    key: ['konsultasi', 'konsultasi', 'tanya', 'help'],
    matchPriority: 45,
    matchedLabel: 'konsultasi',
    replyText: (nama) =>
      `Halo ${nama || 'Pak/Bu'},\n\n` +
      `Terima kasih sudah menghubungi kami. Tulis kebutuhan Anda sedetail mungkin (jenis layanan, jumlah, dan target waktu) supaya kami bisa bantu dengan rekomendasi yang tepat.`
  }
];

export function detectKeyword(pesan) {
  const text = String(pesan || '').toLowerCase();
  let best = null;

  for (const item of KEYWORDS) {
    const matched = item.key.some((k) => text.includes(String(k).toLowerCase()));
    if (!matched) continue;
    if (!best || item.matchPriority > best.matchPriority) {
      best = item;
    }
  }

  return best;
}

export function buildFallbackReplyText(nama) {
  return `Halo ${nama || 'Pak/Bu'},\n\n` +
    `Terima kasih atas pesan Anda. Mohon informasikan kebutuhan Anda (mis. bibit/pembesaran/panen, jumlah/ukuran, dan target waktu) agar kami bisa memberikan jawaban yang paling sesuai.`;
}

