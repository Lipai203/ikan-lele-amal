import nodemailer from "nodemailer";
import { buildAdminEmailHtml, buildCustomerAutoReplyHtml } from "./emailTemplate.js";
import { generateAIReply } from "./aiService.js";
import { logRequest, logError } from "./logger.js";

// Vercel serverless safe code:
// - Tidak pakai database.
// - Rate limit per-instance memory cache (cukup untuk anti spam ringan).
const RATE_LIMIT = {
  max: 8,
  windowMs: 15 * 60 * 1000,
  map: new Map(), // ip -> { count, resetAt }
};

const MAX = {
  nama: 60,
  email: 120,
  whatsapp: 40,
  pesan: 1200,
  aiReply: 600,
};

function getClientIp(req) {
  const xff = req.headers?.['x-forwarded-for'];
  if (!xff) return 'unknown';
  return String(xff).split(',')[0].trim();
}

function rateLimitCheck(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const cur = RATE_LIMIT.map.get(ip);

  if (!cur || now > cur.resetAt) {
    RATE_LIMIT.map.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return { ok: true };
  }

  if (cur.count >= RATE_LIMIT.max) {
    return { ok: false, ip };
  }

  cur.count += 1;
  RATE_LIMIT.map.set(ip, cur);
  return { ok: true };
}

function normalizeAndSanitizeText(text, maxLen) {
  const s = String(text ?? '');
  // Anti CRLF injection
  const noCRLF = s.replaceAll('\r', ' ').replaceAll('\n', ' ');
  // normalize whitespace
  const trimmed = noCRLF.replaceAll(/\s+/g, ' ').trim();
  // max length
  return trimmed.slice(0, maxLen);
}

function validateEmail(email) {
  const s = String(email ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isSuspiciousSpam({ nama, email, whatsapp, pesan }) {
  const text = String(pesan ?? '').toLowerCase();
  const short = text.replaceAll(/\s+/g, ' ').trim();

  if (!short) return true;
  if (short.length < 10) return true;

  const spamSignals = [
    'http://',
    'https://',
    'www.',
    'free money',
    'viagra',
    'casino',
    'crypto',
    'telegram',
  ];

  if (spamSignals.some((sig) => short.includes(sig))) return true;

  if (short.split(' ').length > 250) return true;

  if (short.includes('!!!') && short.length < 120) return true;

  // basic email presence heuristic (some spam uses fake contact)
  if (email && !validateEmail(email)) return true;

  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  logRequest({ ip, path: req.url, method: req.method, bodySummary: 'form-submit' });

  const rl = rateLimitCheck(req);
  if (!rl.ok) {
    return res.status(429).json({ success: false, error: 'Terlalu banyak permintaan. Coba lagi nanti.' });
  }

  const overallTimeoutMs = 30000;
  const overallTimeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), overallTimeoutMs)
  );

  try {
    const body = await Promise.race([Promise.resolve(req.body), overallTimeout]);
    let { nama, email, whatsapp, pesan } = body || {};

    // ===== VALIDASI + SANITASI =====
    nama = normalizeAndSanitizeText(nama, MAX.nama);
    email = normalizeAndSanitizeText(email, MAX.email);
    whatsapp = normalizeAndSanitizeText(whatsapp, MAX.whatsapp);
    pesan = normalizeAndSanitizeText(pesan, MAX.pesan);

    if (!nama || !email || !pesan) {
      return res.status(400).json({ success: false, error: 'Data tidak lengkap' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Email tidak valid' });
    }

    if (isSuspiciousSpam({ nama, email, whatsapp, pesan })) {
      return res.status(400).json({ success: false, error: 'Permintaan terdeteksi sebagai spam' });
    }

    // ===== Nodemailer transport =====
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    // ===== 1) Email ke Admin =====
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: 'Permintaan dari Website Lele',
      html: buildAdminEmailHtml({ nama, email, whatsapp, pesan }),
      replyTo: email,
    });

    // ===== 2) Generate AI reply (tanpa fallback keyword) =====
    let autoReplyText = '';
    let aiFallback = false;

    // Conversation memory sederhana: simpan konteks ringkas per (email atau whatsapp)
    // Catatan: ini in-memory (tanpa DB) sehingga hanya bertahan selama instance berjalan.
    const memory = (handler._memory = handler._memory || new Map());
    const memoryKey = (whatsapp && String(whatsapp).trim()) ? String(whatsapp).trim() : String(email).trim();

    const prev = memory.get(memoryKey);
    const conversationContext = prev?.context || '';

    try {
      const aiReplyRaw = await generateAIReply({
        nama,
        email,
        whatsapp,
        pesan,
        conversationContext,
      });
      autoReplyText = normalizeAndSanitizeText(aiReplyRaw, MAX.aiReply);
    } catch (err) {
      aiFallback = true;
      // Fallback generik (non-keyword) agar tetap sopan & relevan.
      autoReplyText = normalizeAndSanitizeText(
        `Halo ${nama || 'Pak/Bu'},\n\nMohon maaf, kami belum bisa memproses pesan Anda dengan tepat saat ini. Bisa jelaskan kebutuhan Anda sedikit lebih lengkap (jenis layanan: bibit/pembesaran/panen, jumlah/ukuran, dan lokasi)? Nanti kami bantu arahkan sesuai peternakan lele Lele Sehat Prima.`,
        MAX.aiReply
      );
    }

    // Simpan konteks untuk follow-up berikutnya
    if (memoryKey && autoReplyText) {
      const trimmedPesan = String(pesan ?? '').slice(0, 220);
      const trimmedReply = String(autoReplyText ?? '').slice(0, 220);
      const newContext = `Pesan pelanggan sebelumnya: ${trimmedPesan}\nBalasan AI sebelumnya: ${trimmedReply}`;
      memory.set(memoryKey, { context: newContext, updatedAt: Date.now() });
    }

    // ===== 3) Auto reply ke pelanggan =====
    const customerHtml = buildCustomerAutoReplyHtml({
      nama,
      replyText: autoReplyText,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Balasan Otomatis - Lele Sehat Prima',
      html: customerHtml,
      replyTo: process.env.ADMIN_EMAIL,
    });

    return res.status(200).json({
      success: true,
      message: 'Email terkirim ke admin & auto-reply pelanggan',
      ai: aiFallback ? 'fallback' : 'openai',
    });
  } catch (error) {
    logError({
      message: error?.message || 'Unknown error',
      ip,
      path: req.url,
      method: req.method,
      err: error,
    });

    let msg = error?.message || 'Server error saat memproses request';
    if (msg === 'Request timeout') msg = 'Server timeout. Coba lagi sebentar lagi.';

    return res.status(500).json({ success: false, error: msg });
  }
}

