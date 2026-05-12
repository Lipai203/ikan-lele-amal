# Deploy Ulang Email Form (Vercel + Nodemailer)

## Ringkasan Perubahan Backend
- Endpoint form sekarang benar-benar menuju **Vercel serverless**: `POST /api/send-email`.
- `api/send-email.js` dibuat **valid untuk Vercel Node runtime** dan **hanya** menggunakan Gmail SMTP via Nodemailer.
- Validasi diperketat sesuai requirement:
  - `nama` wajib
  - `kontak` wajib dan harus email valid
  - `pesan` wajib
- Anti-spam sederhana (rate limit per IP) + validasi panjang pesan.
- Error handling diperbaiki: frontend hanya menganggap sukses jika backend mengirim `ok: true`.
- Logging ditambahkan:
  - log request masuk
  - log SMTP sukses
  - log error SMTP

## Penyebab email gagal sebelumnya (paling mungkin)
1. **Endpoint / backend tidak benar-benar terdeploy** atau masih memakai pola localhost.
2. **Mismatch environment variables** antara serverless dan kode yang membaca env.
3. Handler serverless bisa “melempar error” tetapi frontend tetap menampilkan status seolah berhasil (karena tidak membaca respons dengan benar).
4. Ada kemungkinan fungsi lama/versi lama endpoint mengirim ke tempat yang tidak aktif.

## Yang diperbaiki (bagian kode)
- `vercel.json`
  - Mengarahkan runtime serverless untuk `api/send-email.js`.
- `api/send-email.js`
  - Menggunakan env var yang diminta:
    - `EMAIL_USER`
    - `EMAIL_PASS`
    - `RECEIVER_EMAIL`
  - Menambahkan validasi + rate limit + try/catch.
  - `from`, `to`, `replyTo` konsisten.

## Set Environment Variables di Vercel
Tambahkan di **Vercel Dashboard → Project → Settings → Environment Variables**:
- `EMAIL_USER` = email Gmail pengirim (akun)
- `EMAIL_PASS` = Gmail App Password
- `RECEIVER_EMAIL` = email tujuan perusahaan
- (opsional) `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (kode default: smtp.gmail.com / 587 / false)

> Catatan: **Jangan gunakan** `.env` yang berisi password di Git.

## Cara Deploy Ulang
1. Push repo ke GitHub.
2. Di Vercel, buat/cek project yang terhubung ke repo tersebut.
3. Pastikan Build Settings sudah benar (untuk static bisa default).
4. Pastikan `vercel.json` sudah ada di root.
5. Deploy.

## Testing Cepat
- Buka `kontak.html` → isi form → kirim.
- Cek:
  - Network tab pada request `POST /api/send-email`
  - Status respons JSON harus `{"ok":true}` jika sukses
- Cek log Vercel Function (Logs) untuk event:
  - `[send-email] request ...`
  - `[send-email] smtp success`
  - `[send-email] error ...`

