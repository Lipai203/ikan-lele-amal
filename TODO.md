# TODO - Perbaikan Form Kontak (Vercel Compatible)

- [ ] Konfirmasi & cari semua endpoint `localhost/127.0.0.1/:3000` di frontend (kontak.html, app.js, dan JS frontend lain).
- [ ] Ubah kontrak API agar konsisten dengan requirement: gunakan field `success` bukan `ok`.
  - [ ] Update `api/send-email.js` sukses: `{ success: true }`
  - [ ] Update `api/send-email.js` gagal: `{ success: false, error: ... }`
- [ ] Update frontend logic di `app.js`:
  - [ ] Pastikan endpoint sudah relatif `/api/send-email`.
  - [ ] Gunakan async/await + try/catch (tetap).
  - [ ] Validasi sukses hanya jika `result.success === true`.
  - [ ] Tambahkan `console.error` untuk debugging.
  - [ ] Pastikan gagal ditampilkan jika `resp.ok` false atau API error.
- [ ] Jalankan testing lokal (Node/Serverless) bila tersedia.
- [ ] Verifikasi deploy Vercel: form kontak berhasil terkirim di production.

