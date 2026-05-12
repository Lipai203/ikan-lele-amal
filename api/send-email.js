// Vercel Serverless Function: POST /api/send-email
// Mengirim email via Gmail SMTP menggunakan Nodemailer.
// UI tidak diubah. Frontend mengirim JSON (nama, kontak/email, pesan).

const nodemailer = require('nodemailer');

function getRequired(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// simple in-memory rate limit (per process)
const RATE_LIMIT = {
  windowMs: 10_000,
  maxRequests: 3,
  buckets: new Map() // ip -> { count, resetAt }
};

function getClientIp(req) {
  const xf = req.headers?.['x-forwarded-for'];
  if (typeof xf === 'string') {
    return xf.split(',')[0].trim();
  }
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
    .replaceAll('\n', ' ') // cegah header injection via newline
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

async function sendWithGmailSMTP({ nama, emailKontak, pesan }) {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

  const emailUser = getRequired('EMAIL_USER');
  const emailPass = getRequired('EMAIL_PASS');
  const emailReceiver = getRequired('RECEIVER_EMAIL');

  const mailFrom = `"Website" <${emailUser}>`;

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

  await transporter.sendMail({
    from: mailFrom,
    to: emailReceiver,
    replyTo: emailKontak,
    subject,
    text
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { nama, kontak, pesan } = req.body || {};

    console.log('[send-email] request', {
      nama: typeof nama === 'string' ? nama.slice(0, 60) : '(non-string)'
    });

    // anti-spam sederhana: rate limit
    rateLimitCheck(req);

    // validasi sesuai requirement
    const namaClean = escapeText(nama, 120);
    const emailClean = sanitizeNoCRLF(kontak);
    const pesanClean = escapeText(pesan, 2000);

    if (!namaClean) {
      res.status(400).json({ success: false, error: 'Nama wajib diisi' });
      return;
    }
    if (!emailClean) {
      res.status(400).json({ success: false, error: 'Email/Kontak wajib diisi' });
      return;
    }
    if (!pesanClean) {
      res.status(400).json({ success: false, error: 'Pesan wajib diisi' });
      return;
    }


    if (!isValidEmail(emailClean)) {
      res.status(400).json({ success: false, error: 'Email pelanggan harus berupa email valid' });
      return;
    }

    const spamReason = basicSpamCheck({ nama: namaClean, email: emailClean, pesan: pesanClean });
    if (spamReason) {
      res.status(400).json({ success: false, error: `Spam rejected: ${spamReason}` });
      return;
    }

    await sendWithGmailSMTP({ nama: namaClean, emailKontak: emailClean, pesan: pesanClean });

    console.log('[send-email] smtp success');
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[send-email] error', err);
    const status = err && typeof err.statusCode === 'number' ? err.statusCode : 500;
    res.status(status).json({ success: false, error: status === 429 ? err.message : 'Gagal mengirim email' });
  }
};


