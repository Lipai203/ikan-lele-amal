// Vercel Serverless Function: POST /api/send-email
// Terima pesan dari form website, kirim ke ADMIN, lalu bot auto-reply ke email pelanggan.

import nodemailer from 'nodemailer';
import { buildAutoReply } from './autoReplyService.js';

// Rate limit sederhana per IP (in-memory per instance)
const RATE_LIMIT = {
  windowMs: 10_000,
  maxRequests: 3,
  buckets: new Map() // ip -> { count, resetAt }
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

async function sendWithGmailSMTP({ nama, email, whatsapp, pesan }) {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

  // Wajib untuk Gmail SMTP
  const emailUser = getRequired('EMAIL_USER');
  const emailPass = getRequired('EMAIL_PASS');
  // Tujuan admin perusahaan
  const adminEmail = getRequired('ADMIN_EMAIL');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: emailUser, pass: emailPass }
  });

  // 1) Email masuk ke admin perusahaan
  const subjectAdmin = 'Permintaan Informasi Lele (Website)';
  const textAdmin = [
    'Halo Admin,',
    '',
    'Ada permintaan baru dari website:',
    '',
    `Nama: ${nama}`,
    `Email: ${email}`,
    `WhatsApp: ${whatsapp}`,
    `Kebutuhan: ${pesan}`,
    '',
    'Terima kasih.'
  ].join('\n');

  await transporter.sendMail({
    from: `"Website" <${emailUser}>`,
    to: adminEmail,
    replyTo: email,
    subject: subjectAdmin,
    text: textAdmin
  });

  // 2) Bot auto-reply ke email pelanggan berdasarkan keyword pesan
  const { matched, replyText, replyHtml } = buildAutoReply(pesan, { nama });

  const subjectCustomer = matched
    ? `Terima kasih - Info: ${matched}`
    : 'Terima kasih atas pesan Anda - Info layanan kami';

  await transporter.sendMail({
    from: `"Lele Sehat" <${emailUser}>`,
    to: email,
    replyTo: adminEmail,
    subject: subjectCustomer,
    text: replyText,
    html: replyHtml
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    rateLimitCheck(req);

    const body = req.body || {};
    const nama = body?.nama;
    const email = body?.email;
    const whatsapp = body?.whatsapp;
    const pesan = body?.pesan;

    const namaClean = escapeText(nama, 120);
    const emailClean = sanitizeNoCRLF(email);
    const whatsappClean = sanitizeNoCRLF(whatsapp);
    const pesanClean = escapeText(pesan, 2000);

    // Validasi wajib sesuai requirement
    if (!namaClean || !emailClean || !whatsappClean || !pesanClean) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    if (!isValidEmail(emailClean)) {
      return res.status(400).json({ error: 'email wajib diisi' });
    }

    const spamReason = basicSpamCheck({ nama: namaClean, email: emailClean, pesan: pesanClean });
    if (spamReason) {
      return res.status(400).json({ error: `Spam rejected: ${spamReason}` });
    }

    await sendWithGmailSMTP({
      nama: namaClean,
      email: emailClean,
      whatsapp: whatsappClean,
      pesan: pesanClean
    });

    return res.status(200).json({ success: true, message: 'Email terkirim + auto-reply berhasil' });
  } catch (error) {
    console.error('[send-email] error:', error);
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    const message = typeof error?.message === 'string' ? error.message : 'Gagal mengirim email';
    return res.status(status).json({ error: message });
  }
}

