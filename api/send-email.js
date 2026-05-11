// Vercel Serverless Function: POST /api/send-email
// Mengirim email via Gmail SMTP menggunakan Nodemailer.
// NOTE: UI tidak diubah. Frontend tetap mengirim JSON (nama, kontak/email, pesan) dari kontak.html.

const nodemailer = require('nodemailer');

function getRequired(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function escapeText(s, maxLen = 2000) {
  return String(s ?? '')
    .replaceAll('\r', '')
    .replaceAll('\n', '\n')
    .trim()
    .slice(0, maxLen);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function normalizeKontak(k) {
  const raw = String(k || '').trim();
  if (!raw) return '';

  // Normalisasi nomor: hapus spasi/tanda kurung/dash
  const phone = raw.replace(/[\s\-()]/g, '');
  if (/^\+?\d{7,15}$/.test(phone)) {
    // di body cukup tanpa '+', biar konsisten
    return phone.startsWith('+') ? phone.slice(1) : phone;
  }
  return raw;
}

function basicSpamCheck({ nama, kontak, pesan }) {
  // proteksi sederhana berbasis validasi & konten
  if (String(nama).length > 120) return 'nama terlalu panjang';
  if (String(kontak).length > 120) return 'kontak terlalu panjang';
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
  const mailTo = getRequired('MAIL_TO');
  const mailFrom = process.env.MAIL_FROM || emailUser;

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
    `Kontak/WhatsApp/Email: ${kontak}`,
    `Kebutuhan: ${pesan}`,
    '',
    'Terima kasih.'
  ].join('\n');

  await transporter.sendMail({
    from: mailFrom,
    to: mailTo,
    subject,
    text
  });
}

async function sendWithResendFallback({ nama, kontak, pesan }) {
  const resendApiKey = getRequired('RESEND_API_KEY');
  const resendTo = getRequired('MAIL_TO');

  // Resend is optional (fallback). Avoid extra dependencies.
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || process.env.EMAIL_USER,
      to: resendTo,
      subject: 'Permintaan Informasi Lele (Website)',
      text: [
        'Halo Pak/Bu,',
        '',
        'Saya ingin bertanya tentang pembibitan/pembesaran/panen.',
        '',
        `Nama: ${nama}`,
        `Kontak/WhatsApp/Email: ${kontak}`,
        `Kebutuhan: ${pesan}`,
        '',
        'Terima kasih.'
      ].join('\n')
    })
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => 'Resend request failed');
    throw new Error(`Resend failed: ${msg}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { nama, kontak, pesan } = req.body || {};

    const namaClean = escapeText(nama, 120);
    const kontakClean = normalizeKontak(kontak);
    const pesanClean = escapeText(pesan, 2000);

    if (!namaClean || !kontakClean || !pesanClean) {
      res.status(400).json({ ok: false, error: 'nama, kontak/WhatsApp, dan pesan wajib diisi' });
      return;
    }

    const kontakIsEmail = isValidEmail(kontakClean);
    const kontakIsPhone = /^\d{7,15}$/.test(kontakClean);
    if (!kontakIsEmail && !kontakIsPhone) {
      res.status(400).json({ ok: false, error: 'kontak harus berupa email atau nomor WhatsApp yang valid' });
      return;
    }

    const spamReason = basicSpamCheck({ nama: namaClean, kontak: kontakClean, pesan: pesanClean });
    if (spamReason) {
      res.status(400).json({ ok: false, error: `Spam rejected: ${spamReason}` });
      return;
    }

    // Logging error untuk Vercel Logs
    // (Logging hanya error, tidak membeberkan data sensitif.)
    try {
      await sendWithGmailSMTP({ nama: namaClean, kontak: kontakClean, pesan: pesanClean });
      res.status(200).json({ ok: true });
      return;
    } catch (smtpErr) {
      console.error('SMTP send failed:', smtpErr);

      // Fallback ke Resend bila Gmail SMTP bermasalah
      if (process.env.RESEND_API_KEY) {
        await sendWithResendFallback({ nama: namaClean, kontak: kontakClean, pesan: pesanClean });
        res.status(200).json({ ok: true, fallback: 'resend' });
        return;
      }

      res.status(500).json({ ok: false, error: 'Gagal mengirim email' });
      return;
    }
  } catch (err) {
    console.error('Unhandled error in /api/send-email:', err);
    res.status(500).json({ ok: false, error: 'Gagal mengirim email' });
  }
};

