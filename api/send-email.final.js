// Vercel Serverless Function: POST /api/send-email
// Mengirim email via Gmail SMTP menggunakan Nodemailer.
// UI tidak diubah. Frontend mengirim JSON (nama, kontak/email, pesan).

const nodemailer = require('nodemailer');

function getRequired(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// simple in-memory rate limit (per instance)
const RATE_LIMIT = {
  windowMs: 10_000,
  maxRequests: 3,
  buckets: new Map() // ip -> { count, resetAt }
};

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
  // basic email format check
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

  // Use stable headers
  await transporter.sendMail({
    from: `"Website" <${emailUser}>`,
    to: emailReceiver,
    replyTo: emailKontak,
    subject,
    text
  });
}

export default async function handler(req, res) {
  // Allow only POST
  if (req.method === 'OPTIONS') {
    // CORS preflight: keep minimal.
    // If you need allowlist, add CORS_ORIGINS and set Access-Control-Allow-Origin accordingly.
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Rate limit
    rateLimitCheck(req);

    const body = req.body || {};
    const nama = body?.nama;
    const kontak = body?.kontak;
    const pesan = body?.pesan;

    const namaClean = escapeText(nama, 120);
    const kontakClean = sanitizeNoCRLF(kontak);
    const pesanClean = escapeText(pesan, 2000);

    // Validate per requirement
    if (!namaClean) {
      res.status(400).json({ error: 'Nama wajib diisi' });
      return;
    }
    if (!kontakClean) {
      res.status(400).json({ error: 'Kontak wajib diisi' });
      return;
    }
    if (!pesanClean) {
      res.status(400).json({ error: 'Pesan wajib diisi' });
      return;
    }

    // Requirement says form email should work normally; enforce email validity for kontak
    if (!isValidEmail(kontakClean)) {
      res.status(400).json({ error: 'Kontak harus berupa email valid' });
      return;
    }

    const spamReason = basicSpamCheck({ nama: namaClean, email: kontakClean, pesan: pesanClean });
    if (spamReason) {
      res.status(400).json({ error: `Spam rejected: ${spamReason}` });
      return;
    }

    await sendWithGmailSMTP({ nama: namaClean, emailKontak: kontakClean, pesan: pesanClean });

    res.status(200).json({ success: true });
  } catch (err) {
    const status = typeof err?.statusCode === 'number' ? err.statusCode : 500;
    const message = err?.message && typeof err.message === 'string' ? err.message : 'Gagal mengirim email';
    res.status(status).json({ error: message });
  }
}

