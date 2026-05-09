# Lele Sehat Prima - Kirim Email Tanpa Buka Gmail

Implementasi tombol **Kirim Pesan** yang mengirim email langsung ke email perusahaan **tanpa** membuka Gmail/email client.

## Arsitektur
- Frontend (website) mengirim data form ke: `POST /api/send-email`
- Backend Node.js mengirim email via **SMTP Gmail** menggunakan `nodemailer`.

> Catatan: untuk Gmail biasa, gunakan **App Password** (wajib) bukan password utama.

## Setup
1) Pastikan Node.js sudah terinstal.
2) Masuk folder server:
   - `c:/Users/Antasena/OneDrive/Dokumen/amal/server`
3) Buat file `.env` dari `.env.example`:
   - `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`, dan opsional `MAIL_FROM`

Contoh (isi sesuai akun Anda):
- `SMTP_USER=akun@gmail.com`
- `SMTP_PASS=xxxx-xxxx-xxxx-xxxx` (App Password)
- `MAIL_TO=senasaka141210@gmail.com`

4) Install dependency:
   ```bash
   npm install
   ```

## Jalankan
```bash
npm start
```
Server akan berjalan di `http://localhost:3000` (atau port dari `.env`).

## Frontend
Pastikan website mengarah ke endpoint ini:
- `POST http://localhost:3000/api/send-email` saat di browser lokal
- Jika dihosting, ubah base URL sesuai domain server Anda.

## Troubleshooting
- Jika SMTP auth gagal: pastikan pakai **App Password**.
- Pastikan jaringan mengizinkan koneksi ke `smtp.gmail.com:587`.
- Jika tombol tidak merespons: pastikan CORS dan endpoint aktif.

