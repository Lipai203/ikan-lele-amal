# TODO - Perbaikan Backend Pengiriman Email

- [x] Update `api/send-email.js` supaya:
  - [x] Gunakan env `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_RECEIVER`.
  - [x] Gmail SMTP via Nodemailer, pakai `await transporter.sendMail()`.
  - [x] `from: "Website"` (format name+email yang sesuai nodemailer).
  - [x] `replyTo` diisi dengan email pelanggan (field `kontak` harus email valid).
  - [x] Validasi & sanitasi field: `nama`, `email(kontak)`, `pesan`.
  - [x] Penanganan error lengkap dengan `console.error`.
  - [x] Response JSON konsisten success/error.
  - [x] Endpoint kompatibel Vercel serverless.
- [x] Deploy ulang dan tes submit form.



