# Vercel Serverless: Kirim Email (Gmail SMTP)

Endpoint: `POST /api/send-email`

Form frontend akan mengirim JSON:
- `nama` (string)
- `kontak` (string: nomor WhatsApp atau email)
- `pesan` (string)

Env yang diperlukan (di Vercel Settings > Environment Variables):
- `SMTP_HOST` (mis. `smtp.gmail.com`)
- `SMTP_PORT` (umumnya `587`)
- `SMTP_SECURE` (umumnya `false`)
- `SMTP_USER` (gmail pengirim, mis. `akun@gmail.com`)
- `SMTP_PASS` (Gmail App Password)
- `MAIL_TO` (email tujuan perusahaan)
- `MAIL_FROM` (opsional, default `SMTP_USER`)

## Membuat Gmail App Password
1. Login Gmail.
2. Buka **Google Account**.
3. Masuk **Security**.
4. Pastikan **2-Step Verification** ON.
5. Cari **App passwords**.
6. Pilih aplikasi: **Mail**.
7. Copy password yang dibuat (18-characters), isi ke `SMTP_PASS`.

## Deploy ke Vercel (umum)
1. Push project ke GitHub.
2. Buat Project di Vercel.
3. Build command: untuk project static tanpa framework bisa memakai default.
   - Karena endpoint serverless berada di folder `api/`, pastikan Vercel mengaktifkan Node runtime untuk API.
4. Tambahkan Environment Variables di Vercel:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`, `MAIL_FROM`.
5. Deploy.

Catatan: Jangan commit `.env` berisi password.

