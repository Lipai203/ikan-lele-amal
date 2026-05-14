# TODO - Perbaikan /api/send-email (Vercel)

- [x] Analisis kode `api/send-email.js` dan frontend `app.js` untuk memastikan kontrak request/response
- [x] Susun edit plan sesuai requirement: handler serverless Vercel, validasi method, validasi input, try/catch, logging error, response JSON konsisten
- [ ] Update `api/send-email.js` jadi ES module export default handler (Vercel style) dan pakai `import nodemailer from 'nodemailer'`
- [ ] Pastikan endpoint selalu respons JSON (200/400/405/500) dan tidak crash
- [x] Frontend menggunakan `fetch('/api/send-email')` + `e.preventDefault()` dan sudah ada loading button
- [x] Pastikan `nodemailer` terpasang (`npm install nodemailer` jika perlu)
- [ ] Verifikasi tidak ada error 500 / `Unexpected token <` dengan response JSON valid

- [x] Kumpulkan kode final lengkap dan siap deploy


