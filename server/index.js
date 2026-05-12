const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' }));

function mustGet(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const smtpHost = mustGet('SMTP_HOST');
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const smtpUser = mustGet('SMTP_USER');
const smtpPass = mustGet('SMTP_PASS');
const mailTo = mustGet('MAIL_TO');

// Prevent running with placeholder credentials (common for demo/template .env)
if (
  String(smtpUser).includes('your_') ||
  String(smtpPass).includes('your_') ||
  String(smtpPass).includes('your_app_password')
) {
  console.error('SMTP credentials look like placeholders. Please update server/.env with real Gmail App Password.');
}

const mailFrom = process.env.MAIL_FROM || smtpUser;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Endpoint Express ini adalah versi lama.
// Untuk produksi yang benar di Vercel, kirim email WAJIB lewat endpoint serverless: `api/send-email.js`.
// Guard ini mencegah dua backend berbeda digunakan (yang bisa bikin masalah stabilitas real-time).
app.post('/api/send-email', (_req, res) => {
  res.status(410).json({
    ok: false,
    error: 'Endpoint lama dinonaktifkan. Gunakan /api/send-email (Vercel serverless).'
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Email server listening on http://localhost:${port}`);
});

