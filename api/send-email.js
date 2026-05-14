// Vercel Serverless Function: POST /api/send-email
// Mengirim email via Gmail SMTP menggunakan Nodemailer.

import nodemailer from 'nodemailer';


const RATE_LIMIT = {
  windowMs: 10_000,
  maxRequests: 3,
  buckets: new Map()
};

function getRequired(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getClientIp(req) {
  const xf = req.headers?.['x-forwarded-for'];
  if (typeof xf === 'string') return xf.split(',')[0].trim();
  return req.headers?.['x-real-ip'] || 'unknown';
}

function rateLimitCheck(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const b = RATE_LIMIT.buckets.get(ip);

  if (!b) {
    RATE_LIMIT.buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return;
  }

  if (now > b.resetAt) {
    b.count = 1;
    b.resetAt = now + RATE_LIMIT.windowMs;
    RATE_LIMIT.buckets.set(ip, b);
    return;
  }

  b.count += 1;
  if (b.count > RATE_LIMIT.maxRequests) {
    const sec = Math.ceil((b.resetAt - now) / 1000);
    const err = new Error(`Terlalu banyak permintaan. Coba lagi dalam ${sec} detik.`);
    err.statusCode = 429;
    throw err;
  }
}

function sanitizeNoCRLF(s) {
  return String(s ?? '')
    .replaceAll('\r', '')
    .replaceAll('\n', ' ')
    .trim();
}

function escapeText(s, maxLen = 2000) {
  return sanitizeNoCRLF(s).slice(0, maxLen);
}

function isValidEmail(email) {
  const v = String(email ?? '').trim();
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

async function sendWithGmailSMTP({ nama, kontak, pesan }) {
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
    auth: { user: emailUser, pass: emailPass }
  });

  const subject = 'Permintaan Informasi Lele (Website)';
  const text = [
    'Halo Pak/Bu,',
    '',
    'Saya ingin bertanya tentang pembibitan/pembesaran/panen.',
    '',
    `Nama: ${nama}`,
    `Kontak: ${kontak}`,
    `Kebutuhan: ${pesan}`,
    '',
    'Terima kasih.'
  ].join('\n');

  await transporter.sendMail({
    from: `"Website" <${emailUser}>`,
    to: emailReceiver,
    replyTo: isValidEmail(kontak) ? kontak : emailUser,
    subject,
    text
  });
}

export default async function handler(req, res) {
  // Full error-safety + JSON response requirement
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }


    rateLimitCheck(req);

    const body = req.body || {};
    const nama = body?.nama;
    const kontak = body?.kontak;
    const pesan = body?.pesan;

    const namaClean = escapeText(nama, 120);
    const kontakClean = sanitizeNoCRLF(kontak);
    const pesanClean = escapeText(pesan, 2000);

    // Validasi input (wajib diisi)
    if (!namaClean || !kontakClean || !pesanClean) {
      return res.status(400).json({
        error: 'Semua field wajib diisi'
      });
    }

    // Spam check ringan
    const spamReason = basicSpamCheck({ nama: namaClean, email: kontakClean, pesan: pesanClean });
    if (spamReason) {
      return res.status(400).json({
        error: `Spam rejected: ${spamReason}`
      });
    }

    await sendWithGmailSMTP({
  nama: namaClean,
  kontak: kontakClean,
  pesan: pesanClean
});

    return res.status(200).json({
      success: true,
      message: 'Email berhasil dikirim'
    });
  } catch (error) {
    console.error(error);
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    const message = typeof error?.message === 'string' ? error.message : 'Gagal mengirim email';

    return res.status(status).json({
      error: message
    });
  }
}

