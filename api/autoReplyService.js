export function buildAutoReply(message, { nama }) {
  const text = (message || "").toLowerCase();

  // =========================
  // INTENT SCORING ENGINE
  // =========================
  const intents = [
    {
      name: "harga",
      keywords: ["harga", "berapa", "biaya", "tarif", "price"],
      reply: `
Halo ${nama}, terima kasih atas pertanyaannya.

Harga bibit lele kami mulai dari Rp120 - Rp300 per ekor tergantung ukuran dan jumlah pemesanan.
Untuk harga grosir bisa kami sesuaikan.

Silakan hubungi kami untuk penawaran terbaik.
      `
    },
    {
      name: "bibit",
      keywords: ["bibit", "benih", "ukuran", "benih lele"],
      reply: `
Halo ${nama},

Kami menyediakan bibit lele:
- 5–7 cm
- 7–9 cm
- 9–12 cm (siap pembesaran)

Semua bibit sudah diseleksi dan sehat.
      `
    },
    {
      name: "pengiriman",
      keywords: ["kirim", "pengiriman", "ongkir", "delivery", "antar"],
      reply: `
Halo ${nama},

Kami melayani pengiriman:
- Dalam kota
- Luar kota
- Packing oksigen khusus

Aman sampai tujuan.
      `
    },
    {
      name: "jam",
      keywords: ["jam", "buka", "operasional", "waktu"],
      reply: `
Halo ${nama},

Jam operasional kami:
Senin - Sabtu
08.00 - 17.00 WIB
      `
    },
    {
      name: "stok",
      keywords: ["stok", "tersedia", "ready", "habis"],
      reply: `
Halo ${nama},

Stok bibit lele selalu tersedia setiap hari.
Namun untuk jumlah besar disarankan booking terlebih dahulu.
      `
    }
  ];

  // =========================
  // SCORING SYSTEM
  // =========================
  let bestMatch = null;
  let bestScore = 0;

  for (const intent of intents) {
    let score = 0;

    for (const kw of intent.keywords) {
      if (text.includes(kw)) {
        score += 2;
      }
    }

    // tambahan bonus jika banyak kata cocok
    if (score > bestScore) {
      bestScore = score;
      bestMatch = intent;
    }
  }

  // =========================
  // RESPONSE GENERATION
  // =========================
  if (bestMatch && bestScore > 0) {
    return {
      matched: bestMatch.name,
      replyText: stripHtml(bestMatch.reply),
      replyHtml: formatHtml(bestMatch.reply, nama)
    };
  }

  // fallback "semi AI"
  return {
    matched: "general",
    replyText: `
Halo ${nama},

Terima kasih telah menghubungi kami.
Pesan Anda sudah kami terima dan akan segera kami respon secara detail.
    `,
    replyHtml: `
      <p>Halo <b>${nama}</b>,</p>
      <p>Terima kasih telah menghubungi kami.</p>
      <p>Kami akan segera menindaklanjuti pesan Anda.</p>
    `
  };
}

// =========================
// HELPERS
// =========================
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "").trim();
}

function formatHtml(text, nama) {
  return `
    <div style="font-family:Arial;line-height:1.6">
      ${text.replace(/\n/g, "<br>")}
      <br><br>
      <b>Lele Sehat Prima</b>
    </div>
  `;
}