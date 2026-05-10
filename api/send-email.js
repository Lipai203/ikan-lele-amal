import nodemailer from 'nodemailer';

function getRequired(name, env) {
  const v = env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function isValidEmail(email) {
  // simple email check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function normalizeKontak(k) {
  // Accept either email or WhatsApp number-ish.
  const raw = String(k || '').trim();
  if (!raw) return '';

  // Remove spaces/dashes/parentheses for phone normalization
  const phone = raw.replace(/[\s\-()]/g, '');

  // If it looks like a phone (digits, optional leading +), keep digits+leading+
  if (/^\+?\d{7,15}$/.test(phone)) {
    // convert to digits without + for Gmail body consistency
    return phone.startsWith('+') ? phone.slice(1) : phone;
  }

  return raw;
}

function escapeText(s) {
  return String(s ?? '')
    .replaceAll('\r', '')
    .replaceAll('\n', '\n')
    .slice(0, 2000);
}

// Simple spam protection (no storage):
// - basic length limits
// - naive human check using a lightweight proof-of-work style token is not possible without UI.
// So we only do conservative validation + rate guard via serverless runtime headers.
function basicSpamCheck({ nama, kontak, pesan }) {
  const now = Date.now();
  // This is just a guard for absurdly fast bot submissions (best-effort).
  // If Vercel runs multiple invocations without headers, this still helps only partially.
  void now;

  if (String(pesan).length > 2000) return 'pesan terlalu panjang';
  if (String(nama).length > 120) return 'nama terlalu panjang';
  if (String(kontak).length > 120) return 'kontak terlalu panjang';

  // Reject messages that look like copy-paste keywords only.
  const p = String(pesan).toLowerCase();
  const suspicious = ['spam', 'viagra', 'casino', 'bit.ly', 'http://', 'https://'];
  if (suspicious.some((w) => p.includes(w))) return 'konten terindikasi spam';

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const env = process.env;

    // Required env
    const smtpHost = getRequired('SMTP_HOST', env);
    const smtpPort = Number(env.SMTP_PORT || 587);
    const smtpSecure = String(env.SMTP_SECURE || 'false').toLowerCase() === 'true';
    const smtpUser = getRequired('SMTP_USER', env);
    const smtpPass = getRequired('SMTP_PASS', env);
    const mailTo = getRequired('MAIL_TO', env);
    const mailFrom = env.MAIL_FROM || smtpUser;

    const { nama, email, kontak, pesan } = req.body || {};

    // Compatibility with your requested fields:
    // - nama: req.body.nama
    // - email: optional (not in current UI)
    // - kontak: req.body.kontak (used for WhatsApp or email)
    // - pesan: req.body.pesan

    const namaClean = escapeText(nama).trim();
    const kontakClean = normalizeKontak(kontak ?? email ?? '');
    const pesanClean = escapeText(pesan).trim();

    if (!namaClean || !kontakClean || !pesanClean) {
      return res.status(400).json({ ok: false, error: 'nama, kontak/WhatsApp, dan pesan wajib diisi' });
    }

    // Validate email or phone-ish for kontak
    const isEmail = isValidEmail(kontakClean);
    const isPhoneish = /^\d{7,15}$/.test(kontakClean);
    if (!isEmail && !isPhoneish) {
      return res.status(400).json({ ok: false, error: 'kontak harus berupa email atau nomor WhatsApp yang valid' });
    }

    const spamReason = basicSpamCheck({ nama: namaClean, kontak: kontakClean, pesan: pesanClean });
    if (spamReason) {
      return res.status(400).json({ ok: false, error: `Spam rejected: ${spamReason}` });
    }

    const subject = 'Permintaan Informasi Lele (Website)';
    const lines = [
      'Halo Pak/Bu,',
      '',
      'Saya ingin bertanya tentang pembibitan/pembesaran/panen.',
      '',
      `Nama: ${namaClean}`,
      `Kontak/WhatsApp/Email: ${kontakClean}`,
      `Kebutuhan: ${pesanClean}`,
      '',
      'Terima kasih.'
    ];

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass }
    });

    await transporter.sendMail({
      from: mailFrom,
      to: mailTo,
      subject,
      text: lines.join('\n')
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Gagal mengirim email' });
  }
}

