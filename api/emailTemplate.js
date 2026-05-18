// api/emailTemplate.js
// Template email admin + auto-reply pelanggan.
// Tidak menggunakan library template agar tetap simpel dan mudah dipahami.

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#039;');
}

// Template yang responsif dan mendukung dark/light mode sederhana.
// Email client berbeda-beda; dark mode biasanya didukung jika memakai <style> media query.

export function buildAdminEmailHtml({ nama, email, whatsapp, pesan }) {
  const safeNama = escapeHtml(nama);
  const safeEmail = escapeHtml(email);
  const safeWa = escapeHtml(whatsapp || '-');
  const safePesan = escapeHtml(pesan);

  return `
<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pesan Baru dari Website</title>
    <style>
      @media (prefers-color-scheme: dark) {
        .card { background:#0f172a !important; border-color:#334155 !important; }
        .text { color:#e2e8f0 !important; }
        .muted { color:#94a3b8 !important; }
        .badge { background:#111827 !important; color:#e2e8f0 !important; border-color:#334155 !important; }
        a { color:#93c5fd !important; }
      }
      body { margin:0; padding:0; background:#f8fafc; font-family: Arial, Helvetica, sans-serif; }
      .container { max-width:720px; margin:0 auto; padding:20px; }
      .card { background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:22px; }
      .title { font-size:18px; font-weight:700; margin:0 0 10px; color:#0f172a; }
      .muted { color:#64748b; font-size:13px; }
      .grid { display:block; }
      .row { margin:10px 0; }
      .label { font-size:12px; color:#64748b; }
      .value { font-size:14px; color:#0f172a; word-break:break-word; }
      .badge { display:inline-block; padding:6px 10px; border:1px solid #e2e8f0; border-radius:999px; font-size:12px; color:#334155; background:#f1f5f9; }
      .footer { margin-top:16px; font-size:12px; color:#64748b; }
      @media (max-width: 480px) {
        .container { padding:12px; }
        .card { padding:16px; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div>
            <p class="muted">Permintaan baru</p>
            <h1 class="title">Pesan Baru dari Website</h1>
          </div>
          <span class="badge">Pesan ini Otomatis</span>
        </div>

        <div class="row">
          <div class="label">Nama</div>
          <div class="value">${safeNama}</div>
        </div>
        <div class="row">
          <div class="label">Email</div>
          <div class="value">${safeEmail}</div>
        </div>
        <div class="row">
          <div class="label">WhatsApp</div>
          <div class="value">${safeWa}</div>
        </div>
        <div class="row">
          <div class="label">Pesan</div>
          <div class="value" style="white-space:pre-wrap; line-height:1.6">${safePesan}</div>
        </div>

        <div class="footer">
          Dikirim melalui form kontak website.
        </div>
      </div>
    </div>
  </body>
</html>
  `;
}

export function buildCustomerAutoReplyHtml({ nama, replyText }) {
  const safeNama = escapeHtml(nama);
  const safeReply = escapeHtml(replyText);

  // replyText sudah plain (bukan HTML). Kita ubah newline jadi <br>.
  const replyWithBreaks = safeReply.replaceAll('\n', '<br/>');

  return `
<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Balasan Otomatis</title>
    <style>
      @media (prefers-color-scheme: dark) {
        body { background:#0b1220 !important; }
        .card { background:#0f172a !important; border-color:#334155 !important; }
        .text { color:#e2e8f0 !important; }
        .muted { color:#94a3b8 !important; }
      }
      body { margin:0; padding:0; background:#f8fafc; font-family: Arial, Helvetica, sans-serif; }
      .container { max-width:640px; margin:0 auto; padding:20px; }
      .card { background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:20px; }
      .title { font-size:18px; font-weight:800; margin:0; color:#0f172a; }
      .muted { color:#64748b; font-size:13px; margin-top:6px; }
      .text { color:#0f172a; line-height:1.6; font-size:14px; margin-top:14px; white-space:normal; word-break:break-word; }
      .signature { margin-top:18px; font-size:13px; color:#64748b; }
      @media (max-width: 480px) {
        .container { padding:12px; }
        .card { padding:16px; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <p class="muted">Auto-reply dari Lele Sehat Prima</p>
        <h1 class="title">Halo ${safeNama},</h1>

        <div class="text">
          ${replyWithBreaks}
        </div>

        <div class="signature">
          Terima kasih.
          <br/><b>Lele Sehat Prima</b>
        </div>
      </div>
    </div>
  </body>
</html>
  `;
}

