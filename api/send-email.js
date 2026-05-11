// Vercel Serverless Function: POST /api/send-email
// Mengirim email via Gmail SMTP menggunakan Nodemailer.
// NOTE: UI tidak diubah. Frontend tetap mengirim JSON (nama, kontak/email, pesan) dari kontak.html.

const nodemailer = require('nodemailer');

function getRequired(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function sanitizeNoCRLF(s) {
  return String(s ?? '')
    .replaceAll('\r', '')
    .replaceAll('\n', ' ') // cegah header injection via newline
    .trim();
}

function escapeText(s, maxLen = 2000) {
  return sanitizeNoCRLF(s).slice(0, maxLen);
}

function isValidEmail(email) {
  const v = String(email ?? '').trim();
  // simple-but-safe email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function basicSpamCheck({ nama, email, pesan }) {
  if (String(nama).length > 120) return 'nama terlalu panjang';
  if (String(email).length > 120) return 'email terlalu panjang';
  if (String(pesan).length > 2000) return 'pesan terlalu panjang';

  const p = String(pesan).toLowerCase();
  const suspicious = ['spam', 'viagra', 'casino', 'bit.ly', 'http://', 'https://'];
  if (suspicious.some((w) => p.includes(w))) return 'konten terindikasi spam';

  return null;
}

async function sendWithGmailSMTP({ nama, emailKontak, pesan }) {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

  const emailUser = getRequired('EMAIL_USER');
  const emailPass = getRequired('EMAIL_PASS');
  const emailReceiver = getRequired('EMAIL_RECEIVER');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  // Ketentuan: email pengirim harus memakai: from: "Website"
  // Gunakan format name <email> agar tetap valid secara RFC
  const mailFrom = `"Website" <${emailUser}>`;

  const subject = 'Permintaan Informasi Lele (Website)';
  const text = [
    'Halo Pak/Bu,',
    '',
    'Saya ingin bertanya tentang pembibitan/pembesaran/panen.',
    '',
    `Nama: ${nama}`,
    `Kontak (Email): ${emailKontak}`,
    `Kebutuhan: ${pesan}`,
    '',
    'Terima kasih.'
  ].join('\n');

  await transporter.sendMail({
    from: mailFrom,
    to: emailReceiver,
    replyTo: emailKontak, // ketentuan: email pelanggan dimasukkan ke replyTo
    subject,
    text
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { nama, kontak, pesan } = req.body || {};

    // Validasi field: nama, email(kontak), pesan
    const namaClean = escapeText(nama, 120);
    const emailClean = sanitizeNoCRLF(kontak);
    const pesanClean = escapeText(pesan, 2000);

    if (!namaClean || !emailClean || !pesanClean) {
      res.status(400).json({ ok: false, error: 'nama, email (kontak), dan pesan wajib diisi' });
      return;
    }

    // Ketentuan: field email pelanggan harus valid agar dapat diset ke replyTo
    if (!isValidEmail(emailClean)) {
      res.status(400).json({ ok: false, error: 'Email pelanggan harus berupa email valid' });
      return;
    }

    const spamReason = basicSpamCheck({ nama: namaClean, email: emailClean, pesan: pesanClean });
    if (spamReason) {
      res.status(400).json({ ok: false, error: `Spam rejected: ${spamReason}` });
      return;
    }

    await sendWithGmailSMTP({ nama: namaClean, emailKontak: emailClean, pesan: pesanClean });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Unhandled error in /api/send-email:', err);
    res.status(500).json({ ok: false, error: 'Gagal mengirim email' });
  }
};

